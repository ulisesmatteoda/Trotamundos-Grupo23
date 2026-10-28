import { db } from "./db";
import { Sobre } from "../security/CifradoEnvoltorio";

export interface ConexionCorreo {
  usuarioId: string;
  proveedor: string;
  casilla: string;
  tokenSobre: Sobre;
  conectadoEn: Date;
}

const aConexion = (f: any): ConexionCorreo => ({
  usuarioId: f.usuario_id,
  proveedor: f.proveedor,
  casilla: f.casilla,
  tokenSobre: f.token_sobre,
  conectadoEn: f.conectado_en,
});

export const ConexionCorreoRepository = {
  async deUsuario(usuarioId: string): Promise<ConexionCorreo | null> {
    const { rows } = await db.query("SELECT * FROM conexion_correo WHERE usuario_id = $1", [usuarioId]);
    return rows[0] ? aConexion(rows[0]) : null;
  },

  async deCasilla(casilla: string): Promise<ConexionCorreo | null> {
    const { rows } = await db.query("SELECT * FROM conexion_correo WHERE lower(casilla) = lower($1)", [casilla]);
    return rows[0] ? aConexion(rows[0]) : null;
  },

  async guardar(usuarioId: string, proveedor: string, casilla: string, tokenSobre: Sobre): Promise<ConexionCorreo> {
    const { rows } = await db.query(
      `INSERT INTO conexion_correo (usuario_id, proveedor, casilla, token_sobre) VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id) DO UPDATE SET proveedor = $2, casilla = $3, token_sobre = $4, conectado_en = now()
       RETURNING *`,
      [usuarioId, proveedor, casilla, tokenSobre],
    );
    return aConexion(rows[0]);
  },

  async eliminar(usuarioId: string): Promise<void> {
    await db.query("DELETE FROM conexion_correo WHERE usuario_id = $1", [usuarioId]);
  },
};
