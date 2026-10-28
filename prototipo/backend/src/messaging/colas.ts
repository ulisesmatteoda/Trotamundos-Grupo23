// Colas del Event Bus. Cada una tiene su contrato de evento en specs/events/.
export const COLA_CORREOS = "correos.reservas"; // NuevoMailReservaEvent (ADR-003)
export const COLA_SOPORTE = "soporte.casos-pendientes"; // CasoSoportePendienteEvent (ADR-009)

export interface CorreoEntrante {
  casilla: string;
  remitente: string;
  asunto: string;
  cuerpo: string;
  recibidoEn: string;
}

export interface NuevoMailReservaEvent {
  tipo: "NuevoMailReservaEvent";
  correlationId: string;
  publicadoEn: string;
  correo: CorreoEntrante;
}

export interface CasoSoportePendienteEvent {
  tipo: "CasoSoportePendienteEvent";
  correlationId: string;
  publicadoEn: string;
  casoId: string;
  intento: number;
}
