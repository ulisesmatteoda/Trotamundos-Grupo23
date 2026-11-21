// AccionPendiente (ADR-013): una modificación que propuso el asistente y que solo se aplica
// si el dueño la confirma desde la interfaz. El modelo nunca ejecuta escrituras (QA-04e).

export type EstadoAccion = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "EXPIRADA";

export interface ParametrosReprogramacion {
  inicio: string; // ISO-8601 UTC
  fin: string | null;
}

export interface AccionPendiente {
  id: string; // UUID v4: no adivinable
  usuarioId: string;
  tipo: "REPROGRAMAR_RESERVA";
  reservaId: string;
  parametros: ParametrosReprogramacion;
  // actualizadoEn de la reserva al momento de la propuesta: si cambió, la propuesta ya no vale.
  versionReserva: string;
  estado: EstadoAccion;
  expiraEn: Date;
  creadoEn: Date;
}

export type MotivoRechazo = "AJENA" | "NO_PENDIENTE" | "EXPIRADA" | "RESERVA_CAMBIO";

// Reglas de confirmación: pertenencia, vigencia y consistencia con la versión de la reserva.
export function motivoParaNoConfirmar(
  accion: AccionPendiente,
  usuarioId: string,
  versionActual: string,
  ahora = new Date(),
): MotivoRechazo | null {
  if (accion.usuarioId !== usuarioId) return "AJENA";
  if (accion.estado !== "PENDIENTE") return "NO_PENDIENTE";
  if (accion.expiraEn <= ahora) return "EXPIRADA";
  if (accion.versionReserva !== versionActual) return "RESERVA_CAMBIO";
  return null;
}

export const puedeConfirmar = (accion: AccionPendiente, usuarioId: string, versionActual: string, ahora = new Date()) =>
  motivoParaNoConfirmar(accion, usuarioId, versionActual, ahora) === null;
