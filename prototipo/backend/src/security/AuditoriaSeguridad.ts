// Registro y alerta de intentos de acceso no autorizados (QA-04a, QA-04b, QA-04e).
// Cada evento se guarda en acceso_denegado_log (Iteración 5) y se emite de inmediato como
// alerta estructurada en el log, que es lo que consumiría el equipo de seguridad (SIEM).
import { db } from "../persistence/db";

export type TipoEvento =
  | "LOGIN_FALLIDO"
  | "TOKEN_INVALIDO"
  | "WEBHOOK_NO_AUTORIZADO"
  | "ACCESO_COMPARTIDO_DENEGADO"
  | "CORREO_DE_CASILLA_NO_CONECTADA"
  // Asistente virtual (QA-04e): una herramienta pidió un recurso de otro usuario, o se intentó
  // confirmar una acción ajena, vencida o sobre una reserva que cambió.
  | "ASISTENTE_RECURSO_AJENO"
  | "ASISTENTE_ACCION_DENEGADA";

interface Evento {
  usuarioId?: string;
  recurso?: string;
  ip?: string;
  detalle?: Record<string, unknown>;
}

export const AuditoriaSeguridad = {
  async registrar(tipo: TipoEvento, evento: Evento): Promise<void> {
    console.warn(`[ALERTA-SEGURIDAD] ${JSON.stringify({ tipo, ...evento, ocurridoEn: new Date().toISOString() })}`);
    try {
      await db.query(
        "INSERT INTO acceso_denegado_log (tipo, usuario_id, recurso, ip, detalle) VALUES ($1, $2, $3, $4, $5)",
        [tipo, evento.usuarioId ?? null, evento.recurso ?? null, evento.ip ?? null, evento.detalle ?? null],
      );
    } catch (err) {
      // Que falle la auditoría no debe abrir el acceso: la denegación ya ocurrió.
      console.error("[seguridad] no se pudo persistir el evento", err);
    }
  },
};
