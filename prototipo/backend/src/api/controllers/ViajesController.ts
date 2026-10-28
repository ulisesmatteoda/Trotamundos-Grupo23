// /api/viajes y /api/reservas (UC-02). Los controllers solo traducen HTTP <-> dominio;
// la lógica vive en ViajeService.
import { Request, Response } from "express";
import { ViajeService } from "../../domain/ViajeService";
import { reservaDto, viajeDto } from "../dto";
import { validarReserva, validarViaje } from "../validacion";
import { usuarioDe } from "../../gateway/autenticacion";

export async function listarViajes(req: Request, res: Response): Promise<void> {
  const archivados = req.query.archivados === "true";
  const viajes = await ViajeService.listar(usuarioDe(res), archivados);
  res.json(viajes.map(viajeDto));
}

export async function obtenerViaje(req: Request, res: Response): Promise<void> {
  res.json(viajeDto(await ViajeService.obtener(usuarioDe(res), req.params.viajeId)));
}

export async function crearViaje(req: Request, res: Response): Promise<void> {
  const viaje = await ViajeService.crear(usuarioDe(res), validarViaje(req.body));
  res.status(201).json(viajeDto(viaje));
}

export async function actualizarViaje(req: Request, res: Response): Promise<void> {
  const viaje = await ViajeService.actualizar(usuarioDe(res), req.params.viajeId, validarViaje(req.body));
  res.json(viajeDto(viaje));
}

export async function eliminarViaje(req: Request, res: Response): Promise<void> {
  await ViajeService.eliminar(usuarioDe(res), req.params.viajeId);
  res.status(204).end();
}

export async function agregarReserva(req: Request, res: Response): Promise<void> {
  const reserva = await ViajeService.agregarReserva(usuarioDe(res), req.params.viajeId, validarReserva(req.body));
  res.status(201).json(reservaDto(reserva));
}

export async function actualizarReserva(req: Request, res: Response): Promise<void> {
  const reserva = await ViajeService.actualizarReserva(usuarioDe(res), req.params.reservaId, validarReserva(req.body));
  res.json(reservaDto(reserva));
}

export async function eliminarReserva(req: Request, res: Response): Promise<void> {
  await ViajeService.eliminarReserva(usuarioDe(res), req.params.reservaId);
  res.status(204).end();
}
