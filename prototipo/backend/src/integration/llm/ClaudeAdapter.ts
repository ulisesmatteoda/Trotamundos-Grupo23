// Adaptador del proveedor real de LLM (ADR-011). Traduce los DTOs neutros al formato de la
// Messages API. La clave se toma de ANTHROPIC_API_KEY (configuración del backend, nunca del
// cliente) y el SDK se comunica por HTTPS (QA-04f).
//  - Una llamada por cada completar(): el ciclo del turno lo maneja el AsistenteService.
//  - El contenido de cada respuesta (incluidos los bloques de razonamiento) vuelve como
//    datosProveedor y se reenvía sin cambios dentro del turno; entre turnos solo viaja texto.
import Anthropic from "@anthropic-ai/sdk";
import { EntradaLlm, ILlmAdapter, LlmNoDisponible, MensajeLlm, RespuestaLlm } from "./ILlmAdapter";

type Mensaje = Anthropic.Beta.Messages.BetaMessageParam;
type Bloque = Anthropic.Beta.Messages.BetaContentBlock;

function aMensaje(m: MensajeLlm): Mensaje {
  switch (m.rol) {
    case "usuario":
      return { role: "user", content: m.texto };
    case "asistente":
      if (m.datosProveedor) return { role: "assistant", content: m.datosProveedor as Bloque[] };
      return { role: "assistant", content: m.texto };
    case "resultados":
      return {
        role: "user",
        content: m.resultados.map((r) => ({ type: "tool_result", tool_use_id: r.llamadaId, content: r.contenido, is_error: r.esError })),
      };
  }
}

export class ClaudeAdapter implements ILlmAdapter {
  readonly nombre = "claude";
  private readonly cliente: Anthropic;

  constructor(private readonly modelo: string) {
    // Sin reintentos del SDK: los decide LlmConResiliencia (ADR-014).
    this.cliente = new Anthropic({ maxRetries: 0 });
  }

  async completar(entrada: EntradaLlm, timeoutMs: number): Promise<RespuestaLlm> {
    let respuesta: Anthropic.Beta.Messages.BetaMessage;
    try {
      respuesta = await this.cliente.beta.messages.create(
        {
          model: this.modelo,
          max_tokens: 4096,
          system: entrada.instrucciones,
          messages: entrada.mensajes.map(aMensaje),
          tools: entrada.herramientas.map((h) => ({
            name: h.nombre,
            description: h.descripcion,
            input_schema: h.esquema as Anthropic.Beta.Messages.BetaTool.InputSchema,
            strict: true,
          })),
          // Respuestas de chat: menos razonamiento, menor latencia del turno (QA-01d).
          output_config: { effort: "low" },
          // Si el modelo rechaza la solicitud, el proveedor la reintenta con otro modelo.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { timeout: timeoutMs },
      );
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) throw new LlmNoDisponible("TIMEOUT");
      if (err instanceof Anthropic.APIError) {
        console.warn(`[llm claude] error ${err.status ?? "de conexión"}: ${err.message}`);
        throw new LlmNoDisponible("ERROR_PROVEEDOR");
      }
      throw err;
    }

    // Un rechazo de toda la cadena se informa como respuesta vacía; el asistente ofrece la agencia.
    if (respuesta.stop_reason === "refusal") return { texto: "", llamadas: [] };

    const texto = respuesta.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    // Si se cortó por max_tokens, una llamada a herramienta puede venir incompleta: no se ejecuta.
    const llamadas =
      respuesta.stop_reason === "max_tokens"
        ? []
        : respuesta.content
            .filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use")
            .map((b) => ({ id: b.id, nombre: b.name, argumentos: (b.input ?? {}) as Record<string, unknown> }));
    return { texto, llamadas, datosProveedor: respuesta.content };
  }
}
