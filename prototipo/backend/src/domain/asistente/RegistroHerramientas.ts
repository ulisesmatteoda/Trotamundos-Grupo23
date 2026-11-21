// Catálogo de herramientas del asistente (ADR-012). Valida los argumentos de cada llamada
// contra el esquema de la herramienta antes de ejecutarla: lo que genera el modelo es entrada
// no confiable, igual que un body HTTP.
import { Sesion } from "../../security/AuthService";
import { AuditoriaSeguridad } from "../../security/AuditoriaSeguridad";
import { ConversacionRepository } from "../../persistence/ConversacionRepository";
import type { DefinicionHerramientaLlm, LlamadaHerramienta } from "../../integration/llm/ILlmAdapter";
import { EsquemaArgumentos, IHerramienta, ResultadoHerramienta, error } from "./IHerramienta";
import { ErrorDominio } from "../errores";

function validar(esquema: EsquemaArgumentos, args: unknown): Record<string, string> {
  const errores: Record<string, string> = {};
  if (typeof args !== "object" || args === null || Array.isArray(args)) return { _: "NO_ES_OBJETO" };
  const valores = args as Record<string, unknown>;
  for (const campo of Object.keys(valores)) {
    if (!(campo in esquema.properties)) errores[campo] = "NO_PERMITIDO";
  }
  for (const [campo, prop] of Object.entries(esquema.properties)) {
    const v = valores[campo];
    const tipos: string[] = Array.isArray(prop.type) ? prop.type : [prop.type];
    if (v === undefined) {
      if (esquema.required.includes(campo) && !tipos.includes("null")) errores[campo] = "REQUERIDO";
      continue;
    }
    if (v === null) {
      if (!tipos.includes("null")) errores[campo] = "REQUERIDO";
      continue;
    }
    const tipoReal = Number.isInteger(v) ? "integer" : typeof v;
    if (!tipos.includes(tipoReal)) {
      errores[campo] = "TIPO_INVALIDO";
      continue;
    }
    if (typeof v === "string") {
      if (prop.maxLength !== undefined && v.length > prop.maxLength) errores[campo] = "DEMASIADO_LARGO";
      else if (prop.pattern && !new RegExp(prop.pattern).test(v)) errores[campo] = "FORMATO_INVALIDO";
    }
  }
  return errores;
}

// Un id que no es del usuario se responde igual que uno inexistente, y queda registrado (QA-04e).
export async function recursoNoEncontrado(
  sesion: Sesion,
  herramienta: string,
  tipo: "viaje" | "reserva",
  id: string,
): Promise<ResultadoHerramienta> {
  const dueno = await ConversacionRepository.duenoDe(tipo, id);
  if (dueno && dueno !== sesion.usuarioId) {
    await AuditoriaSeguridad.registrar("ASISTENTE_RECURSO_AJENO", {
      usuarioId: sesion.usuarioId,
      recurso: `${herramienta} ${tipo}/${id}`,
    });
  }
  return error(tipo === "viaje" ? "VIAJE_NO_ENCONTRADO" : "RESERVA_NO_ENCONTRADA");
}

export class RegistroHerramientas {
  private readonly herramientas = new Map<string, IHerramienta>();

  constructor(lista: IHerramienta[]) {
    for (const h of lista) this.herramientas.set(h.nombre, h);
  }

  definiciones(): DefinicionHerramientaLlm[] {
    return [...this.herramientas.values()].map((h) => ({ nombre: h.nombre, descripcion: h.descripcion, esquema: { ...h.esquema } }));
  }

  async ejecutar(sesion: Sesion, llamada: LlamadaHerramienta): Promise<ResultadoHerramienta> {
    const herramienta = this.herramientas.get(llamada.nombre);
    if (!herramienta) return error("HERRAMIENTA_DESCONOCIDA");
    const errores = validar(herramienta.esquema, llamada.argumentos);
    if (Object.keys(errores).length > 0) return error("ARGUMENTOS_INVALIDOS", { detalle: errores });
    try {
      return await herramienta.ejecutar(sesion, llamada.argumentos);
    } catch (err) {
      // Los errores de dominio (validaciones de los servicios) se le informan al modelo.
      if (err instanceof ErrorDominio && err.status < 500) return error(err.codigo, err.detalle ? { detalle: err.detalle } : {});
      throw err;
    }
  }
}
