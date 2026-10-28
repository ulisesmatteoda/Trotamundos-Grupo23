// Sistemas externos de la Iteración 5 (ADR-009):
//   /social/facebook/v19.0/me/feed   Graph API simulada (message + link)
//   /social/x/2/tweets               API v2 de X simulada (solo text, máx. 280)
//   /despegar/soporte/casos          API de soporte de la agencia preferida (Idempotency-Key)
const crypto = require("crypto");
const express = require("express");

const TOKEN_APP = process.env.SOCIAL_TOKEN_APP ?? "";

let publicaciones = [];
let redCaida = false;

const tickets = new Map(); // Idempotency-Key → ticket
let casosRecibidos = [];
let modoSoporte = "normal"; // normal | lenta | caida

const router = express.Router();

// ------------------------------------------------------------------ Redes sociales
function autorizado(req, res) {
  if ((req.header("authorization") ?? "") !== `Bearer ${TOKEN_APP}`) {
    res.status(401).json({ error: "invalid_token" });
    return false;
  }
  if (redCaida) {
    res.status(503).json({ error: "service_unavailable" });
    return false;
  }
  return true;
}

router.post("/social/facebook/v19.0/me/feed", (req, res) => {
  if (!autorizado(req, res)) return;
  if (!req.body.message || !req.body.link) return res.status(400).json({ error: { message: "message y link son obligatorios" } });
  const id = `1000${Date.now() % 100000}_${crypto.randomInt(1e6)}`;
  publicaciones.unshift({ red: "facebook", id, texto: req.body.message, enlace: req.body.link, en: new Date().toISOString() });
  res.json({ id, permalink_url: `https://www.facebook.com/${id}` });
});

router.post("/social/x/2/tweets", (req, res) => {
  if (!autorizado(req, res)) return;
  const texto = String(req.body.text ?? "");
  if (!texto || texto.length > 280 + 40) return res.status(400).json({ title: "Invalid Request", detail: "text inválido" });
  const id = String(1800000000000000000n + BigInt(crypto.randomInt(1e9)));
  publicaciones.unshift({ red: "x", id, texto, enlace: (texto.match(/https?:\/\/\S+$/) ?? [""])[0], en: new Date().toISOString() });
  res.status(201).json({ data: { id, text: texto } });
});

// ------------------------------------------------------------------ Soporte de la agencia
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

router.post("/despegar/soporte/casos", async (req, res) => {
  if (modoSoporte === "caida") return res.status(503).json({ mensaje: "Servicio no disponible" });
  if (modoSoporte === "lenta") await espera(4000); // más que el timeout de 2 s de Trotamundos

  const clave = req.header("idempotency-key");
  if (!clave) return res.status(400).json({ mensaje: "Falta Idempotency-Key" });
  const existente = tickets.get(clave);
  if (existente) return res.status(200).json({ numeroTicket: existente, duplicado: true });

  const ticket = `DSP-T-${crypto.randomInt(100000, 999999)}`;
  tickets.set(clave, ticket);
  casosRecibidos.unshift({ ticket, clave, recibidoEn: new Date().toISOString(), cuerpo: req.body });
  res.status(201).json({ numeroTicket: ticket });
});

// ------------------------------------------------------------------ Para el simulador
const sim = express.Router();
sim.get("/social/publicaciones", (_req, res) => res.json(publicaciones.slice(0, 10)));
sim.post("/social/caida", (req, res) => res.json({ redCaida: (redCaida = Boolean(req.body.activa)) }));
sim.get("/soporte/casos", (_req, res) => res.json({ modo: modoSoporte, casos: casosRecibidos.slice(0, 10) }));
sim.post("/soporte/modo", (req, res) => {
  if (!["normal", "lenta", "caida"].includes(req.body.modo)) return res.status(400).json({ error: "modo inválido" });
  res.json({ modo: (modoSoporte = req.body.modo) });
});

function restablecer() {
  publicaciones = [];
  redCaida = false;
  tickets.clear();
  casosRecibidos = [];
  modoSoporte = "normal";
}

module.exports = { router, sim, restablecer };
