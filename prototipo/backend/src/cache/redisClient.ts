// Redis In-Memory Cache (ADR-007). El Cache-Aside se implementa en la Fase 3.
import Redis from "ioredis";
import { config } from "../config";

export const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1 });

export async function pingRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
