// ItinerarioEmailConsumer (Subscriber, ADR-003 / Iteración 2): consume los NuevoMailReservaEvent
// del Event Bus, extrae los datos del viaje y delega en ViajeService. Corre en el proceso Worker.
import os from "os";
import { ViajeService } from "../domain/ViajeService";
import { extraerDatosViaje } from "../integration/email/ParserCorreoReserva";
import { eventBus } from "../messaging/EventBus";
import { COLA_CORREOS, NuevoMailReservaEvent } from "../messaging/colas";

function esEvento(e: any): e is NuevoMailReservaEvent {
  return e?.tipo === "NuevoMailReservaEvent" && typeof e.correlationId === "string" && typeof e.correo?.cuerpo === "string";
}

export const ItinerarioEmailConsumer = {
  async consumirEvento(mensaje: unknown): Promise<void> {
    if (!esEvento(mensaje)) throw new Error("Mensaje que no cumple el contrato NuevoMailReservaEvent");
    const { correlationId, correo, publicadoEn } = mensaje;
    const inicio = Date.now();

    const r = await ViajeService.procesarReservaMail(correo.casilla, correo.remitente, () => extraerDatosViaje(correo));

    const demoraMs = Date.now() - new Date(publicadoEn).getTime();
    console.log(
      `[worker ${os.hostname()} cid=${correlationId}] ${correo.remitente} → ${r.resultado}` +
        `${r.reservaId ? ` reserva=${r.reservaId}` : ""} (${Date.now() - inicio} ms, ${demoraMs} ms desde la publicación)`,
    );
  },

  iniciar(): Promise<void> {
    return eventBus.suscribir(COLA_CORREOS, (m) => this.consumirEvento(m));
  },
};
