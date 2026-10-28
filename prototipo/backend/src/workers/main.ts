// Proceso Worker: Workers asincrónicos en background (Iteración 1, capa 3; ADR-003, ADR-006).
// Se escala horizontalmente con `docker compose up --scale worker=N`.
// Los consumidores (ItinerarioEmailConsumer, SoporteRetryConsumer) se registran a partir de la Fase 2.
import os from "os";
import { eventBus } from "../messaging/EventBus";

const REINTENTO_MS = 3000;

async function iniciar(): Promise<void> {
  try {
    await eventBus.conectar();
    console.log(`[worker ${os.hostname()}] conectado al Event Bus, esperando eventos`);
  } catch (err) {
    console.error(`[worker] no se pudo conectar al Event Bus, reintento en ${REINTENTO_MS} ms`);
    setTimeout(iniciar, REINTENTO_MS);
  }
}

iniciar();
