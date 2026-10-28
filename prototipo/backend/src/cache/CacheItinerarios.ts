// Cache-Aside de los itinerarios consolidados de cada usuario (ADR-007, Iteración 4).
// Guarda el JSON neutro en UTC (ADR-008), por lo que la misma entrada sirve para cualquier
// idioma o región. Cualquier falla de Redis se trata como cache miss: nunca rompe una lectura.
import { config } from "../config";
import { Viaje } from "../domain/modelo";
import { redis } from "./redisClient";

const PREFIJO = "itinerario:";
const clave = (usuarioId: string, archivados: boolean) => `${PREFIJO}${usuarioId}:${archivados ? "archivados" : "activos"}`;

// JSON → modelo de dominio (las fechas vuelven a ser Date)
function revivir(v: any): Viaje {
  return {
    ...v,
    reservas: v.reservas.map((r: any) => ({
      ...r,
      inicio: new Date(r.inicio),
      fin: r.fin ? new Date(r.fin) : null,
      actualizadoEn: new Date(r.actualizadoEn),
    })),
  };
}

// Si hubo un corte, las invalidaciones de ese período se perdieron: al reconectar se
// descartan los itinerarios cacheados para no servir datos viejos.
let huboCorte = false;
redis.on("end", () => (huboCorte = true));
redis.on("close", () => (huboCorte = true));
redis.on("ready", async () => {
  if (!huboCorte) return;
  huboCorte = false;
  try {
    let cursor = "0";
    do {
      const [siguiente, claves] = await redis.scan(cursor, "MATCH", `${PREFIJO}*`, "COUNT", 200);
      if (claves.length) await redis.del(...claves);
      cursor = siguiente;
    } while (cursor !== "0");
    console.log("[cache] Redis reconectado: itinerarios cacheados descartados");
  } catch {
    // Si falla, el TTL acota cuánto puede durar un dato viejo.
  }
});

export const CacheItinerarios = {
  async leer(usuarioId: string, archivados: boolean): Promise<Viaje[] | null> {
    try {
      const json = await redis.get(clave(usuarioId, archivados));
      return json ? (JSON.parse(json) as any[]).map(revivir) : null;
    } catch {
      return null;
    }
  },

  async guardar(usuarioId: string, archivados: boolean, viajes: Viaje[]): Promise<void> {
    try {
      await redis.set(clave(usuarioId, archivados), JSON.stringify(viajes), "EX", config.cacheTtlSegundos);
    } catch {
      // Sin caché disponible: la próxima lectura vuelve a ir a la base.
    }
  },

  async invalidar(usuarioId: string): Promise<void> {
    try {
      await redis.del(clave(usuarioId, false), clave(usuarioId, true));
    } catch {
      huboCorte = true;
    }
  },
};
