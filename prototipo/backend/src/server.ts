// Proceso API: API Gateway + Lógica de Negocio sincrónica (Iteración 1, capas 2 y 3).
import express from "express";
import { config } from "./config";
import { crearGateway } from "./gateway/router";

const app = express();
app.use(express.json());
app.use("/api", crearGateway());

app.listen(config.puerto, () => {
  console.log(`[api] escuchando en :${config.puerto}`);
});
