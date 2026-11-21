// Límite de mensajes al asistente por usuario (ADR-014, QA-07c): acota el costo y el abuso del
// LLM. Contador por minuto en Redis, compartido por todas las réplicas. Lo que excede recibe
// 429 al instante, con la derivación a la agencia como alternativa (no depende del LLM).
// Si Redis no responde, no se limita: el bulkhead y el circuit breaker siguen protegiendo.
import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { redis } from "../cache/redisClient";
import { usuarioDe } from "./autenticacion";

export async function limitarMensajesAsistente(_req: Request, res: Response, next: NextFunction): Promise<void> {
  const minuto = Math.floor(Date.now() / 60_000);
  const clave = `asistente:limite:${usuarioDe(res)}:${minuto}`;
  let cantidad = 0;
  try {
    cantidad = await redis.incr(clave);
    if (cantidad === 1) await redis.expire(clave, 60);
  } catch {
    next();
    return;
  }
  if (cantidad > config.asistenteMensajesPorMinuto) {
    res.set("Retry-After", String(60 - (Math.floor(Date.now() / 1000) % 60)));
    res.status(429).json({
      codigo: "LIMITE_MENSAJES",
      detalle: { limitePorMinuto: config.asistenteMensajesPorMinuto, accionSugerida: { tipo: "DERIVAR_A_AGENCIA" } },
    });
    return;
  }
  next();
}
