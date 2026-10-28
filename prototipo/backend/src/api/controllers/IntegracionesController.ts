// Entradas de sistemas externos (webhooks) y sincronización con agencias (UC-01).
import { Request, Response } from "express";
import { ViajeService } from "../../domain/ViajeService";
import { EmailIngestionListener } from "../../integration/email/EmailIngestionListener";
import { Sesion } from "../../security/AuthService";

// POST /api/ingesta/email — responde 202 apenas el evento quedó en el Event Bus (ADR-003).
export async function ingestaEmail(req: Request, res: Response): Promise<void> {
  const correlationId = await EmailIngestionListener.recibirEmail(req.body);
  res.status(202).json({ correlationId });
}

// POST /api/integraciones/agencias/:proveedor/webhook
export async function webhookAgencia(req: Request, res: Response): Promise<void> {
  const r = await ViajeService.procesarNotificacionAgencia(req.params.proveedor, req.body);
  res.status(202).json(r);
}

// GET /api/integraciones/agencias
export async function listarAgencias(_req: Request, res: Response): Promise<void> {
  res.json(ViajeService.agenciasDisponibles());
}

// POST /api/integraciones/agencias/:proveedor/sincronizar
export async function sincronizarAgencia(req: Request, res: Response): Promise<void> {
  const sesion = res.locals.sesion as Sesion;
  res.json(await ViajeService.sincronizarConAgencia(sesion.usuarioId, sesion.email, req.params.proveedor));
}
