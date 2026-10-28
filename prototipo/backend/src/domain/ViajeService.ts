// ViajeService: módulo central del dominio (Iteración 2, Paso 5.3).
// Orquesta la gestión de viajes y reservas (UC-02), su ciclo de vida y la incorporación de
// reservas externas (UC-01). Delega en los proveedores solo a través de IAgenciaAdapter:
// no conoce ni importa ningún adaptador concreto (ADR-002, QA-05a).
// Es "cache-aware" (Iteración 4, Paso 5.4): lee los itinerarios primero de Redis y, ante
// cualquier modificación, invalida la entrada del usuario (Cache-Aside, ADR-007).
import { ViajeRepository } from "../persistence/ViajeRepository";
import { UsuarioRepository } from "../persistence/UsuarioRepository";
import { RemitenteRepository } from "../persistence/RemitenteRepository";
import { CacheItinerarios } from "../cache/CacheItinerarios";
import type { IAgenciaAdapter } from "../integration/IAgenciaAdapter";
import {
  DatosReserva,
  DatosViaje,
  OrigenReserva,
  Reserva,
  ReservaExterna,
  ResultadoIncorporacion,
  Viaje,
  rangoDelViaje,
} from "./modelo";
import { noEncontrado } from "./errores";
import { esRemitenteSeguro } from "./whitelist";

// Los adaptadores se inyectan desde la raíz de composición (server.ts).
const agencias = new Map<string, IAgenciaAdapter>();

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

function agencia(nombre: string): IAgenciaAdapter {
  const adaptador = agencias.get(nombre.toLowerCase());
  if (!adaptador) throw noEncontrado("AGENCIA_DESCONOCIDA");
  return adaptador;
}

const mismaFecha = (a?: Date | null, b?: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

// Compara lo que una fuente externa puede cambiar de una reserva ya incorporada.
function mismosDatos(actual: Reserva, nuevos: DatosReserva): boolean {
  return (
    actual.tipo === nuevos.tipo &&
    actual.titulo === nuevos.titulo &&
    mismaFecha(actual.inicio, nuevos.inicio) &&
    mismaFecha(actual.fin, nuevos.fin) &&
    (!nuevos.precio || (actual.precio?.valor === nuevos.precio.valor && actual.precio?.moneda === nuevos.precio.moneda))
  );
}

export interface Incorporacion {
  resultado: ResultadoIncorporacion;
  reservaId?: string;
  viajeId?: string;
}

async function incorporarReservaExterna(usuarioId: string, externa: ReservaExterna, origen: OrigenReserva): Promise<Incorporacion> {
  const r = await aplicarReservaExterna(usuarioId, externa, origen);
  if (r.resultado !== "SIN_CAMBIOS") await CacheItinerarios.invalidar(usuarioId);
  return r;
}

// Aplica una reserva externa al itinerario: si ya existe (mismo proveedor y código)
// la actualiza o cancela; si no, la agrupa en el viaje activo que la contiene o crea uno nuevo.
async function aplicarReservaExterna(
  usuarioId: string,
  externa: ReservaExterna,
  origen: OrigenReserva,
): Promise<Incorporacion> {
  const { datos, estado } = externa;
  const existente =
    datos.proveedor && datos.codigoConfirmacion
      ? await ViajeRepository.buscarPorIdentidadExterna(usuarioId, datos.proveedor, datos.codigoConfirmacion)
      : null;

  if (existente) {
    if (estado === "CANCELADA") {
      if (existente.estado !== "CANCELADA") await ViajeRepository.cancelarReserva(existente.id);
      return { resultado: "CANCELADA", reservaId: existente.id, viajeId: existente.viajeId };
    }
    if (existente.estado !== "CANCELADA" && mismosDatos(existente, datos)) {
      return { resultado: "SIN_CAMBIOS", reservaId: existente.id, viajeId: existente.viajeId };
    }
    // Completar un dato que faltaba (ej. la hora de llegada que el mail no traía) no es un cambio
    // de la reserva: solo se marca MODIFICADA si la fuente lo informa o si cambia un horario conocido.
    const cambioDeHorario = !mismaFecha(existente.inicio, datos.inicio) || (existente.fin != null && !mismaFecha(existente.fin, datos.fin));
    const nuevoEstado = estado === "MODIFICADA" || cambioDeHorario ? "MODIFICADA" : existente.estado;
    await ViajeRepository.actualizarDesdeFuente(existente.id, datos, nuevoEstado);
    await reactivarSiCorresponde(usuarioId, existente.viajeId);
    return { resultado: "ACTUALIZADA", reservaId: existente.id, viajeId: existente.viajeId };
  }

  // Una cancelación de algo que nunca se incorporó no requiere acción.
  if (estado === "CANCELADA") return { resultado: "SIN_CAMBIOS" };

  const viajeId =
    (await ViajeRepository.viajeActivoQueContiene(usuarioId, datos.inicio)) ??
    (await ViajeRepository.crear(usuarioId, { nombre: externa.destino ?? datos.titulo, destino: externa.destino }));
  const reserva = await ViajeRepository.crearReserva(viajeId, datos, origen);
  await reactivarSiCorresponde(usuarioId, viajeId);
  return { resultado: "CREADA", reservaId: reserva.id, viajeId };
}

export type ResultadoMail = Incorporacion["resultado"] | "REMITENTE_NO_SEGURO" | "SIN_DATOS_DE_VIAJE";

export const ViajeService = {
  configurarAgencias(adaptadores: IAgenciaAdapter[]): void {
    agencias.clear();
    for (const a of adaptadores) agencias.set(a.nombre.toLowerCase(), a);
  },

  agenciasDisponibles(): string[] {
    return [...agencias.keys()];
  },

  // Cache-Aside: Redis primero; ante un miss, PostgreSQL y se puebla la caché con TTL.
  async listar(usuarioId: string, archivados: boolean): Promise<{ viajes: Viaje[]; cache: "HIT" | "MISS" }> {
    const enCache = await CacheItinerarios.leer(usuarioId, archivados);
    if (enCache) return { viajes: enCache, cache: "HIT" };
    const viajes = await ViajeRepository.listar(usuarioId, archivados ? "ARCHIVADO" : "ACTIVO");
    await CacheItinerarios.guardar(usuarioId, archivados, viajes);
    return { viajes, cache: "MISS" };
  },

  obtener: viajeDelUsuario,

  async crear(usuarioId: string, datos: DatosViaje): Promise<Viaje> {
    const id = await ViajeRepository.crear(usuarioId, datos);
    await CacheItinerarios.invalidar(usuarioId);
    return viajeDelUsuario(usuarioId, id);
  },

  async actualizar(usuarioId: string, viajeId: string, datos: DatosViaje): Promise<Viaje> {
    if (!(await ViajeRepository.actualizar(usuarioId, viajeId, datos))) throw noEncontrado("VIAJE_NO_ENCONTRADO");
    await CacheItinerarios.invalidar(usuarioId);
    return viajeDelUsuario(usuarioId, viajeId);
  },

  async eliminar(usuarioId: string, viajeId: string): Promise<void> {
    if (!(await ViajeRepository.eliminar(usuarioId, viajeId))) throw noEncontrado("VIAJE_NO_ENCONTRADO");
    await CacheItinerarios.invalidar(usuarioId);
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
    await CacheItinerarios.invalidar(usuarioId);
    return reserva;
  },

  async actualizarReserva(usuarioId: string, reservaId: string, datos: DatosReserva): Promise<Reserva> {
    const viaje = await viajeDeLaReserva(usuarioId, reservaId);
    const reserva = await ViajeRepository.actualizarReserva(reservaId, datos);
    await reactivarSiCorresponde(usuarioId, viaje.id);
    await CacheItinerarios.invalidar(usuarioId);
    return reserva;
  },

  async eliminarReserva(usuarioId: string, reservaId: string): Promise<void> {
    await viajeDeLaReserva(usuarioId, reservaId);
    await ViajeRepository.eliminarReserva(reservaId);
    await CacheItinerarios.invalidar(usuarioId);
  },

  // UC-01 / QA-03b: lo invoca el ItinerarioEmailConsumer. El contenido del correo solo se
  // lee (extraerDatos) si el remitente está en la whitelist del usuario.
  async procesarReservaMail(
    casilla: string,
    remitente: string,
    extraerDatos: () => ReservaExterna | null,
  ): Promise<{ resultado: ResultadoMail; reservaId?: string; viajeId?: string }> {
    const usuario = await UsuarioRepository.porEmail(casilla);
    if (!usuario) return { resultado: "USUARIO_DESCONOCIDO" };

    const whitelist = (await RemitenteRepository.listar(usuario.id)).map((r) => r.remitente);
    if (!esRemitenteSeguro(remitente, whitelist)) return { resultado: "REMITENTE_NO_SEGURO" };

    const externa = extraerDatos();
    if (!externa) return { resultado: "SIN_DATOS_DE_VIAJE" };
    return incorporarReservaExterna(usuario.id, externa, "EMAIL");
  },

  // QA-03a: aviso push del proveedor. El webhook solo se usa como señal; el detalle
  // vigente se consulta a la API del proveedor a través del adaptador.
  async procesarNotificacionAgencia(nombreAgencia: string, payload: unknown): Promise<Incorporacion> {
    const adaptador = agencia(nombreAgencia);
    const referencia = adaptador.traducirNotificacion(payload);
    const externa = await adaptador.obtenerDetallesReserva(referencia);
    const usuario = externa.emailCliente ? await UsuarioRepository.porEmail(externa.emailCliente) : null;
    if (!usuario) return { resultado: "USUARIO_DESCONOCIDO" };
    return incorporarReservaExterna(usuario.id, externa, "AGENCIA");
  },

  // Iteración 2: ViajeService.sincronizarConAgencia — trae todas las reservas del cliente.
  async sincronizarConAgencia(usuarioId: string, emailUsuario: string, nombreAgencia: string) {
    const adaptador = agencia(nombreAgencia);
    const reservas = await adaptador.sincronizarItinerario(emailUsuario);
    const resumen = { proveedor: adaptador.nombre, creadas: 0, actualizadas: 0, canceladas: 0 };
    for (const externa of reservas) {
      const { resultado } = await incorporarReservaExterna(usuarioId, externa, "AGENCIA");
      if (resultado === "CREADA") resumen.creadas++;
      if (resultado === "ACTUALIZADA") resumen.actualizadas++;
      if (resultado === "CANCELADA") resumen.canceladas++;
    }
    return resumen;
  },

  // Ciclo de vida (UC-02): una vez completado, el viaje sale de la vista principal.
  // Lo invoca el ArchivadoJob en el proceso Worker.
  async archivarCompletados(ahora = new Date()) {
    const archivados = await ViajeRepository.archivarFinalizadosAntesDe(ahora);
    for (const usuarioId of new Set(archivados.map((v) => v.usuarioId))) await CacheItinerarios.invalidar(usuarioId);
    return archivados;
  },
};
