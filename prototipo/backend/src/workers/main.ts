// Proceso Worker: Workers asincrónicos en background (Iteración 1, capa 3; ADR-003, ADR-006).
// Se escala horizontalmente con `docker compose up --scale worker=N`.
import os from "os";
import { config } from "../config";
import { iniciarArchivadoJob } from "./ArchivadoJob";
import { ItinerarioEmailConsumer } from "./ItinerarioEmailConsumer";

const REINTENTO_MS = 3000;

async function iniciarConsumidores(): Promise<void> {
  try {
    await ItinerarioEmailConsumer.iniciar();
    console.log(`[worker ${os.hostname()}] suscripto al Event Bus, esperando eventos`);
  } catch (err) {
    console.error(`[worker] no se pudo conectar al Event Bus, reintento en ${REINTENTO_MS} ms`);
    setTimeout(iniciarConsumidores, REINTENTO_MS);
  }
}

iniciarConsumidores();
iniciarArchivadoJob(config.archivadoIntervaloMs);
