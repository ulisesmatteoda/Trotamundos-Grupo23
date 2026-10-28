// Proceso API: API Gateway + Lógica de Negocio sincrónica (Iteración 1, capas 2 y 3).
import express from "express";
import { config } from "./config";
import { crearGateway } from "./gateway/router";
import { manejarErrores } from "./api/manejoErrores";
import { migrar } from "./persistence/migraciones";
import { sembrarDemo } from "./persistence/seed";

async function iniciar(): Promise<void> {
  await migrar();
  if (config.seedDemo) await sembrarDemo();

  const app = express();
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
