// Contrato de una herramienta del asistente (ADR-012). Agregar una capacidad es implementar
// este contrato y registrarla en RegistroHerramientas, sin tocar el ciclo del turno (QA-05c).
// Los esquemas están documentados en specs/asistente/herramientas.schema.json.
import { Sesion } from "../../security/AuthService";
import { CasoSoporte } from "../../persistence/CasoSoporteRepository";
import { AccionPendiente } from "./AccionPendiente";

export type TipoHerramienta = "LECTURA" | "PROPUESTA_ESCRITURA" | "ESCALAMIENTO";

export interface EsquemaPropiedad {
  type: "string" | "integer" | "boolean" | ("string" | "null")[];
  description: string;
  pattern?: string;
  maxLength?: number;
}

// Subconjunto de JSON Schema que usan las herramientas. Todas las propiedades son requeridas;
// las opcionales admiten null (lo exige el modo estricto de los proveedores).
export interface EsquemaArgumentos {
  type: "object";
  properties: Record<string, EsquemaPropiedad>;
  required: string[];
  additionalProperties: false;
}

export interface ResultadoHerramienta {
  // Lo único que ve el modelo: pasa por ContextoLlmBuilder.
  datos: Record<string, unknown>;
  esError?: boolean;
  // Efectos para la interfaz y la conversación (no viajan al LLM).
  accion?: AccionPendiente;
  caso?: CasoSoporte;
  reservaFoco?: string;
  sugerirDerivacion?: boolean;
}

export interface IHerramienta {
  readonly nombre: string;
  readonly descripcion: string;
  readonly esquema: EsquemaArgumentos;
  readonly tipo: TipoHerramienta;
  // La sesión es siempre la del JWT validado por el Gateway, nunca un argumento del modelo.
  ejecutar(sesion: Sesion, args: Record<string, unknown>): Promise<ResultadoHerramienta>;
}

export const UUID = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

export const error = (codigo: string, extra: Record<string, unknown> = {}): ResultadoHerramienta => ({
  datos: { error: codigo, ...extra },
  esError: true,
});
