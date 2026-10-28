// /api/reservas/:id/asistencia y /api/casos/:id (QA-03d, QA-06c; ADR-009).
import { Request, Response } from "express";
import { SoporteService } from "../../domain/SoporteService";
import { CasoSoporte } from "../../persistence/CasoSoporteRepository";
import { Sesion } from "../../security/AuthService";

const casoDto = (c: CasoSoporte) => ({
  id: c.id,
  reservaId: c.reservaId,
  agencia: c.agencia,
  estado: c.estado,
  ticketAgencia: c.ticketAgencia,
  intentos: c.intentos,
  creadoEn: c.creadoEn.toISOString(),
  actualizadoEn: c.actualizadoEn.toISOString(),
});

export async function solicitarAsistencia(req: Request, res: Response): Promise<void> {
  const caso = await SoporteService.solicitarAsistencia(res.locals.sesion as Sesion, req.params.reservaId, req.body?.descripcion);
  res.status(201).json(casoDto(caso));
}

export async function obtenerCaso(req: Request, res: Response): Promise<void> {
  res.json(casoDto(await SoporteService.obtener(res.locals.sesion as Sesion, req.params.casoId)));
}
