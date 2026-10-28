// SoporteService (Iteración 5, ADR-009): deriva un problema con una reserva a la agencia
// preferida del usuario (QA-03d, QA-06c).
//  - Arma el contexto completo de la reserva: la agencia recibe todo sin reingreso manual.
//  - Llama a la agencia de forma sincrónica con timeout de 2 s (táctica Timeout).
//  - Si la agencia falla o no responde a tiempo, el caso no se pierde: se publica un
//    CasoSoportePendienteEvent y el SoporteRetryConsumer lo reintenta (táctica Retry, QA-02).
//  - El id del caso viaja como clave de idempotencia: un reintento nunca duplica el caso.
import { randomUUID } from "crypto";
import { config } from "../config";
import type { ContextoCasoDTO, IAgenciaSoporteAdapter } from "../integration/soporte/IAgenciaSoporteAdapter";
import { eventBus } from "../messaging/EventBus";
import { CasoSoportePendienteEvent, COLA_SOPORTE } from "../messaging/colas";
import { CasoSoporte, CasoSoporteRepository } from "../persistence/CasoSoporteRepository";
import { UsuarioRepository } from "../persistence/UsuarioRepository";
import { ViajeRepository } from "../persistence/ViajeRepository";
import { Sesion } from "../security/AuthService";
import { ErrorDominio, invalido, noEncontrado } from "./errores";
import { ViajeService } from "./ViajeService";

// Los adaptadores se inyectan desde la raíz de composición (server.ts y workers/main.ts).
const agencias = new Map<string, IAgenciaSoporteAdapter>();

function agencia(nombre: string): IAgenciaSoporteAdapter {
  const a = agencias.get(nombre);
  if (!a) throw new ErrorDominio("AGENCIA_SOPORTE_NO_CONFIGURADA", 500);
  return a;
}

async function armarContexto(sesion: Sesion, reservaId: string, descripcion: string | null, casoId: string) {
  const viajeId = await ViajeRepository.viajeDeReserva(sesion.usuarioId, reservaId);
  if (!viajeId) throw noEncontrado("RESERVA_NO_ENCONTRADA");
  const [viaje, usuario] = await Promise.all([ViajeService.obtener(sesion.usuarioId, viajeId), UsuarioRepository.porId(sesion.usuarioId)]);
  const r = viaje.reservas.find((x) => x.id === reservaId)!;
  const contexto: ContextoCasoDTO = {
    casoId,
    descripcion,
    viajero: { nombre: usuario!.nombre, email: usuario!.email },
    viaje: { nombre: viaje.nombre, destino: viaje.destino },
    reserva: {
      tipo: r.tipo,
      titulo: r.titulo,
      proveedor: r.proveedor,
      codigoConfirmacion: r.codigoConfirmacion,
      estado: r.estado,
      inicio: r.inicio.toISOString(),
      fin: r.fin ? r.fin.toISOString() : null,
      zonaHorariaInicio: r.ubicacion?.zonaHoraria,
      zonaHorariaFin: r.ubicacionFin?.zonaHoraria ?? r.ubicacion?.zonaHoraria,
      direccion: r.ubicacion?.direccion,
      precio: r.precio,
    },
  };
  return { contexto, agenciaPreferida: usuario!.agenciaPreferida };
}

async function encolarReintento(caso: CasoSoporte, intento: number, demoraMs: number): Promise<void> {
  const evento: CasoSoportePendienteEvent = {
    tipo: "CasoSoportePendienteEvent",
    correlationId: randomUUID(),
    publicadoEn: new Date().toISOString(),
    casoId: caso.id,
    intento,
  };
  if (demoraMs > 0) await eventBus.publicarConDemora(COLA_SOPORTE, evento, demoraMs);
  else await eventBus.publicar(COLA_SOPORTE, evento);
}

export const SoporteService = {
  configurarAgencias(lista: IAgenciaSoporteAdapter[]): void {
    agencias.clear();
    for (const a of lista) agencias.set(a.nombre, a);
  },

  async solicitarAsistencia(sesion: Sesion, reservaId: string, descripcion: unknown): Promise<CasoSoporte> {
    if (descripcion != null && (typeof descripcion !== "string" || descripcion.length > 500)) {
      throw invalido({ descripcion: "TEXTO_INVALIDO" });
    }
    const casoId = randomUUID();
    const { contexto, agenciaPreferida } = await armarContexto(sesion, reservaId, (descripcion as string)?.trim() || null, casoId);
    const caso = await CasoSoporteRepository.crear(casoId, sesion.usuarioId, reservaId, agenciaPreferida, contexto);

    await CasoSoporteRepository.registrarIntento(caso.id);
    try {
      const { ticket } = await agencia(caso.agencia).derivarCaso(contexto, config.timeoutIntegracionMs);
      return CasoSoporteRepository.marcarDerivado(caso.id, ticket);
    } catch (err) {
      console.warn(`[soporte caso=${caso.id}] la agencia no respondió a tiempo (${(err as Error).message}); se reintenta en segundo plano`);
      await encolarReintento(caso, 2, 0);
      return (await CasoSoporteRepository.obtener(caso.id))!;
    }
  },

  async obtener(sesion: Sesion, casoId: string): Promise<CasoSoporte> {
    const caso = await CasoSoporteRepository.obtener(casoId);
    if (!caso || caso.usuarioId !== sesion.usuarioId) throw noEncontrado("CASO_NO_ENCONTRADO");
    return caso;
  },

  // Lo invoca el SoporteRetryConsumer (proceso Worker). Idempotente: si el caso ya fue
  // derivado (p. ej. un mensaje duplicado), no hace nada.
  async reintentarDerivacion(casoId: string, intento: number): Promise<"DERIVADO" | "REPROGRAMADO" | "YA_DERIVADO" | "AGOTADO"> {
    const caso = await CasoSoporteRepository.obtener(casoId);
    if (!caso || caso.estado === "DERIVADO") return "YA_DERIVADO";

    await CasoSoporteRepository.registrarIntento(caso.id);
    try {
      // Fuera del camino del usuario se espera más que en la llamada sincrónica.
      const { ticket } = await agencia(caso.agencia).derivarCaso(caso.contexto, config.timeoutIntegracionMs * 3);
      await CasoSoporteRepository.marcarDerivado(caso.id, ticket);
      return "DERIVADO";
    } catch {
      if (intento >= config.soporteMaxIntentos) return "AGOTADO";
      await encolarReintento(caso, intento + 1, config.soporteReintentoMs);
      return "REPROGRAMADO";
    }
  },
};
