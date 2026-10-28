// Proceso ETL (ADR-004): corre por lotes a intervalos. En producción sería una ventana diaria de
// bajo tráfico con datos "T-1"; en la demo el intervalo es corto para ver el efecto.
// No comparte configuración con la API: solo conoce la réplica de lectura y el Data Warehouse.
import { EtlPipeline } from "./EtlPipeline";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

const intervaloMs = Number(process.env.ETL_INTERVALO_MS ?? 60_000);
const etl = new EtlPipeline({
  replicaUrl: requerida("REPLICA_URL"),
  dwUrl: requerida("DW_URL"),
  salAnonimizacion: requerida("ETL_SAL_ANONIMIZACION"),
});

async function corrida(): Promise<void> {
  try {
    const { filas, ms } = await etl.correr();
    console.log(`[etl] corrida completa: ${filas} reservas cargadas en el Data Warehouse (${ms} ms, fuente: réplica)`);
  } catch (err) {
    console.error(`[etl] la corrida falló, se reintenta en el próximo lote: ${(err as Error).message}`);
  }
}

async function iniciar(): Promise<void> {
  // Espera a que el DW esté disponible antes de crear el esquema.
  for (;;) {
    try {
      await etl.prepararDw();
      break;
    } catch {
      console.log("[etl] esperando al Data Warehouse...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  // `--una-vez`: corrida manual (docker compose exec etl node dist/etl/main.js --una-vez)
  if (process.argv.includes("--una-vez")) {
    await corrida();
    process.exit(0);
  }
  console.log(`[etl] listo; corre cada ${intervaloMs / 1000} s`);
  await corrida();
  setInterval(corrida, intervaloMs);
}

iniciar();
