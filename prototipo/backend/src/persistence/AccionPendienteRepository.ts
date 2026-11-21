// Acciones propuestas por el asistente (ADR-013).
import { db } from "./db";
import { AccionPendiente, EstadoAccion } from "../domain/asistente/AccionPendiente";

const aAccion = (f: any): AccionPendiente => ({
  id: f.id,
  usuarioId: f.usuario_id,
  tipo: f.tipo,
  reservaId: f.reserva_id,
  parametros: f.parametros,
  versionReserva: f.version_reserva,
  estado: f.estado,
  expiraEn: f.expira_en,
  creadoEn: f.creado_en,
});

export const AccionPendienteRepository = {
  async crear(a: Omit<AccionPendiente, "estado" | "creadoEn">): Promise<AccionPendiente> {
    const { rows } = await db.query(
      `INSERT INTO accion_pendiente (id, usuario_id, tipo, reserva_id, parametros, version_reserva, expira_en)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [a.id, a.usuarioId, a.tipo, a.reservaId, a.parametros, a.versionReserva, a.expiraEn],
    );
    return aAccion(rows[0]);
  },

  async obtener(id: string): Promise<AccionPendiente | null> {
    const { rows } = await db.query("SELECT * FROM accion_pendiente WHERE id = $1", [id]);
    return rows[0] ? aAccion(rows[0]) : null;
  },

  async deUsuario(usuarioId: string, ids: string[]): Promise<AccionPendiente[]> {
    if (ids.length === 0) return [];
    const { rows } = await db.query("SELECT * FROM accion_pendiente WHERE usuario_id = $1 AND id = ANY($2)", [usuarioId, ids]);
    return rows.map(aAccion);
  },

  // Transición atómica desde PENDIENTE: si dos confirmaciones llegan juntas, solo una la toma.
  async resolver(id: string, estado: Exclude<EstadoAccion, "PENDIENTE">): Promise<boolean> {
    const { rowCount } = await db.query(
      "UPDATE accion_pendiente SET estado = $2, resuelta_en = now() WHERE id = $1 AND estado = 'PENDIENTE'",
      [id, estado],
    );
    return rowCount === 1;
  },

  // Si aplicar el cambio falló después de tomar la acción, vuelve a quedar pendiente.
  async reabrir(id: string): Promise<void> {
    await db.query("UPDATE accion_pendiente SET estado = 'PENDIENTE', resuelta_en = NULL WHERE id = $1", [id]);
  },
};
