import { db } from "./db";
import { ContextoCasoDTO } from "../integration/soporte/IAgenciaSoporteAdapter";

export interface CasoSoporte {
  id: string;
  usuarioId: string;
  reservaId: string | null;
  agencia: string;
  contexto: ContextoCasoDTO;
  estado: "PENDIENTE" | "DERIVADO";
  ticketAgencia: string | null;
  intentos: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

const aCaso = (f: any): CasoSoporte => ({
  id: f.id,
  usuarioId: f.usuario_id,
  reservaId: f.reserva_id,
  agencia: f.agencia,
  contexto: f.contexto,
  estado: f.estado,
  ticketAgencia: f.ticket_agencia,
  intentos: f.intentos,
  creadoEn: f.creado_en,
  actualizadoEn: f.actualizado_en,
});

export const CasoSoporteRepository = {
  async crear(id: string, usuarioId: string, reservaId: string, agencia: string, contexto: ContextoCasoDTO): Promise<CasoSoporte> {
    const { rows } = await db.query(
      "INSERT INTO caso_soporte (id, usuario_id, reserva_id, agencia, contexto) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, usuarioId, reservaId, agencia, contexto],
    );
    return aCaso(rows[0]);
  },

  async obtener(id: string): Promise<CasoSoporte | null> {
    const { rows } = await db.query("SELECT * FROM caso_soporte WHERE id = $1", [id]);
    return rows[0] ? aCaso(rows[0]) : null;
  },

  async registrarIntento(id: string): Promise<void> {
    await db.query("UPDATE caso_soporte SET intentos = intentos + 1, actualizado_en = now() WHERE id = $1", [id]);
  },

  async marcarDerivado(id: string, ticket: string): Promise<CasoSoporte> {
    const { rows } = await db.query(
      "UPDATE caso_soporte SET estado = 'DERIVADO', ticket_agencia = $2, actualizado_en = now() WHERE id = $1 RETURNING *",
      [id, ticket],
    );
    return aCaso(rows[0]);
  },
};
