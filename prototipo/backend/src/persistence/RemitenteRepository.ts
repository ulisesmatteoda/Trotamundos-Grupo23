import { db } from "./db";

export interface RemitenteSeguro {
  id: string;
  remitente: string;
}

export const RemitenteRepository = {
  async listar(usuarioId: string): Promise<RemitenteSeguro[]> {
    const { rows } = await db.query(
      "SELECT id, remitente FROM remitente_seguro WHERE usuario_id = $1 ORDER BY remitente",
      [usuarioId],
    );
    return rows;
  },

  // Devuelve null si el remitente ya estaba en la lista.
  async agregar(usuarioId: string, remitente: string): Promise<RemitenteSeguro | null> {
    const { rows } = await db.query(
      `INSERT INTO remitente_seguro (usuario_id, remitente) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING id, remitente`,
      [usuarioId, remitente],
    );
    return rows[0] ?? null;
  },

  async eliminar(usuarioId: string, id: string): Promise<boolean> {
    const { rowCount } = await db.query("DELETE FROM remitente_seguro WHERE id = $1 AND usuario_id = $2", [id, usuarioId]);
    return rowCount === 1;
  },
};
