import { db } from "./db";

export interface UsuarioConCredenciales {
  id: string;
  email: string;
  nombre: string;
  localePreferido: string;
  passwordHash: string;
}

export const UsuarioRepository = {
  async porEmail(email: string): Promise<UsuarioConCredenciales | null> {
    const { rows } = await db.query("SELECT * FROM usuario WHERE lower(email) = lower($1)", [email]);
    const f = rows[0];
    if (!f) return null;
    return {
      id: f.id,
      email: f.email,
      nombre: f.nombre,
      localePreferido: f.locale_preferido,
      passwordHash: f.password_hash,
    };
  },

  async porId(id: string): Promise<{ id: string; nombre: string; email: string; agenciaPreferida: string } | null> {
    const { rows } = await db.query(
      "SELECT id, nombre, email, agencia_preferida AS \"agenciaPreferida\" FROM usuario WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  },

  async crear(email: string, nombre: string, passwordHash: string, locale: string): Promise<string> {
    const { rows } = await db.query(
      "INSERT INTO usuario (email, nombre, password_hash, locale_preferido) VALUES ($1, $2, $3, $4) RETURNING id",
      [email, nombre, passwordHash, locale],
    );
    return rows[0].id;
  },

  async hayUsuarios(): Promise<boolean> {
    const { rows } = await db.query("SELECT EXISTS (SELECT 1 FROM usuario) AS hay");
    return rows[0].hay;
  },
};
