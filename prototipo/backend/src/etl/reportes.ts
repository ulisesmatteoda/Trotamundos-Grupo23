// Motor de Reportes / BI (UC-03, Iteración 3): consultas analíticas que el equipo de datos
// ejecuta exclusivamente sobre el Data Warehouse, sin tocar la base operacional (CRN-03).
// Uso: docker compose exec etl node dist/etl/reportes.js
import { Pool } from "pg";

const dw = new Pool({ connectionString: process.env.DW_URL, application_name: "reportes-bi" });

const REPORTES: { titulo: string; sql: string }[] = [
  {
    titulo: "Destinos más elegidos (viajeros distintos y reservas)",
    sql: `SELECT d.nombre AS destino, count(DISTINCT h.viajero_hash) AS viajeros, count(*) AS reservas
          FROM hecho_reserva h JOIN dim_destino d USING (destino_id)
          GROUP BY d.nombre ORDER BY viajeros DESC, reservas DESC LIMIT 8`,
  },
  {
    titulo: "Tasa de cancelación por tipo de reserva",
    sql: `SELECT tipo, count(*) AS reservas, sum(cancelada::int) AS canceladas,
                 round(100.0 * avg(cancelada::int), 1) || ' %' AS tasa
          FROM hecho_reserva GROUP BY tipo ORDER BY avg(cancelada::int) DESC`,
  },
  {
    titulo: "Cómo llegan las reservas (origen)",
    sql: `SELECT origen, count(*) AS reservas, round(100.0 * count(*) / sum(count(*)) OVER (), 1) || ' %' AS participacion
          FROM hecho_reserva GROUP BY origen ORDER BY reservas DESC`,
  },
  {
    titulo: "Tendencia: reservas por trimestre de viaje",
    sql: `SELECT f.anio, f.trimestre, count(*) AS reservas, sum(h.cancelada::int) AS canceladas
          FROM hecho_reserva h JOIN dim_fecha f USING (fecha_id)
          GROUP BY f.anio, f.trimestre ORDER BY f.anio, f.trimestre`,
  },
  {
    titulo: "Última corrida del ETL",
    sql: `SELECT id, fin AS terminada, filas, fuente, fuente_replica FROM etl_corrida ORDER BY id DESC LIMIT 1`,
  },
];

async function main(): Promise<void> {
  for (const r of REPORTES) {
    const { rows } = await dw.query(r.sql);
    console.log(`\n== ${r.titulo}`);
    console.table(rows);
  }
  await dw.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
