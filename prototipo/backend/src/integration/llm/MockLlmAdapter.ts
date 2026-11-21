// LLM simulado (ADR-011): bot determinístico por reglas que vive en el servicio de mocks, con
// modos normal, lento y caído para validar la resiliencia (ADR-014) sin red ni costo.
// Recibe exactamente lo mismo que recibiría un proveedor real: sirve para auditar QA-04f.
import { postJson } from "../http";
import { EntradaLlm, ILlmAdapter, LlmNoDisponible, RespuestaLlm } from "./ILlmAdapter";

export class MockLlmAdapter implements ILlmAdapter {
  readonly nombre = "mock";

  constructor(private readonly baseUrl: string) {}

  async completar(entrada: EntradaLlm, timeoutMs: number): Promise<RespuestaLlm> {
    const cuerpo = {
      ...entrada,
      // datosProveedor es propio de cada adaptador; el mock no lo necesita.
      mensajes: entrada.mensajes.map((m) => (m.rol === "asistente" ? { rol: m.rol, texto: m.texto, llamadas: m.llamadas } : m)),
    };
    try {
      const r = await postJson<{ texto?: string; llamadas?: RespuestaLlm["llamadas"] }>(`${this.baseUrl}/completar`, cuerpo, {
        timeoutMs,
        codigoError: "LLM_NO_DISPONIBLE",
      });
      return { texto: r.texto ?? "", llamadas: r.llamadas ?? [] };
    } catch (err) {
      const timeout = (err as { detalle?: { motivo?: string } }).detalle?.motivo === "TIMEOUT";
      throw new LlmNoDisponible(timeout ? "TIMEOUT" : "ERROR_PROVEEDOR");
    }
  }
}
