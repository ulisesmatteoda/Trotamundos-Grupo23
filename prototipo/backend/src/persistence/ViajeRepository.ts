// Acceso a datos de viajes y reservas en PostgreSQL OLTP.
// Toda consulta filtra por usuario: un usuario nunca ve viajes ajenos (QA-04).
import { db } from "./db";
import { DatosReserva, DatosViaje, EstadoViaje, OrigenReserva, Reserva, Viaje } from "../domain/modelo";

type Fila = Record<string, any>;

const aReserva = (f: Fila): Reserva => ({
  id: f.id,
  viajeId: f.viaje_id,
  tipo: f.tipo,
  titulo: f.titulo,
  proveedor: f.proveedor ?? undefined,
  codigoConfirmacion: f.codigo_confirmacion ?? undefined,
  inicio: f.inicio,
  fin: f.fin,
  ubicacion: f.ubicacion ?? undefined,
  precio: f.precio ?? undefined,
  origen: f.origen,
  estado: f.estado,
  actualizadoEn: f.actualizado_en,
});

const aViaje = (f: Fila, reservas: Reserva[]): Viaje => ({
  id: f.id,
  usuarioId: f.usuario_id,
  nombre: f.nombre,
  destino: f.destino ?? undefined,
  estado: f.estado,
  reservas,
});

async function conReservas(filas: Fila[]): Promise<Viaje[]> {
  if (filas.length === 0) return [];
  const { rows } = await db.query("SELECT * FROM reserva WHERE viaje_id = ANY($1) ORDER BY inicio", [
    filas.map((f) => f.id),
  ]);
  const reservas = rows.map(aReserva);
  return filas.map((f) => aViaje(f, reservas.filter((r) => r.viajeId === f.id)));
}

export const ViajeRepository = {
  async listar(usuarioId: string, estado: EstadoViaje): Promise<Viaje[]> {
    const { rows } = await db.query(
      "SELECT * FROM viaje WHERE usuario_id = $1 AND estado = $2 ORDER BY creado_en DESC",
      [usuarioId, estado],
    );
    return conReservas(rows);
  },

  async obtener(usuarioId: string, viajeId: string): Promise<Viaje | null> {
    const { rows } = await db.query("SELECT * FROM viaje WHERE id = $1 AND usuario_id = $2", [viajeId, usuarioId]);
    return (await conReservas(rows))[0] ?? null;
  },

  async crear(usuarioId: string, datos: DatosViaje): Promise<string> {
    const { rows } = await db.query(
      "INSERT INTO viaje (usuario_id, nombre, destino) VALUES ($1, $2, $3) RETURNING id",
      [usuarioId, datos.nombre, datos.destino ?? null],
    );
    return rows[0].id;
  },

  async actualizar(usuarioId: string, viajeId: string, datos: DatosViaje): Promise<boolean> {
    const { rowCount } = await db.query(
      "UPDATE viaje SET nombre = $3, destino = $4 WHERE id = $1 AND usuario_id = $2",
      [viajeId, usuarioId, datos.nombre, datos.destino ?? null],
    );
    return rowCount === 1;
  },

  async cambiarEstado(viajeId: string, estado: EstadoViaje): Promise<void> {
    await db.query("UPDATE viaje SET estado = $2 WHERE id = $1", [viajeId, estado]);
  },

  async eliminar(usuarioId: string, viajeId: string): Promise<boolean> {
    const { rowCount } = await db.query("DELETE FROM viaje WHERE id = $1 AND usuario_id = $2", [viajeId, usuarioId]);
    return rowCount === 1;
  },

  // Viaje al que pertenece la reserva, solo si es del usuario.
  async viajeDeReserva(usuarioId: string, reservaId: string): Promise<string | null> {
    const { rows } = await db.query(
      "SELECT r.viaje_id FROM reserva r JOIN viaje v ON v.id = r.viaje_id WHERE r.id = $1 AND v.usuario_id = $2",
      [reservaId, usuarioId],
    );
    return rows[0]?.viaje_id ?? null;
  },

  async crearReserva(viajeId: string, datos: DatosReserva, origen: OrigenReserva): Promise<Reserva> {
    const { rows } = await db.query(
      `INSERT INTO reserva (viaje_id, tipo, titulo, proveedor, codigo_confirmacion, inicio, fin, ubicacion, precio, origen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        viajeId,
        datos.tipo,
        datos.titulo,
        datos.proveedor ?? null,
        datos.codigoConfirmacion ?? null,
        datos.inicio,
        datos.fin ?? null,
        datos.ubicacion ?? null,
        datos.precio ?? null,
        origen,
      ],
    );
    return aReserva(rows[0]);
  },

  async actualizarReserva(reservaId: string, datos: DatosReserva): Promise<Reserva> {
    const { rows } = await db.query(
      `UPDATE reserva SET tipo = $2, titulo = $3, proveedor = $4, codigo_confirmacion = $5, inicio = $6, fin = $7,
              ubicacion = $8, precio = $9, estado = 'MODIFICADA', actualizado_en = now()
       WHERE id = $1 RETURNING *`,
      [
        reservaId,
        datos.tipo,
        datos.titulo,
        datos.proveedor ?? null,
        datos.codigoConfirmacion ?? null,
        datos.inicio,
        datos.fin ?? null,
        datos.ubicacion ?? null,
        datos.precio ?? null,
      ],
    );
    return aReserva(rows[0]);
  },

  async eliminarReserva(reservaId: string): Promise<void> {
    await db.query("DELETE FROM reserva WHERE id = $1", [reservaId]);
  },

  // Archiva los viajes activos cuya última reserva vigente terminó antes de `ahora`.
  async archivarFinalizadosAntesDe(ahora: Date): Promise<{ id: string; usuarioId: string }[]> {
    const { rows } = await db.query(
      `UPDATE viaje v SET estado = 'ARCHIVADO'
       WHERE v.estado = 'ACTIVO'
         AND (SELECT max(coalesce(r.fin, r.inicio)) FROM reserva r
              WHERE r.viaje_id = v.id AND r.estado <> 'CANCELADA') < $1
       RETURNING v.id, v.usuario_id`,
      [ahora],
    );
    return rows.map((f) => ({ id: f.id, usuarioId: f.usuario_id }));
  },
};
