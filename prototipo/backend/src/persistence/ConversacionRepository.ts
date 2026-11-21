// Conversaciones del asistente (ADR-012). El texto de cada mensaje se guarda cifrado con
// envelope encryption (QA-04d): en la base solo queda el sobre.
import { db } from "./db";
import { cifrar, descifrar, Sobre } from "../security/CifradoEnvoltorio";

export interface Conversacion {
  id: string;
  usuarioId: string;
  idioma: string;
  reservaFoco: string | null;
}

export interface MensajeGuardado {
  id: string;
  rol: "usuario" | "asistente";
  texto: string | null;
  codigo: string | null;
  accionId: string | null;
  casoId: string | null;
  creadoEn: Date;
}

export interface NuevoMensaje {
  rol: "usuario" | "asistente";
  texto?: string | null;
  codigo?: string | null;
  accionId?: string | null;
  casoId?: string | null;
}

const aConversacion = (f: any): Conversacion => ({
  id: f.id,
  usuarioId: f.usuario_id,
  idioma: f.idioma,
  reservaFoco: f.reserva_foco,
});

const aMensaje = (f: any): MensajeGuardado => ({
  id: f.id,
  rol: f.rol,
  texto: f.contenido ? descifrar(f.contenido as Sobre) : null,
  codigo: f.codigo,
  accionId: f.accion_id,
  casoId: f.caso_id,
  creadoEn: f.creado_en,
});

export const ConversacionRepository = {
  async obtenerOCrear(usuarioId: string, idioma: string): Promise<Conversacion> {
    const { rows } = await db.query(
      `INSERT INTO conversacion (usuario_id, idioma) VALUES ($1, $2)
       ON CONFLICT (usuario_id) DO UPDATE SET idioma = EXCLUDED.idioma, actualizado_en = now()
       RETURNING *`,
      [usuarioId, idioma],
    );
    return aConversacion(rows[0]);
  },

  async deUsuario(usuarioId: string): Promise<Conversacion | null> {
    const { rows } = await db.query("SELECT * FROM conversacion WHERE usuario_id = $1", [usuarioId]);
    return rows[0] ? aConversacion(rows[0]) : null;
  },

  async fijarReservaFoco(conversacionId: string, reservaId: string): Promise<void> {
    await db.query("UPDATE conversacion SET reserva_foco = $2 WHERE id = $1", [conversacionId, reservaId]);
  },

  async agregarMensaje(conversacionId: string, m: NuevoMensaje): Promise<MensajeGuardado> {
    const { rows } = await db.query(
      `INSERT INTO mensaje (conversacion_id, rol, contenido, codigo, accion_id, caso_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [conversacionId, m.rol, m.texto ? cifrar(m.texto) : null, m.codigo ?? null, m.accionId ?? null, m.casoId ?? null],
    );
    return aMensaje(rows[0]);
  },

  // Últimos mensajes en orden cronológico.
  async ultimosMensajes(conversacionId: string, cantidad: number): Promise<MensajeGuardado[]> {
    const { rows } = await db.query(
      "SELECT * FROM (SELECT * FROM mensaje WHERE conversacion_id = $1 ORDER BY creado_en DESC LIMIT $2) m ORDER BY creado_en",
      [conversacionId, cantidad],
    );
    return rows.map(aMensaje);
  },

  // Dueño de un viaje o una reserva, sin filtrar por usuario. Solo sirve para distinguir
  // "no existe" de "es de otra persona" al auditar (QA-04e); nunca devuelve datos.
  async duenoDe(tipo: "viaje" | "reserva", id: string): Promise<string | null> {
    const sql =
      tipo === "viaje"
        ? "SELECT usuario_id FROM viaje WHERE id = $1"
        : "SELECT v.usuario_id FROM reserva r JOIN viaje v ON v.id = r.viaje_id WHERE r.id = $1";
    const { rows } = await db.query(sql, [id]);
    return rows[0]?.usuario_id ?? null;
  },

  // Retención acotada (ADR-012). Lo corre el worker.
  async purgarAnterioresA(dias: number): Promise<number> {
    const { rowCount } = await db.query("DELETE FROM mensaje WHERE creado_en < now() - make_interval(days => $1)", [dias]);
    await db.query(
      "DELETE FROM accion_pendiente WHERE estado <> 'PENDIENTE' AND creado_en < now() - make_interval(days => $1)",
      [dias],
    );
    return rowCount ?? 0;
  },
};
