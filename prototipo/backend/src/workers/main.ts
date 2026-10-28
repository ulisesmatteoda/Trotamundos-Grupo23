// Proceso Worker: Workers asincrónicos en background (Iteración 1, capa 3; ADR-003, ADR-006).
// Se escala horizontalmente con `docker compose up --scale worker=N`.
import os from "os";
import { config } from "../config";
import { iniciarArchivadoJob } from "./ArchivadoJob";
import { ItinerarioEmailConsumer } from "./ItinerarioEmailConsumer";
import { SoporteRetryConsumer } from "./SoporteRetryConsumer";
import { SoporteService } from "../domain/SoporteService";
import { adaptadoresDeSoporte } from "../integration/registroAgencias";

const REINTENTO_MS = 3000;

async function iniciarConsumidores(): Promise<void> {
  try {
    await ItinerarioEmailConsumer.iniciar();
    await SoporteRetryConsumer.iniciar();
    console.log(`[worker ${os.hostname()}] suscripto al Event Bus, esperando eventos`);
  } catch (err) {
    console.error(`[worker] no se pudo conectar al Event Bus, reintento en ${REINTENTO_MS} ms`);
    setTimeout(iniciarConsumidores, REINTENTO_MS);
  }
}

// Raíz de composición del worker: el reintento de soporte necesita las agencias de soporte.
SoporteService.configurarAgencias(adaptadoresDeSoporte());
iniciarConsumidores();
iniciarArchivadoJob(config.archivadoIntervaloMs);
