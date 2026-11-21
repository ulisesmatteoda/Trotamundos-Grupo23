// /api/asistente/* (Iteración 6; ADR-012, ADR-013, ADR-014).
import { Request, Response } from "express";
import { AsistenteService, MensajeVista } from "../../domain/asistente/AsistenteService";
import { AccionPendiente } from "../../domain/asistente/AccionPendiente";
import { Sesion } from "../../security/AuthService";
import { casoDto } from "./SoporteController";
import { reservaDto } from "../dto";

const accionDto = (a: AccionPendiente) => ({
  id: a.id,
  tipo: a.tipo,
  reservaId: a.reservaId,
  nuevoInicio: a.parametros.inicio,
  nuevoFin: a.parametros.fin,
  estado: a.estado,
  expiraEn: a.expiraEn.toISOString(),
});

const mensajeDto = (m: MensajeVista) => ({
  id: m.id,
  rol: m.rol,
  texto: m.texto,
  codigo: m.codigo,
  accion: m.accion ? accionDto(m.accion) : null,
  caso: m.caso ? casoDto(m.caso) : null,
  creadoEn: m.creadoEn.toISOString(),
});

const sesionDe = (res: Response) => res.locals.sesion as Sesion;

export async function enviarMensaje(req: Request, res: Response): Promise<void> {
  const r = await AsistenteService.responder(sesionDe(res), req.body?.texto, req.body?.idioma);
  res.json({ estado: r.estado, mensajes: r.mensajes.map(mensajeDto), accionSugerida: r.accionSugerida });
}

export async function obtenerConversacion(_req: Request, res: Response): Promise<void> {
  res.json({ mensajes: (await AsistenteService.historial(sesionDe(res))).map(mensajeDto) });
}

export async function confirmarAccion(req: Request, res: Response): Promise<void> {
  const { accion, reserva } = await AsistenteService.confirmarAccion(sesionDe(res), req.params.accionId);
  res.json({ accion: accionDto(accion), reserva: reservaDto(reserva) });
}

export async function cancelarAccion(req: Request, res: Response): Promise<void> {
  res.json(accionDto(await AsistenteService.cancelarAccion(sesionDe(res), req.params.accionId)));
}
