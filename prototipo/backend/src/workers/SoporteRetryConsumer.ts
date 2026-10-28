// SoporteRetryConsumer (Subscriber, ADR-009 / Iteración 5): reintenta en segundo plano la
// derivación de los casos que la agencia no aceptó a tiempo. Corre en el Worker Auto-Scaling Group.
import os from "os";
import { SoporteService } from "../domain/SoporteService";
import { eventBus } from "../messaging/EventBus";
import { CasoSoportePendienteEvent, COLA_SOPORTE } from "../messaging/colas";

function esEvento(e: any): e is CasoSoportePendienteEvent {
  return e?.tipo === "CasoSoportePendienteEvent" && typeof e.casoId === "string" && Number.isInteger(e.intento);
}

export const SoporteRetryConsumer = {
  async consumirEvento(mensaje: unknown): Promise<void> {
    if (!esEvento(mensaje)) throw new Error("Mensaje que no cumple el contrato CasoSoportePendienteEvent");
    const resultado = await SoporteService.reintentarDerivacion(mensaje.casoId, mensaje.intento);
    console.log(`[worker ${os.hostname()} cid=${mensaje.correlationId}] caso ${mensaje.casoId} intento ${mensaje.intento} → ${resultado}`);
    // Agotados los intentos, el mensaje va a la DLQ para intervención manual.
    if (resultado === "AGOTADO") throw new Error(`Caso ${mensaje.casoId}: reintentos agotados`);
  },

  iniciar(): Promise<void> {
    return eventBus.suscribir(COLA_SOPORTE, (m) => this.consumirEvento(m));
  },
};
