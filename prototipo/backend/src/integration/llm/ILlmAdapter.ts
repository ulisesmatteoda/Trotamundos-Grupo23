// Contrato del ACL para el proveedor del LLM (ADR-011, Iteración 6 — Vista de Módulos).
// El AsistenteService solo conoce estos DTOs neutros: cambiar de proveedor o de modelo es
// escribir otro adaptador (QA-05c). Contrato documentado en specs/llm/llm-adapter.md.

export interface DefinicionHerramientaLlm {
  nombre: string;
  descripcion: string;
  // JSON Schema de los argumentos (objeto, sin propiedades adicionales).
  esquema: Record<string, unknown>;
}

export interface LlamadaHerramienta {
  id: string;
  nombre: string;
  argumentos: Record<string, unknown>;
}

export interface ResultadoLlamada {
  llamadaId: string;
  contenido: string; // JSON con el resultado de la herramienta
  esError?: boolean;
}

export type MensajeLlm =
  | { rol: "usuario"; texto: string }
  // datosProveedor: contenido original de la respuesta, opaco para el core. El adaptador que
  // lo produjo lo reenvía sin cambios dentro del mismo turno.
  | { rol: "asistente"; texto: string; llamadas?: LlamadaHerramienta[]; datosProveedor?: unknown }
  | { rol: "resultados"; resultados: ResultadoLlamada[] };

export interface EntradaLlm {
  instrucciones: string;
  idioma: string;
  mensajes: MensajeLlm[];
  herramientas: DefinicionHerramientaLlm[];
}

export interface RespuestaLlm {
  texto: string;
  llamadas: LlamadaHerramienta[];
  datosProveedor?: unknown;
}

export type MotivoNoDisponible = "TIMEOUT" | "ERROR_PROVEEDOR" | "CIRCUITO_ABIERTO" | "SATURADO";

// Única falla que el core conoce: el LLM no respondió (por la razón que sea).
export class LlmNoDisponible extends Error {
  constructor(readonly motivo: MotivoNoDisponible) {
    super(`LLM no disponible: ${motivo}`);
  }
}

export interface ILlmAdapter {
  readonly nombre: string;
  completar(entrada: EntradaLlm, timeoutMs: number): Promise<RespuestaLlm>;
}
