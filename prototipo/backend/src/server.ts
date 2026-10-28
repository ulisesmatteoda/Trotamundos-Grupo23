// Proceso API: API Gateway + Lógica de Negocio sincrónica (Iteración 1, capas 2 y 3).
import express from "express";
import os from "os";
import { config } from "./config";
import { crearGateway } from "./gateway/router";
import { manejarErrores } from "./api/manejoErrores";
import { migrar } from "./persistence/migraciones";
import { sembrarDemo } from "./persistence/seed";
import { ViajeService } from "./domain/ViajeService";
import { adaptadoresDeAgencias, adaptadoresDeRedes, adaptadoresDeSoporte } from "./integration/registroAgencias";
import { CompartirService } from "./domain/CompartirService";
import { SoporteService } from "./domain/SoporteService";
import { ConexionCorreoService } from "./domain/ConexionCorreoService";
import { GmailOAuthAdapter } from "./integration/email/GmailOAuthAdapter";

async function iniciar(): Promise<void> {
  await migrar();
  if (config.seedDemo) await sembrarDemo();

  // Raíz de composición: el core recibe los adaptadores, nunca los importa (ADR-002).
  ViajeService.configurarAgencias(adaptadoresDeAgencias());
  CompartirService.configurarRedes(adaptadoresDeRedes());
  SoporteService.configurarAgencias(adaptadoresDeSoporte());
  ConexionCorreoService.configurarProveedores([
    new GmailOAuthAdapter(config.correoOauthUrl, config.correoClientId, config.correoClientSecret),
  ]);

  const app = express();
  // Detrás de nginx: la IP real del cliente viene en X-Forwarded-For (para la auditoría).
  app.set("trust proxy", true);
  // Qué réplica atendió cada request: permite ver el balanceo y el failover (ADR-006).
  app.use((_req, res, next) => {
    res.set("X-Instancia", os.hostname());
    next();
  });
  app.use(express.json());
  app.use("/api", crearGateway());
  // Errores previos al Gateway (ej. JSON mal formado) también respetan el contrato.
  app.use(manejarErrores);

  app.listen(config.puerto, () => {
    console.log(`[api] escuchando en :${config.puerto}`);
  });
}

iniciar().catch((err) => {
  console.error("[api] no se pudo iniciar", err);
  process.exit(1);
});
