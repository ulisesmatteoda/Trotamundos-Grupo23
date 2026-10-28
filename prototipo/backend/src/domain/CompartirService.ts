// CompartirService (Iteración 5, ADR-010): compartición de itinerarios por enlace con una
// lista de personas designadas. Solo el dueño y las personas designadas (autenticadas con
// JWT) pueden ver el itinerario; cualquier otro intento se deniega y se registra (QA-04b).
// Opcionalmente publica en una red social, a través de IRedSocialAdapter (ADR-009), solo el
// texto del usuario y el enlace: nunca los datos del itinerario (QA-03c).
import { randomBytes } from "crypto";
import { config } from "../config";
import type { IRedSocialAdapter } from "../integration/redes/IRedSocialAdapter";
import { CompartidoRepository, Compartido, Publicacion } from "../persistence/CompartidoRepository";
import { UsuarioRepository } from "../persistence/UsuarioRepository";
import { AuditoriaSeguridad } from "../security/AuditoriaSeguridad";
import { Sesion } from "../security/AuthService";
import { ErrorDominio, invalido, noEncontrado } from "./errores";
import { ViajeService } from "./ViajeService";
import { Viaje } from "./modelo";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_MENSAJE = 200;

// Los adaptadores de redes se inyectan desde la raíz de composición (server.ts).
const redes = new Map<string, IRedSocialAdapter>();
const MAX_DESIGNADOS = 20;

// 144 bits aleatorios: el enlace no se puede adivinar ni recorrer.
const nuevoEnlace = () => randomBytes(18).toString("base64url");

function validarDesignados(valor: unknown, emailDueno: string): string[] {
  if (!Array.isArray(valor) || valor.length === 0) throw invalido({ designados: "REQUERIDO" });
  const emails = [...new Set(valor.map((e) => (typeof e === "string" ? e.trim().toLowerCase() : "")))];
  if (emails.length > MAX_DESIGNADOS || emails.some((e) => !EMAIL.test(e))) throw invalido({ designados: "EMAIL_INVALIDO" });
  return emails.filter((e) => e !== emailDueno.toLowerCase());
}

// Solo el dueño gestiona los compartidos de su viaje.
async function compartidoDelDueno(sesion: Sesion, enlaceId: string): Promise<Compartido> {
  const c = await CompartidoRepository.porEnlace(enlaceId);
  if (!c || c.estado !== "ACTIVO") throw noEncontrado("COMPARTIDO_NO_ENCONTRADO");
  if (c.duenoId !== sesion.usuarioId) throw new ErrorDominio("SOLO_EL_DUENO", 403);
  return c;
}

async function publicar(red: IRedSocialAdapter, compartido: Compartido, mensaje: string): Promise<Publicacion> {
  const enlace = `${config.urlPublica}/compartido/${compartido.enlaceId}`;
  try {
    const r = await red.publicar({ texto: mensaje, enlace }, config.timeoutIntegracionMs);
    return { redSocial: red.nombre, estado: "PUBLICADA", idExterno: r.idExterno, url: r.url };
  } catch (err) {
    const motivo = err instanceof ErrorDominio ? (err.detalle?.motivo as string) ?? err.codigo : "ERROR_INTERNO";
    return { redSocial: red.nombre, estado: "FALLIDA", error: motivo };
  }
}

export const CompartirService = {
  configurarRedes(lista: IRedSocialAdapter[]): void {
    redes.clear();
    for (const r of lista) redes.set(r.nombre, r);
  },

  redesDisponibles(): string[] {
    return [...redes.keys()];
  },

  async compartir(sesion: Sesion, viajeId: string, designados: unknown, redSocial?: unknown, mensaje?: unknown): Promise<Compartido> {
    await ViajeService.obtener(sesion.usuarioId, viajeId); // 404 si el viaje no es del usuario
    const emails = validarDesignados(designados, sesion.email);
    if (emails.length === 0) throw invalido({ designados: "SOLO_EL_DUENO" });

    let red: IRedSocialAdapter | undefined;
    if (redSocial != null && redSocial !== "") {
      red = typeof redSocial === "string" ? redes.get(redSocial) : undefined;
      if (!red) throw invalido({ redSocial: "RED_DESCONOCIDA" });
      if (typeof mensaje !== "string" || !mensaje.trim() || mensaje.length > MAX_MENSAJE) throw invalido({ mensaje: "TEXTO_INVALIDO" });
    }

    const compartido = await CompartidoRepository.crear(viajeId, sesion.usuarioId, nuevoEnlace(), emails);
    if (!red) return compartido;

    // La publicación no condiciona el compartido: si la red falla, el enlace igual existe.
    const publicacion = await publicar(red, compartido, (mensaje as string).trim());
    await CompartidoRepository.guardarPublicacion(compartido.id, publicacion);
    return { ...compartido, publicacion };
  },

  async listar(sesion: Sesion, viajeId: string): Promise<Compartido[]> {
    await ViajeService.obtener(sesion.usuarioId, viajeId);
    return CompartidoRepository.activosDeViaje(viajeId);
  },

  // QA-04b: verificación de autorización en cada acceso. Un enlace inexistente o revocado
  // responde igual que uno ajeno inexistente (404), para no revelar qué enlaces existen.
  async ver(sesion: Sesion, enlaceId: string, ip?: string): Promise<{ viaje: Viaje; compartidoPor: string }> {
    const c = await CompartidoRepository.porEnlace(enlaceId);
    if (!c || c.estado !== "ACTIVO") throw noEncontrado("COMPARTIDO_NO_ENCONTRADO");

    const esDueno = c.duenoId === sesion.usuarioId;
    if (!esDueno && !c.designados.includes(sesion.email.toLowerCase())) {
      await AuditoriaSeguridad.registrar("ACCESO_COMPARTIDO_DENEGADO", { usuarioId: sesion.usuarioId, recurso: enlaceId, ip });
      throw new ErrorDominio("ACCESO_DENEGADO", 403);
    }

    const [viaje, dueno] = await Promise.all([ViajeService.obtener(c.duenoId, c.viajeId), UsuarioRepository.porId(c.duenoId)]);
    return { viaje, compartidoPor: dueno?.nombre ?? "" };
  },

  async revocar(sesion: Sesion, enlaceId: string): Promise<void> {
    const c = await compartidoDelDueno(sesion, enlaceId);
    await CompartidoRepository.revocar(c.id);
  },
};
