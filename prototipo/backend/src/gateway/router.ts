// API Gateway (ADR-001): único punto de entrada al backend, bajo /api.
// En la Fase 1 se agrega acá la validación de JWT para todas las rutas protegidas (ADR-005).
import { Router } from "express";
import { health } from "../api/controllers/HealthController";

export function crearGateway(): Router {
  const gateway = Router();

  // Rutas públicas
  gateway.get("/health", health);

  return gateway;
}
