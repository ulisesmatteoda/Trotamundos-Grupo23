// Historial reciente del asistente en Redis (ADR-012, ADR-007): evita leer y descifrar la
// conversación de PostgreSQL en cada turno. Cualquier falla de Redis se trata como miss.
import { MensajeGuardado } from "../persistence/ConversacionRepository";
import { redis } from "./redisClient";

const TTL_SEGUNDOS = 30 * 60;
const clave = (usuarioId: string) => `asistente:historial:${usuarioId}`;

export const CacheConversacion = {
  async leer(usuarioId: string): Promise<MensajeGuardado[] | null> {
    try {
      const crudo = await redis.get(clave(usuarioId));
      if (!crudo) return null;
      return (JSON.parse(crudo) as any[]).map((m) => ({ ...m, creadoEn: new Date(m.creadoEn) }));
    } catch {
      return null;
    }
  },

  async guardar(usuarioId: string, mensajes: MensajeGuardado[]): Promise<void> {
    try {
      await redis.set(clave(usuarioId), JSON.stringify(mensajes), "EX", TTL_SEGUNDOS);
    } catch {
      // sin caché, el próximo turno lee de PostgreSQL
    }
  },
};
