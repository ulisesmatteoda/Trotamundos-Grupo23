// Autenticación de los webhooks entrantes (proveedor de correo y agencias) en el API Gateway.
// No usan JWT de usuario: se identifican con un secreto compartido (X-Webhook-Secret).
import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { ErrorDominio } from "../domain/errores";

const esperado = Buffer.from(config.webhookSecret);

export function requerirSecretoWebhook(req: Request, _res: Response, next: NextFunction): void {
  const recibido = Buffer.from(req.header("x-webhook-secret") ?? "");
  const valido = recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
  next(valido ? undefined : new ErrorDominio("WEBHOOK_NO_AUTORIZADO", 401));
}
