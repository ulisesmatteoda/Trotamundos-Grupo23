// Autenticación de los webhooks entrantes (proveedor de correo y agencias) en el API Gateway.
// No usan JWT de usuario: se identifican con un secreto compartido (X-Webhook-Secret).
import { timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { ErrorDominio } from "../domain/errores";
import { AuditoriaSeguridad } from "../security/AuditoriaSeguridad";

const esperado = Buffer.from(config.webhookSecret);

export function requerirSecretoWebhook(req: Request, _res: Response, next: NextFunction): void {
  const recibido = Buffer.from(req.header("x-webhook-secret") ?? "");
  if (recibido.length === esperado.length && timingSafeEqual(recibido, esperado)) {
    next();
    return;
  }
  AuditoriaSeguridad.registrar("WEBHOOK_NO_AUTORIZADO", { recurso: req.originalUrl, ip: req.ip }).finally(() =>
    next(new ErrorDominio("WEBHOOK_NO_AUTORIZADO", 401)),
  );
}
