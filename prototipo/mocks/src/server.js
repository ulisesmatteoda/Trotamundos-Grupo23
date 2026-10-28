// Sistemas externos simulados (fuera de los límites de Trotamundos, Diagrama de Contexto - Iteración 1).
//   /booking    API de Booking (hoteles)        — formato propietario en inglés
//   /despegar   API de Despegar (vuelos)        — formato propietario en español
//   /tren       API de un operador ferroviario  — formato propietario (QA-05a)
//   /_simular   acciones que dispara el simulador web (http://localhost:4000)
// Los sistemas externos entran a Trotamundos por la puerta pública (nginx → API Gateway),
// igual que lo haría un proveedor real.
const express = require("express");
const path = require("path");
const { crearDatos } = require("./datos");
const correos = require("./correos");

const TROTAMUNDOS_URL = process.env.TROTAMUNDOS_URL ?? "http://web/api";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

let datos = crearDatos();
let bookingCaido = false;

const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ estado: "ok" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------- APIs de las agencias
app.use("/booking", (_req, res, next) => (bookingCaido ? res.status(503).json({ error: "service_unavailable" }) : next()));
app.get("/booking/api/v2/reservations", (req, res) => {
  const email = String(req.query.guest_email ?? "").toLowerCase();
  res.json({ reservations: Object.values(datos.booking).filter((r) => r.guest.email.toLowerCase() === email) });
});
app.get("/booking/api/v2/reservations/:id", (req, res) => {
  const r = datos.booking[req.params.id];
  r ? res.json(r) : res.status(404).json({ error: "not_found" });
});

app.get("/despegar/api/reservas", (req, res) => {
  const correo = String(req.query.correo ?? "").toLowerCase();
  res.json({ reservas: Object.values(datos.despegar).filter((r) => r.pasajero.correo.toLowerCase() === correo) });
});
app.get("/despegar/api/reservas/:codigo", (req, res) => {
  const r = datos.despegar[req.params.codigo];
  r ? res.json(r) : res.status(404).json({ mensaje: "Reserva inexistente" });
});

app.get("/tren/v1/bookings", (req, res) => {
  const email = String(req.query.email ?? "").toLowerCase();
  res.json({ bookings: Object.values(datos.tren).filter((b) => b.passenger_email.toLowerCase() === email) });
});
app.get("/tren/v1/bookings/:pnr", (req, res) => {
  const b = datos.tren[req.params.pnr];
  b ? res.json(b) : res.status(404).json({ error: "PNR_NOT_FOUND" });
});

// ---------------------------------------------------------------- Llamadas a Trotamundos
async function llamarTrotamundos(ruta, cuerpo) {
  const inicio = Date.now();
  try {
    const res = await fetch(`${TROTAMUNDOS_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET },
      body: JSON.stringify(cuerpo),
    });
    return { status: res.status, ms: Date.now() - inicio, respuesta: await res.json().catch(() => null) };
  } catch (err) {
    return { status: 0, ms: Date.now() - inicio, respuesta: { error: String(err) } };
  }
}

// ---------------------------------------------------------------- Simulador
const sim = express.Router();

sim.get("/correo/plantillas", (_req, res) => res.json(correos.plantillas()));

sim.post("/correo/enviar", async (req, res) => {
  const correo = correos.armar(req.body.plantilla, req.body.casilla ?? "ana@trotamundos.test", datos);
  if (!correo) return res.status(400).json({ error: "plantilla desconocida" });
  res.json({ enviado: correo, ...(await llamarTrotamundos("/ingesta/email", correo)) });
});

// Ráfaga de correos para ver el reparto entre workers (ADR-006).
sim.post("/correo/rafaga", async (req, res) => {
  const cantidad = Math.min(Number(req.body.cantidad ?? 12), 100);
  const resultados = await Promise.all(
    Array.from({ length: cantidad }, (_, i) =>
      llamarTrotamundos("/ingesta/email", correos.armar("no-relacionado", req.body.casilla ?? "ana@trotamundos.test", datos, i + 1)),
    ),
  );
  res.json({ enviados: cantidad, aceptados: resultados.filter((r) => r.status === 202).length, msMaximo: Math.max(...resultados.map((r) => r.ms)) });
});

const masHoras = (iso, horas) => new Date(new Date(iso).getTime() + horas * 3600_000).toISOString();

sim.post("/booking/modificar", async (_req, res) => {
  const r = datos.booking["BK-60311"];
  r.check_out = masHoras(r.check_out, 24);
  r.status = "modified";
  res.json(await llamarTrotamundos("/integraciones/agencias/booking/webhook", { event_type: "reservation.modified", reservation_id: r.reservation_id }));
});

sim.post("/booking/cancelar", async (_req, res) => {
  const r = datos.booking["BK-60311"];
  r.status = "cancelled";
  res.json(await llamarTrotamundos("/integraciones/agencias/booking/webhook", { event_type: "reservation.cancelled", reservation_id: r.reservation_id }));
});

sim.post("/booking/caida", (req, res) => {
  bookingCaido = Boolean(req.body.activa);
  res.json({ bookingCaido });
});

sim.post("/despegar/cambio-horario", async (_req, res) => {
  const r = datos.despegar["DSP-90211"];
  r.vuelo.salida = correos.sumarHorasTexto(r.vuelo.salida, 2);
  r.vuelo.llegada = correos.sumarHorasTexto(r.vuelo.llegada, 2);
  r.estado = "REPROGRAMADA";
  res.json(await llamarTrotamundos("/integraciones/agencias/despegar/webhook", { codigoReserva: r.codigoReserva, novedad: "CAMBIO_HORARIO" }));
});

sim.post("/tren/cambio", async (_req, res) => {
  const b = datos.tren["CP-4410"];
  b.journey.departure_utc = masHoras(b.journey.departure_utc, 1);
  b.journey.arrival_utc = masHoras(b.journey.arrival_utc, 1);
  b.state = "CHANGED";
  res.json(await llamarTrotamundos("/integraciones/agencias/tren/webhook", { pnr: b.pnr, type: "BOOKING_CHANGED" }));
});

sim.post("/restablecer", (_req, res) => {
  datos = crearDatos();
  bookingCaido = false;
  res.json({ ok: true });
});

app.use("/_simular", sim);

const puerto = Number(process.env.PORT ?? 4000);
app.listen(puerto, () => console.log(`[mocks] escuchando en :${puerto}`));
