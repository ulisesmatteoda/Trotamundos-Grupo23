// Validación centralizada del JWT en el API Gateway (ADR-005).
// Ninguna ruta protegida llega a la Lógica de Negocio sin una sesión válida.
import { NextFunction, Request, Response } from "express";
import { AuthService, Sesion } from "../security/AuthService";
import { AuditoriaSeguridad } from "../security/AuditoriaSeguridad";
import { ErrorDominio } from "../domain/errores";

export function requerirJwt(req: Request, res: Response, next: NextFunction): void {
  const [esquema, token] = (req.header("authorization") ?? "").split(" ");
  if (esquema !== "Bearer" || !token) {
    next(new ErrorDominio("TOKEN_REQUERIDO", 401));
    return;
  }
  try {
    res.locals.sesion = AuthService.validar(token);
    next();
  } catch (err) {
    // Un token presente pero inválido (firma adulterada, vencido) es un evento de seguridad (QA-04a).
    AuditoriaSeguridad.registrar("TOKEN_INVALIDO", { recurso: `${req.method} ${req.originalUrl}`, ip: req.ip }).finally(() => next(err));
  }
}

export function usuarioDe(res: Response): string {
  return (res.locals.sesion as Sesion).usuarioId;
}
