import { db } from "./db";

export interface Compartido {
  id: string;
  viajeId: string;
  duenoId: string;
  enlaceId: string;
  estado: "ACTIVO" | "REVOCADO";
  designados: string[];
  publicacion: Publicacion | null;
}

export interface Publicacion {
  redSocial: string;
  estado: "PUBLICADA" | "FALLIDA";
  idExterno?: string | null;
  url?: string | null;
  error?: string | null;
}

async function conDesignados(filas: any[]): Promise<Compartido[]> {
  if (filas.length === 0) return [];
  const { rows } = await db.query(
    "SELECT compartido_id, email FROM compartido_designado WHERE compartido_id = ANY($1) ORDER BY email",
    [filas.map((f) => f.id)],
  );
  return filas.map((f) => ({
    id: f.id,
    viajeId: f.viaje_id,
    duenoId: f.dueno_id,
    enlaceId: f.enlace_id,
    estado: f.estado,
    designados: rows.filter((d) => d.compartido_id === f.id).map((d) => d.email),
    publicacion: f.publicacion ?? null,
  }));
}

export const CompartidoRepository = {
  async crear(viajeId: string, duenoId: string, enlaceId: string, designados: string[]): Promise<Compartido> {
    const cliente = await db.connect();
    try {
      await cliente.query("BEGIN");
      const { rows } = await cliente.query(
        "INSERT INTO compartido (viaje_id, dueno_id, enlace_id) VALUES ($1, $2, $3) RETURNING *",
        [viajeId, duenoId, enlaceId],
      );
      for (const email of designados) {
        await cliente.query("INSERT INTO compartido_designado (compartido_id, email) VALUES ($1, $2)", [rows[0].id, email]);
      }
      await cliente.query("COMMIT");
      return { id: rows[0].id, viajeId, duenoId, enlaceId, estado: "ACTIVO", designados, publicacion: null };
    } catch (err) {
      await cliente.query("ROLLBACK");
      throw err;
    } finally {
      cliente.release();
    }
  },

  async porEnlace(enlaceId: string): Promise<Compartido | null> {
    const { rows } = await db.query("SELECT * FROM compartido WHERE enlace_id = $1", [enlaceId]);
    return (await conDesignados(rows))[0] ?? null;
  },

  async activosDeViaje(viajeId: string): Promise<Compartido[]> {
    const { rows } = await db.query(
      "SELECT * FROM compartido WHERE viaje_id = $1 AND estado = 'ACTIVO' ORDER BY creado_en DESC",
      [viajeId],
    );
    return conDesignados(rows);
  },

  async guardarPublicacion(id: string, publicacion: Publicacion): Promise<void> {
    await db.query("UPDATE compartido SET publicacion = $2 WHERE id = $1", [id, publicacion]);
  },

  async revocar(id: string): Promise<void> {
    await db.query("UPDATE compartido SET estado = 'REVOCADO' WHERE id = $1", [id]);
  },
};
