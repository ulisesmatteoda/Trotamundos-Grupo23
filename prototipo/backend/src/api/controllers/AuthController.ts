// POST /api/auth/login
import { Request, Response } from "express";
import { AuthService } from "../../security/AuthService";
import { invalido } from "../../domain/errores";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw invalido({ email: "REQUERIDO", password: "REQUERIDO" });
  }
  res.json(await AuthService.login(email, password));
}
