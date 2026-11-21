// Decorador de ILlmAdapter con las tácticas de ADR-014 (QA-02b, QA-07c):
//  - Timeout por llamada: nunca se espera al proveedor más que el plazo indicado.
//  - Circuit breaker: tras N fallas seguidas se abre el circuito y, durante el enfriamiento,
//    se responde al instante sin invocar al proveedor. Al vencer, pasa una sola solicitud de
//    prueba (medio abierto): si anda, se cierra; si falla, se vuelve a abrir.
//    El estado vive en Redis para que todas las réplicas de la API lo compartan (nodos
//    stateless, ADR-006); si Redis no responde, cada nodo usa su propia memoria.
//  - Bulkhead: límite de llamadas concurrentes por nodo; lo que excede se rechaza al instante
//    para que el asistente no consuma los recursos del resto de la API.
import { redis } from "../../cache/redisClient";
import { EntradaLlm, ILlmAdapter, LlmNoDisponible, RespuestaLlm } from "./ILlmAdapter";

export interface OpcionesResiliencia {
  fallasParaAbrir: number;
  enfriamientoMs: number;
  maxConcurrentes: number;
}

const CLAVE_FALLAS = "llm:circuito:fallas";
const CLAVE_ABIERTO = "llm:circuito:abierto";
const CLAVE_PRUEBA = "llm:circuito:prueba";

// Estado del circuito. Implementación sobre Redis con respaldo en memoria.
class EstadoCircuito {
  private fallasLocal = 0;
  private abiertoHastaLocal = 0;
  private pruebaLocal = false;
  private huboAperturaLocal = false;

  constructor(private readonly opciones: OpcionesResiliencia) {}

  // true si la llamada puede ir al proveedor.
  async permitir(timeoutMs: number): Promise<boolean> {
    try {
      if (await redis.exists(CLAVE_ABIERTO)) return false;
      const fallas = Number((await redis.get(CLAVE_FALLAS)) ?? 0);
      if (fallas < this.opciones.fallasParaAbrir) return true;
      // Medio abierto: una sola solicitud de prueba a la vez entre todas las réplicas.
      return (await redis.set(CLAVE_PRUEBA, "1", "PX", timeoutMs + 1000, "NX")) === "OK";
    } catch {
      if (this.abiertoHastaLocal > Date.now()) return false;
      if (!this.huboAperturaLocal) return true;
      if (this.pruebaLocal) return false;
      this.pruebaLocal = true;
      return true;
    }
  }

  async registrarExito(): Promise<void> {
    this.fallasLocal = 0;
    this.huboAperturaLocal = false;
    this.pruebaLocal = false;
    try {
      await redis.del(CLAVE_FALLAS, CLAVE_PRUEBA);
    } catch {
      // sin Redis alcanza con el estado local
    }
  }

  async registrarFalla(): Promise<boolean> {
    let fallas: number;
    try {
      fallas = await redis.incr(CLAVE_FALLAS);
      await redis.pexpire(CLAVE_FALLAS, this.opciones.enfriamientoMs * 10);
      if (fallas >= this.opciones.fallasParaAbrir) {
        await redis.set(CLAVE_ABIERTO, "1", "PX", this.opciones.enfriamientoMs);
        await redis.del(CLAVE_PRUEBA);
        return true;
      }
      return false;
    } catch {
      this.pruebaLocal = false;
      fallas = ++this.fallasLocal;
      if (fallas >= this.opciones.fallasParaAbrir) {
        this.abiertoHastaLocal = Date.now() + this.opciones.enfriamientoMs;
        this.huboAperturaLocal = true;
        return true;
      }
      return false;
    }
  }
}

function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: NodeJS.Timeout;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new LlmNoDisponible("TIMEOUT")), ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador));
}

export class LlmConResiliencia implements ILlmAdapter {
  readonly nombre: string;
  private enCurso = 0;
  private readonly circuito: EstadoCircuito;

  constructor(
    private readonly interno: ILlmAdapter,
    private readonly opciones: OpcionesResiliencia,
  ) {
    this.nombre = interno.nombre;
    this.circuito = new EstadoCircuito(opciones);
  }

  async completar(entrada: EntradaLlm, timeoutMs: number): Promise<RespuestaLlm> {
    if (this.enCurso >= this.opciones.maxConcurrentes) throw new LlmNoDisponible("SATURADO");
    if (!(await this.circuito.permitir(timeoutMs))) throw new LlmNoDisponible("CIRCUITO_ABIERTO");

    this.enCurso++;
    try {
      const respuesta = await conTimeout(this.interno.completar(entrada, timeoutMs), timeoutMs);
      await this.circuito.registrarExito();
      return respuesta;
    } catch (err) {
      const falla = err instanceof LlmNoDisponible ? err : new LlmNoDisponible("ERROR_PROVEEDOR");
      if (!(err instanceof LlmNoDisponible)) console.error(`[llm ${this.nombre}] error inesperado`, err);
      if (await this.circuito.registrarFalla()) {
        console.warn(`[llm ${this.nombre}] circuito ABIERTO por ${this.opciones.enfriamientoMs} ms (${falla.motivo})`);
      }
      throw falla;
    } finally {
      this.enCurso--;
    }
  }
}
