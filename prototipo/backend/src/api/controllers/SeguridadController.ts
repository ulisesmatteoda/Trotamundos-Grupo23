// /api/correo/conexion (CON-02, QA-04c) y compartición de itinerarios (QA-04b, ADR-010).
import { Request, Response } from "express";
import { config } from "../../config";
import { CompartirService } from "../../domain/CompartirService";
import { ConexionCorreoService } from "../../domain/ConexionCorreoService";
import { Sesion } from "../../security/AuthService";
import { usuarioDe } from "../../gateway/autenticacion";
import { viajeDto } from "../dto";
import { Compartido } from "../../persistence/CompartidoRepository";

const sesionDe = (res: Response) => res.locals.sesion as Sesion;

export async function estadoCorreo(_req: Request, res: Response): Promise<void> {
  const estado = await ConexionCorreoService.estado(usuarioDe(res));
  res.json({ ...estado, urlAutorizacion: config.correoAutorizacionUrl });
}

export async function conectarCorreo(req: Request, res: Response): Promise<void> {
  const { proveedor, codigo, redirectUri } = req.body ?? {};
  res.status(201).json(await ConexionCorreoService.conectar(usuarioDe(res), proveedor, codigo, redirectUri));
}

export async function desconectarCorreo(_req: Request, res: Response): Promise<void> {
  await ConexionCorreoService.desconectar(usuarioDe(res));
  res.status(204).end();
}

const compartidoDto = (c: Compartido) => ({
  id: c.id,
  viajeId: c.viajeId,
  enlaceId: c.enlaceId,
  designados: c.designados,
  estado: c.estado,
  publicacion: c.publicacion,
});

export async function compartirViaje(req: Request, res: Response): Promise<void> {
  const { designados, redSocial, mensaje } = req.body ?? {};
  const c = await CompartirService.compartir(sesionDe(res), req.params.viajeId, designados, redSocial, mensaje);
  res.status(201).json(compartidoDto(c));
}

export async function listarCompartidos(req: Request, res: Response): Promise<void> {
  res.json((await CompartirService.listar(sesionDe(res), req.params.viajeId)).map(compartidoDto));
}

export async function verCompartido(req: Request, res: Response): Promise<void> {
  const { viaje, compartidoPor } = await CompartirService.ver(sesionDe(res), req.params.enlaceId, req.ip);
  res.json({ ...viajeDto(viaje), compartidoPor });
}

export async function revocarCompartido(req: Request, res: Response): Promise<void> {
  await CompartirService.revocar(sesionDe(res), req.params.enlaceId);
  res.status(204).end();
}

// GET /api/integraciones/redes
export async function listarRedes(_req: Request, res: Response): Promise<void> {
  res.json(CompartirService.redesDisponibles());
}
