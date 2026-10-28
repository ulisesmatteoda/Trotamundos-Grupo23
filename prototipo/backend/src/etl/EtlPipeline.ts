// ETL Pipeline Worker (ADR-004, Iteración 3): proceso batch que extrae de la PostgreSQL Read
// Replica, transforma al modelo dimensional y carga el Data Warehouse. Nunca lee del primario:
// si la conexión de extracción no es una réplica (pg_is_in_recovery = false), se niega a correr.
import { createHash } from "crypto";
import { Pool, PoolClient } from "pg";
import { ESQUEMA_DW } from "./esquemaDw";

export interface ConfigEtl {
  replicaUrl: string;
  dwUrl: string;
  salAnonimizacion: string;
}

interface FilaOrigen {
  reserva_id: string;
  usuario_id: string;
  destino: string | null;
  tipo: string;
  origen: string;
  estado: string;
  inicio: Date;
  fin: Date | null;
  precio: { valor: number; moneda: string } | null;
}

// --- Transformación -----------------------------------------------------------
const fechaId = (d: Date) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();

// "Madrid, España" y "madrid,  españa" son el mismo destino.
const normalizarDestino = (d: string | null) => (d?.trim().replace(/\s+/g, " ") || "Sin destino");

function transformar(f: FilaOrigen, sal: string) {
  return {
    reservaId: f.reserva_id,
    fecha: f.inicio,
    destino: normalizarDestino(f.destino),
    tipo: f.tipo,
    origen: f.origen,
    estado: f.estado,
    cancelada: f.estado === "CANCELADA",
    duracionHoras: f.fin ? Math.round(((f.fin.getTime() - f.inicio.getTime()) / 3_600_000) * 100) / 100 : null,
    monto: f.precio?.valor ?? null,
    moneda: f.precio?.moneda ?? null,
    // Seudonimización: el equipo de datos puede contar viajeros distintos sin saber quiénes son.
    viajeroHash: createHash("sha256").update(sal + f.usuario_id).digest("hex").slice(0, 16),
  };
}

// --- Carga ---------------------------------------------------------------------
async function cargar(dw: PoolClient, hechos: ReturnType<typeof transformar>[]): Promise<void> {
  await dw.query("TRUNCATE hecho_reserva");
  for (const h of hechos) {
    const d = h.fecha;
    await dw.query(
      `INSERT INTO dim_fecha (fecha_id, fecha, anio, mes, trimestre, dia_semana)
       VALUES ($1, $2::date, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [fechaId(d), d.toISOString().slice(0, 10), d.getUTCFullYear(), d.getUTCMonth() + 1, Math.floor(d.getUTCMonth() / 3) + 1, ((d.getUTCDay() + 6) % 7) + 1],
    );
    await dw.query("INSERT INTO dim_tipo_reserva (tipo) VALUES ($1) ON CONFLICT DO NOTHING", [h.tipo]);
    await dw.query("INSERT INTO dim_origen (origen) VALUES ($1) ON CONFLICT DO NOTHING", [h.origen]);
    const { rows } = await dw.query(
      `INSERT INTO dim_destino (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING destino_id`,
      [h.destino],
    );
    await dw.query(
      `INSERT INTO hecho_reserva (reserva_id, fecha_id, destino_id, tipo, origen, estado, cancelada, duracion_horas, monto, moneda, viajero_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [h.reservaId, fechaId(d), rows[0].destino_id, h.tipo, h.origen, h.estado, h.cancelada, h.duracionHoras, h.monto, h.moneda, h.viajeroHash],
    );
  }
}

export class EtlPipeline {
  private readonly replica: Pool;
  private readonly dw: Pool;

  constructor(private readonly config: ConfigEtl) {
    this.replica = new Pool({ connectionString: config.replicaUrl, application_name: "etl-pipeline", max: 2 });
    this.dw = new Pool({ connectionString: config.dwUrl, application_name: "etl-pipeline", max: 2 });
  }

  async prepararDw(): Promise<void> {
    await this.dw.query(ESQUEMA_DW);
  }

  async correr(): Promise<{ filas: number; ms: number }> {
    const inicio = new Date();

    // ADR-004: la extracción va exclusivamente contra la réplica de lectura.
    const { rows: fuente } = await this.replica.query(
      "SELECT pg_is_in_recovery() AS es_replica, coalesce(host(inet_server_addr()), 'local') AS servidor",
    );
    if (!fuente[0].es_replica) {
      throw new Error("La conexión de extracción apunta al primario: el ETL solo puede leer de la réplica (ADR-004)");
    }

    // Extracción (Extract): lectura consistente de la réplica.
    const { rows } = await this.replica.query<FilaOrigen>(`
      SELECT r.id AS reserva_id, v.usuario_id, v.destino, r.tipo, r.origen, r.estado, r.inicio, r.fin, r.precio
      FROM reserva r JOIN viaje v ON v.id = r.viaje_id`);

    // Transformación (Transform) y carga (Load) en una sola transacción: los reportes nunca
    // ven un DW a medio cargar.
    const hechos = rows.map((f) => transformar(f, this.config.salAnonimizacion));
    const cliente = await this.dw.connect();
    try {
      await cliente.query("BEGIN");
      await cargar(cliente, hechos);
      await cliente.query(
        "INSERT INTO etl_corrida (inicio, fin, filas, fuente, fuente_replica) VALUES ($1, now(), $2, $3, true)",
        [inicio, hechos.length, fuente[0].servidor],
      );
      await cliente.query("COMMIT");
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }
    return { filas: hechos.length, ms: Date.now() - inicio.getTime() };
  }
}
