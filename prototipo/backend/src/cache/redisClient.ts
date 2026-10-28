// Redis In-Memory Cache (ADR-007).
// Sin cola offline y con timeout corto: si Redis no está, los comandos fallan enseguida y el
// sistema sigue leyendo de PostgreSQL en lugar de quedar esperando (QA-02).
import Redis from "ioredis";
import { config } from "../config";

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  commandTimeout: 300,
});

// Sin este handler, ioredis loguea cada intento de reconexión como error no manejado.
redis.on("error", () => undefined);

export async function pingRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
