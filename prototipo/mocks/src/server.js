// Sistemas externos simulados (fuera de los límites de Trotamundos, Diagrama de Contexto - Iteración 1).
// Cada sistema externo se monta bajo su propio prefijo a partir de la fase que lo necesita:
//   /correo    proveedor de correo (Fase 2)
//   /booking   /despegar   APIs de agencias de reservas (Fase 2)
//   /social    red social (Fase 5)
//   /soporte   API de soporte de la agencia preferida (Fase 5)
const express = require("express");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ estado: "ok" }));

const puerto = Number(process.env.PORT ?? 4000);
app.listen(puerto, () => console.log(`[mocks] escuchando en :${puerto}`));
