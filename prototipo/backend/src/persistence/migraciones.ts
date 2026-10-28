// Esquema de PostgreSQL OLTP. Las migraciones se aplican al iniciar la API, bajo un
// advisory lock para que varias réplicas puedan arrancar a la vez sin pisarse.
import { db } from "./db";

const MIGRACIONES: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE usuario (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email            text NOT NULL UNIQUE,
        nombre           text NOT NULL,
        password_hash    text NOT NULL,
        locale_preferido text NOT NULL DEFAULT 'es-AR'
      );

      CREATE TABLE viaje (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        nombre     text NOT NULL,
        destino    text,
        estado     text NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'ARCHIVADO')),
        creado_en  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX viaje_usuario_estado ON viaje (usuario_id, estado);

      -- tipo es texto libre (no enum) para sumar medios de transporte sin migrar (QA-05a).
      CREATE TABLE reserva (
        id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        viaje_id            uuid NOT NULL REFERENCES viaje(id) ON DELETE CASCADE,
        tipo                text NOT NULL,
        titulo              text NOT NULL,
        proveedor           text,
        codigo_confirmacion text,
        inicio              timestamptz NOT NULL,
        fin                 timestamptz,
        ubicacion           jsonb,
        precio              jsonb,
        origen              text NOT NULL DEFAULT 'MANUAL' CHECK (origen IN ('MANUAL', 'EMAIL', 'AGENCIA')),
        estado              text NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA', 'MODIFICADA', 'CANCELADA')),
        actualizado_en      timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX reserva_viaje ON reserva (viaje_id);
    `,
  },
];

const LOCK_MIGRACIONES = 724_001;

export async function migrar(): Promise<void> {
  const cliente = await db.connect();
  try {
    await cliente.query("SELECT pg_advisory_lock($1)", [LOCK_MIGRACIONES]);
    await cliente.query(
      "CREATE TABLE IF NOT EXISTS schema_version (version int PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())",
    );
    const { rows } = await cliente.query("SELECT coalesce(max(version), 0) AS actual FROM schema_version");
    const actual: number = rows[0].actual;

    for (const m of MIGRACIONES.filter((m) => m.version > actual)) {
      await cliente.query("BEGIN");
      await cliente.query(m.sql);
      await cliente.query("INSERT INTO schema_version (version) VALUES ($1)", [m.version]);
      await cliente.query("COMMIT");
      console.log(`[db] migración ${m.version} aplicada`);
    }
  } catch (err) {
    await cliente.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    await cliente.query("SELECT pg_advisory_unlock($1)", [LOCK_MIGRACIONES]).catch(() => undefined);
    cliente.release();
  }
}
