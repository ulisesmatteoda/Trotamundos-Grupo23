// POST /api/auth/login
import { Request, Response } from "express";
import { AuthService } from "../../security/AuthService";
import { AuditoriaSeguridad } from "../../security/AuditoriaSeguridad";
import { ErrorDominio, invalido } from "../../domain/errores";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw invalido({ email: "REQUERIDO", password: "REQUERIDO" });
  }
  try {
    res.json(await AuthService.login(email, password));
  } catch (err) {
    if (err instanceof ErrorDominio && err.codigo === "CREDENCIALES_INVALIDAS") {
      await AuditoriaSeguridad.registrar("LOGIN_FALLIDO", { recurso: email, ip: req.ip });
    }
    throw err;
  }
}
