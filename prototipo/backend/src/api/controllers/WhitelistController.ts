// /api/whitelist — remitentes seguros del usuario (QA-03b).
import { Request, Response } from "express";
import { RemitentesService } from "../../domain/RemitentesService";
import { usuarioDe } from "../../gateway/autenticacion";

export async function listar(_req: Request, res: Response): Promise<void> {
  res.json(await RemitentesService.listar(usuarioDe(res)));
}

export async function agregar(req: Request, res: Response): Promise<void> {
  res.status(201).json(await RemitentesService.agregar(usuarioDe(res), req.body?.remitente));
}

export async function eliminar(req: Request, res: Response): Promise<void> {
  await RemitentesService.eliminar(usuarioDe(res), req.params.remitenteId);
  res.status(204).end();
}
