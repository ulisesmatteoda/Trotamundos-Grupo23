// ViajeService: módulo central del dominio (Iteración 2, Paso 5.3).
// Orquesta la gestión de viajes y reservas (UC-02) y su ciclo de vida. No conoce HTTP,
// proveedores externos ni detalles de infraestructura más allá de su repositorio.
import { ViajeRepository } from "../persistence/ViajeRepository";
import { DatosReserva, DatosViaje, OrigenReserva, Reserva, Viaje, rangoDelViaje } from "./modelo";
import { noEncontrado } from "./errores";

async function viajeDelUsuario(usuarioId: string, viajeId: string): Promise<Viaje> {
  const viaje = await ViajeRepository.obtener(usuarioId, viajeId);
  if (!viaje) throw noEncontrado("VIAJE_NO_ENCONTRADO");
  return viaje;
}

async function viajeDeLaReserva(usuarioId: string, reservaId: string): Promise<Viaje> {
  const viajeId = await ViajeRepository.viajeDeReserva(usuarioId, reservaId);
  if (!viajeId) throw noEncontrado("RESERVA_NO_ENCONTRADA");
  return viajeDelUsuario(usuarioId, viajeId);
}

// Un viaje archivado vuelve a la vista principal si se le agrega o corre una reserva al futuro.
async function reactivarSiCorresponde(usuarioId: string, viajeId: string, ahora = new Date()): Promise<void> {
  const viaje = await viajeDelUsuario(usuarioId, viajeId);
  const { fin } = rangoDelViaje(viaje);
  if (viaje.estado === "ARCHIVADO" && fin && fin >= ahora) {
    await ViajeRepository.cambiarEstado(viajeId, "ACTIVO");
  }
}

export const ViajeService = {
  listar(usuarioId: string, archivados: boolean): Promise<Viaje[]> {
    return ViajeRepository.listar(usuarioId, archivados ? "ARCHIVADO" : "ACTIVO");
  },

  obtener: viajeDelUsuario,

  async crear(usuarioId: string, datos: DatosViaje): Promise<Viaje> {
    const id = await ViajeRepository.crear(usuarioId, datos);
    return viajeDelUsuario(usuarioId, id);
  },

  async actualizar(usuarioId: string, viajeId: string, datos: DatosViaje): Promise<Viaje> {
    if (!(await ViajeRepository.actualizar(usuarioId, viajeId, datos))) throw noEncontrado("VIAJE_NO_ENCONTRADO");
    return viajeDelUsuario(usuarioId, viajeId);
  },

  async eliminar(usuarioId: string, viajeId: string): Promise<void> {
    if (!(await ViajeRepository.eliminar(usuarioId, viajeId))) throw noEncontrado("VIAJE_NO_ENCONTRADO");
  },

  async agregarReserva(
    usuarioId: string,
    viajeId: string,
    datos: DatosReserva,
    origen: OrigenReserva = "MANUAL",
  ): Promise<Reserva> {
    await viajeDelUsuario(usuarioId, viajeId);
    const reserva = await ViajeRepository.crearReserva(viajeId, datos, origen);
    await reactivarSiCorresponde(usuarioId, viajeId);
    return reserva;
  },

  async actualizarReserva(usuarioId: string, reservaId: string, datos: DatosReserva): Promise<Reserva> {
    const viaje = await viajeDeLaReserva(usuarioId, reservaId);
    const reserva = await ViajeRepository.actualizarReserva(reservaId, datos);
    await reactivarSiCorresponde(usuarioId, viaje.id);
    return reserva;
  },

  async eliminarReserva(usuarioId: string, reservaId: string): Promise<void> {
    await viajeDeLaReserva(usuarioId, reservaId);
    await ViajeRepository.eliminarReserva(reservaId);
  },

  // Ciclo de vida (UC-02): una vez completado, el viaje sale de la vista principal.
  // Lo invoca el ArchivadoJob en el proceso Worker.
  archivarCompletados(ahora = new Date()) {
    return ViajeRepository.archivarFinalizadosAntesDe(ahora);
  },
};
