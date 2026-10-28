// API Gateway (ADR-001): único punto de entrada al backend, bajo /api.
// Las rutas públicas se declaran antes de requerirJwt; todo lo demás exige JWT (ADR-005).
import { Router } from "express";
import { health } from "../api/controllers/HealthController";
import { login } from "../api/controllers/AuthController";
import * as viajes from "../api/controllers/ViajesController";
import * as integraciones from "../api/controllers/IntegracionesController";
import * as whitelist from "../api/controllers/WhitelistController";
import * as seguridad from "../api/controllers/SeguridadController";
import { conErrores, manejarErrores } from "../api/manejoErrores";
import { requerirJwt } from "./autenticacion";
import { requerirSecretoWebhook } from "./webhook";

export function crearGateway(): Router {
  const gateway = Router();

  // Rutas públicas
  gateway.get("/health", health);
  gateway.post("/auth/login", conErrores(login));

  // Webhooks de sistemas externos (secreto compartido, sin JWT de usuario)
  gateway.post("/ingesta/email", requerirSecretoWebhook, conErrores(integraciones.ingestaEmail));
  gateway.post("/integraciones/agencias/:proveedor/webhook", requerirSecretoWebhook, conErrores(integraciones.webhookAgencia));

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

  gateway.get("/whitelist", conErrores(whitelist.listar));
  gateway.post("/whitelist", conErrores(whitelist.agregar));
  gateway.delete("/whitelist/:remitenteId", conErrores(whitelist.eliminar));

  gateway.get("/correo/conexion", conErrores(seguridad.estadoCorreo));
  gateway.post("/correo/conexion", conErrores(seguridad.conectarCorreo));
  gateway.delete("/correo/conexion", conErrores(seguridad.desconectarCorreo));

  gateway.post("/viajes/:viajeId/compartir", conErrores(seguridad.compartirViaje));
  gateway.get("/viajes/:viajeId/compartidos", conErrores(seguridad.listarCompartidos));
  gateway.get("/compartidos/:enlaceId", conErrores(seguridad.verCompartido));
  gateway.delete("/compartidos/:enlaceId", conErrores(seguridad.revocarCompartido));

  gateway.get("/integraciones/agencias", conErrores(integraciones.listarAgencias));
  gateway.post("/integraciones/agencias/:proveedor/sincronizar", conErrores(integraciones.sincronizarAgencia));

  gateway.use((_req, res) => {
    res.status(404).json({ codigo: "RUTA_NO_ENCONTRADA" });
  });
  gateway.use(manejarErrores);
  return gateway;
}
