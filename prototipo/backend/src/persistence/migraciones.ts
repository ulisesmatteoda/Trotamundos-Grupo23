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
  {
    version: 2,
    sql: `
      -- Whitelist de remitentes seguros por usuario (QA-03b).
      CREATE TABLE remitente_seguro (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        remitente  text NOT NULL
      );
      CREATE UNIQUE INDEX remitente_seguro_unico ON remitente_seguro (usuario_id, lower(remitente));

      -- Identidad externa de una reserva: (proveedor, código). Permite que un mail y un webhook
      -- de la misma reserva actualicen el mismo registro en lugar de duplicarlo.
      CREATE INDEX reserva_identidad_externa ON reserva (lower(proveedor), lower(codigo_confirmacion));
    `,
  },
  {
    version: 3,
    sql: `
      -- Lugar (y zona horaria) del fin de la reserva cuando difiere del inicio (QA-06d, ADR-008).
      ALTER TABLE reserva ADD COLUMN ubicacion_fin jsonb;
    `,
  },
  {
    version: 4,
    sql: `
      -- Conexión OAuth2 con el proveedor de correo (CON-02). El token se guarda dentro de un
      -- sobre de Envelope Encryption (ADR-005): nunca en texto plano.
      CREATE TABLE conexion_correo (
        usuario_id   uuid PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
        proveedor    text NOT NULL,
        casilla      text NOT NULL,
        token_sobre  jsonb NOT NULL,
        conectado_en timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX conexion_correo_casilla ON conexion_correo (lower(casilla));

      -- Compartición con personas designadas (ADR-010, Iteración 5).
      CREATE TABLE compartido (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        viaje_id   uuid NOT NULL REFERENCES viaje(id) ON DELETE CASCADE,
        dueno_id   uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        enlace_id  text NOT NULL UNIQUE,
        estado     text NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'REVOCADO')),
        creado_en  timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE compartido_designado (
        compartido_id uuid NOT NULL REFERENCES compartido(id) ON DELETE CASCADE,
        email         text NOT NULL,
        PRIMARY KEY (compartido_id, email)
      );

      -- Auditoría de accesos denegados (QA-04a, QA-04b; Iteración 5).
      CREATE TABLE acceso_denegado_log (
        id          bigserial PRIMARY KEY,
        tipo        text NOT NULL,
        usuario_id  uuid,
        recurso     text,
        ip          text,
        detalle     jsonb,
        ocurrido_en timestamptz NOT NULL DEFAULT now()
      );
    `,
  },
  {
    version: 5,
    sql: `
      -- Agencia preferida del usuario para la resolución de problemas (QA-03d).
      ALTER TABLE usuario ADD COLUMN agencia_preferida text NOT NULL DEFAULT 'despegar';

      -- Resultado de la publicación en redes sociales de un compartido (QA-03c).
      ALTER TABLE compartido ADD COLUMN publicacion jsonb;

      -- Casos derivados a la agencia (ADR-009, Iteración 5). El id es también la clave de
      -- idempotencia ante la agencia; el contexto guarda el 100% de los datos enviados (QA-06c).
      CREATE TABLE caso_soporte (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        usuario_id     uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
        reserva_id     uuid REFERENCES reserva(id) ON DELETE SET NULL,
        agencia        text NOT NULL,
        contexto       jsonb NOT NULL,
        estado         text NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'DERIVADO')),
        ticket_agencia text,
        intentos       int NOT NULL DEFAULT 0,
        creado_en      timestamptz NOT NULL DEFAULT now(),
        actualizado_en timestamptz NOT NULL DEFAULT now()
      );
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
