// API Gateway (ADR-001): único punto de entrada al backend, bajo /api.
// Las rutas públicas se declaran antes de requerirJwt; todo lo demás exige JWT (ADR-005).
import { Router } from "express";
import { health } from "../api/controllers/HealthController";
import { login } from "../api/controllers/AuthController";
import * as viajes from "../api/controllers/ViajesController";
import { conErrores, manejarErrores } from "../api/manejoErrores";
import { requerirJwt } from "./autenticacion";

export function crearGateway(): Router {
  const gateway = Router();

  // Rutas públicas
  gateway.get("/health", health);
  gateway.post("/auth/login", conErrores(login));

  // Rutas protegidas
  gateway.use(requerirJwt);

  gateway.get("/viajes", conErrores(viajes.listarViajes));
  gateway.post("/viajes", conErrores(viajes.crearViaje));
  gateway.get("/viajes/:viajeId", conErrores(viajes.obtenerViaje));
  gateway.put("/viajes/:viajeId", conErrores(viajes.actualizarViaje));
  gateway.delete("/viajes/:viajeId", conErrores(viajes.eliminarViaje));
  gateway.post("/viajes/:viajeId/reservas", conErrores(viajes.agregarReserva));
  gateway.put("/reservas/:reservaId", conErrores(viajes.actualizarReserva));
  gateway.delete("/reservas/:reservaId", conErrores(viajes.eliminarReserva));

  gateway.use((_req, res) => {
    res.status(404).json({ codigo: "RUTA_NO_ENCONTRADA" });
  });
  gateway.use(manejarErrores);
  return gateway;
}
