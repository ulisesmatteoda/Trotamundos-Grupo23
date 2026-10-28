// EmailIngestionListener (Publisher, ADR-003 / Iteración 2): recibe el correo bruto del
// proveedor de correo, publica un NuevoMailReservaEvent y libera el hilo de inmediato.
// No lee ni procesa el contenido: eso lo hace el ItinerarioEmailConsumer en un worker.
import { randomUUID } from "crypto";
import { invalido } from "../../domain/errores";
import { eventBus } from "../../messaging/EventBus";
import { COLA_CORREOS, CorreoEntrante, NuevoMailReservaEvent } from "../../messaging/colas";

const CAMPOS: (keyof CorreoEntrante)[] = ["casilla", "remitente", "asunto", "cuerpo", "recibidoEn"];

function validar(payload: any): CorreoEntrante {
  const faltantes = CAMPOS.filter((c) => typeof payload?.[c] !== "string");
  if (faltantes.length) throw invalido(Object.fromEntries(faltantes.map((c) => [c, "REQUERIDO"])));
  return Object.fromEntries(CAMPOS.map((c) => [c, payload[c]])) as unknown as CorreoEntrante;
}

export const EmailIngestionListener = {
  async recibirEmail(payload: unknown): Promise<string> {
    const evento: NuevoMailReservaEvent = {
      tipo: "NuevoMailReservaEvent",
      correlationId: randomUUID(),
      publicadoEn: new Date().toISOString(),
      correo: validar(payload),
    };
    await this.publicarEventoEnBus(evento);
    console.log(`[listener cid=${evento.correlationId}] correo de ${evento.correo.remitente} publicado en ${COLA_CORREOS}`);
    return evento.correlationId;
  },

  publicarEventoEnBus(evento: NuevoMailReservaEvent): Promise<void> {
    return eventBus.publicar(COLA_CORREOS, evento);
  },
};
