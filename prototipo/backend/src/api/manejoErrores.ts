// Traduce errores a respuestas con el schema Error del contrato ({ codigo, detalle }).
import { NextFunction, Request, RequestHandler, Response } from "express";
import { ErrorDominio } from "../domain/errores";

// Express 4 no captura rechazos de handlers async; este wrapper los deriva al manejador de errores.
export const conErrores =
  (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    handler(req, res).catch(next);
  };

export function manejarErrores(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ErrorDominio) {
    res.status(err.status).json({ codigo: err.codigo, detalle: err.detalle });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ codigo: "JSON_INVALIDO" });
    return;
  }
  console.error("[api] error no controlado", err);
  res.status(500).json({ codigo: "ERROR_INTERNO" });
}
