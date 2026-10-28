// GET /api/health — contrato en specs/openapi.yaml (schema Health).
import { Request, Response } from "express";
import os from "os";
import { pingDb } from "../../persistence/db";
import { pingRedis } from "../../cache/redisClient";
import { pingRabbit } from "../../messaging/EventBus";

const estado = (ok: boolean) => (ok ? "ok" : "error");

export async function health(_req: Request, res: Response): Promise<void> {
  const [postgres, redis, rabbitmq] = await Promise.all([pingDb(), pingRedis(), pingRabbit()]);
  const todoOk = postgres && redis && rabbitmq;

  res.status(todoOk ? 200 : 503).json({
    estado: todoOk ? "ok" : "degradado",
    instancia: os.hostname(),
    dependencias: {
      postgres: estado(postgres),
      redis: estado(redis),
      rabbitmq: estado(rabbitmq),
    },
  });
}
