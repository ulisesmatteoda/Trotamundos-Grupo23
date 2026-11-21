// Proveedor de LLM simulado (Iteración 6, ADR-011): lo usa el MockLlmAdapter.
//   POST /llm/completar   recibe instrucciones, mensajes y herramientas (DTOs neutros) y
//                         devuelve texto o llamadas a herramientas, como un LLM real.
// Es un bot por reglas, determinístico y sin estado (la "versión simplificada" del bot por
// intenciones de ADR-012): decide en base al último mensaje del usuario y a los resultados de
// herramientas del turno. Responde en el idioma pedido (es, en, pt).
// Modos para validar la resiliencia (ADR-014): normal, lento (8 s, más que el timeout de 6 s)
// y caído (503). Guarda la última solicitud recibida para auditar qué datos salen (QA-04f).
const express = require("express");

let modo = "normal"; // normal | lento | caido
let solicitudes = 0;
let ultimaSolicitud = null;
let secuencia = 0;

const router = express.Router();

// ------------------------------------------------------------------ Textos
const TEXTOS = {
  es: {
    ayuda: "Puedo contarte tus viajes y reservas, proponerte cambiar la fecha de una reserva que cargaste vos, o derivar un problema a tu agencia. ¿Qué necesitás?",
    sinViajes: "No tenés viajes activos por ahora.",
    viajes: (n) => `Tenés ${n} ${n === 1 ? "viaje activo" : "viajes activos"}:`,
    reservas: (n) => `${n} ${n === 1 ? "reserva" : "reservas"}`,
    detalle: (v) => `En «${v}» tenés:`,
    cualReserva: "¿Sobre qué reserva? Decime el nombre (por ejemplo, el hotel o el vuelo).",
    cualFecha: "¿A qué fecha la querés mover? Por ejemplo: «al 15» o «al 2026-12-15».",
    propuesta: (t, a, n, z) => `Te propongo mover «${t}» del ${a} al ${n} (${z}). Todavía no está aplicado: confirmalo con el botón.`,
    deProveedor: (p) => `Esa reserva la gestiona ${p ?? "el proveedor"}, así que el cambio se hace ahí. Si querés, derivo el caso a tu agencia: tocá «Enviar a mi agencia».`,
    derivado: (a, t) => `Listo, derivé tu caso a ${a}. Número de ticket: ${t}.`,
    pendiente: (a) => `${a} no respondió a tiempo. Tu caso quedó registrado y se envía apenas responda.`,
    error: {
      FECHA_EN_EL_PASADO: "Esa fecha ya pasó. ¿A qué otra fecha la querés mover?",
      SIN_CAMBIOS: "La reserva ya está en esa fecha.",
      FECHA_INVALIDA: "No entendí la fecha. Probá con el formato AAAA-MM-DD.",
      FIN_ANTERIOR_AL_INICIO: "El fin quedaría antes del inicio. ¿Me pasás otras fechas?",
      RESERVA_CANCELADA: "Esa reserva está cancelada.",
      otro: "No encontré esa reserva entre tus viajes.",
    },
  },
  en: {
    ayuda: "I can tell you about your trips and bookings, propose a new date for a booking you added yourself, or forward a problem to your agency. What do you need?",
    sinViajes: "You have no active trips right now.",
    viajes: (n) => `You have ${n} active ${n === 1 ? "trip" : "trips"}:`,
    reservas: (n) => `${n} ${n === 1 ? "booking" : "bookings"}`,
    detalle: (v) => `In «${v}» you have:`,
    cualReserva: "Which booking? Tell me its name (for example, the hotel or the flight).",
    cualFecha: "To which date? For example: «to the 15th» or «to 2026-12-15».",
    propuesta: (t, a, n, z) => `I suggest moving «${t}» from ${a} to ${n} (${z}). It is not applied yet: confirm it with the button.`,
    deProveedor: (p) => `That booking is managed by ${p ?? "the provider"}, so the change is made there. I can forward the case to your agency: tap «Send to my agency».`,
    derivado: (a, t) => `Done, I forwarded your case to ${a}. Ticket number: ${t}.`,
    pendiente: (a) => `${a} did not answer in time. Your case is registered and will be sent as soon as they respond.`,
    error: {
      FECHA_EN_EL_PASADO: "That date is in the past. Which other date would you like?",
      SIN_CAMBIOS: "The booking is already on that date.",
      FECHA_INVALIDA: "I did not understand the date. Try the YYYY-MM-DD format.",
      FIN_ANTERIOR_AL_INICIO: "The end would be before the start. Could you give me other dates?",
      RESERVA_CANCELADA: "That booking is cancelled.",
      otro: "I could not find that booking in your trips.",
    },
  },
  pt: {
    ayuda: "Posso contar sobre suas viagens e reservas, propor mudar a data de uma reserva que você cadastrou, ou encaminhar um problema para sua agência. Do que você precisa?",
    sinViajes: "Você não tem viagens ativas no momento.",
    viajes: (n) => `Você tem ${n} ${n === 1 ? "viagem ativa" : "viagens ativas"}:`,
    reservas: (n) => `${n} ${n === 1 ? "reserva" : "reservas"}`,
    detalle: (v) => `Em «${v}» você tem:`,
    cualReserva: "Sobre qual reserva? Diga o nome (por exemplo, o hotel ou o voo).",
    cualFecha: "Para qual data? Por exemplo: «para o dia 15» ou «para 2026-12-15».",
    propuesta: (t, a, n, z) => `Proponho mudar «${t}» de ${a} para ${n} (${z}). Ainda não foi aplicado: confirme com o botão.`,
    deProveedor: (p) => `Essa reserva é gerenciada por ${p ?? "o fornecedor"}, então a mudança é feita lá. Posso encaminhar o caso para sua agência: toque em «Enviar para minha agência».`,
    derivado: (a, t) => `Pronto, encaminhei seu caso para ${a}. Número do ticket: ${t}.`,
    pendiente: (a) => `${a} não respondeu a tempo. Seu caso foi registrado e será enviado assim que responder.`,
    error: {
      FECHA_EN_EL_PASADO: "Essa data já passou. Para qual outra data?",
      SIN_CAMBIOS: "A reserva já está nessa data.",
      FECHA_INVALIDA: "Não entendi a data. Tente o formato AAAA-MM-DD.",
      FIN_ANTERIOR_AL_INICIO: "O fim ficaria antes do início. Pode me passar outras datas?",
      RESERVA_CANCELADA: "Essa reserva está cancelada.",
      otro: "Não encontrei essa reserva nas suas viagens.",
    },
  },
};

// ------------------------------------------------------------------ Interpretación
const normalizar = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const INTENCIONES = [
  ["derivar", /\b(agencia|agency|agent|humano|human|persona|person|operador|asesor|reclamo|problema|problem|cancelaron|cancelled|canceled)\b/],
  ["reprogramar", /\b(mov\w*|move|cambi\w*|change|reprogram\w*|reschedul\w*|posterg\w*|adelant\w*|mud\w*|alter\w*|remarc\w*)\b/],
  ["detalle", /\b(detalle\w*|details?|detalhes?|contame|conta|reservas? de|bookings? (in|for)|que tengo en|que hay en)\b/],
  ["listar", /\b(viajes?|trips?|viage[nm]s?|proxim\w*|next|itinerari\w*|tengo|have)\b/],
];

const TIPOS = { HOTEL: /\b(hotel|hostel|hosteria|alojamiento)\b/, VUELO: /\b(vuelo|flight|voo|avion)\b/, AUTO: /\b(auto|car|carro|alquiler)\b/, TREN: /\b(tren|train|trem)\b/, BUS: /\b(bus|micro|onibus|colectivo)\b/ };

const MESES = ["ene|jan", "feb|fev", "mar", "abr|apr", "may|mai", "jun", "jul", "ago|aug", "sep|set", "oct|out", "nov", "dic|dec|dez"];

function intencion(texto) {
  const t = normalizar(texto);
  for (const [nombre, re] of INTENCIONES) if (re.test(t)) return nombre;
  return "ayuda";
}

const palabras = (s) => normalizar(s).split(/[^a-z0-9]+/).filter((p) => p.length >= 3);

// Elige la reserva que más se parece a lo que dijo el usuario.
function elegirReserva(texto, viajes) {
  const t = normalizar(texto);
  const dichas = new Set(palabras(texto));
  let mejor = null;
  let puntajeMejor = 0;
  for (const v of viajes) {
    for (const r of v.reservas) {
      if (r.estado === "CANCELADA") continue;
      let puntaje = palabras(r.titulo_no_confiable).filter((p) => dichas.has(p)).length * 2;
      if (TIPOS[r.tipo]?.test(t)) puntaje += 2;
      puntaje += palabras(v.nombre_no_confiable).filter((p) => dichas.has(p)).length;
      if (puntaje > puntajeMejor) [mejor, puntajeMejor] = [r, puntaje];
    }
  }
  return mejor;
}

function elegirViaje(texto, viajes) {
  const dichas = new Set(palabras(texto));
  return viajes.find((v) => palabras(`${v.nombre_no_confiable} ${v.destino_no_confiable ?? ""}`).some((p) => dichas.has(p))) ?? null;
}

// Fecha pedida → "AAAA-MM-DD[THH:MM]", tomando el mes y año de la reserva si no se dicen.
function fechaPedida(texto, inicioLocal) {
  const t = normalizar(texto);
  let fecha = null;
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) fecha = iso.slice(1, 4).map(Number);
  if (!fecha) {
    const barra = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
    if (barra) fecha = [Number(barra[3] ?? inicioLocal.slice(0, 4)), Number(barra[2]), Number(barra[1])];
  }
  if (!fecha) {
    const conMes = t.match(new RegExp(`\\b(\\d{1,2})\\s*(?:de\\s+)?(${MESES.join("|")})[a-z]*\\b`));
    if (conMes) fecha = [Number(inicioLocal.slice(0, 4)), MESES.findIndex((m) => new RegExp(`^(${m})`).test(conMes[2])) + 1, Number(conMes[1])];
  }
  if (!fecha) {
    const dia = t.match(/\b(?:al|el|del|para el|to the|to|on the|the|dia|para o dia|pro dia|para)\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (dia) {
      fecha = [Number(inicioLocal.slice(0, 4)), Number(inicioLocal.slice(5, 7)), Number(dia[1])];
      // Si ese día del mes de la reserva ya pasó, se entiende el mes siguiente.
      const hoy = new Date().toISOString().slice(0, 10);
      const candidata = fecha.map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-");
      if (candidata < hoy) fecha = fecha[1] === 12 ? [fecha[0] + 1, 1, fecha[2]] : [fecha[0], fecha[1] + 1, fecha[2]];
    }
  }
  if (!fecha) return null;
  const hora = t.match(/\b(\d{1,2}):(\d{2})\b/);
  const base = `${fecha[0]}-${String(fecha[1]).padStart(2, "0")}-${String(fecha[2]).padStart(2, "0")}`;
  return hora ? `${base}T${hora[1].padStart(2, "0")}:${hora[2]}` : base;
}

// Resultados de herramientas del turno actual, por nombre de herramienta.
function resultadosDelTurno(mensajes, desde) {
  const llamadas = new Map();
  const porHerramienta = {};
  for (const m of mensajes.slice(desde)) {
    if (m.rol === "asistente") for (const l of m.llamadas ?? []) llamadas.set(l.id, l.nombre);
    if (m.rol === "resultados") {
      for (const r of m.resultados) {
        try {
          porHerramienta[llamadas.get(r.llamadaId)] = JSON.parse(r.contenido);
        } catch {
          porHerramienta[llamadas.get(r.llamadaId)] = { error: "RESULTADO_INVALIDO" };
        }
      }
    }
  }
  return porHerramienta;
}

const llamar = (nombre, argumentos) => ({ texto: "", llamadas: [{ id: `mock-${++secuencia}`, nombre, argumentos }] });
const decir = (texto) => ({ texto, llamadas: [] });
const fechaLegible = (local) => (local ? local.replace("T", " ") : "?");

function componerViajes(T, viajes) {
  if (!viajes.length) return T.sinViajes;
  const lineas = viajes.map((v) => `• ${v.nombre_no_confiable} (${v.inicioLocal ?? "?"} → ${v.finLocal ?? "?"}), ${T.reservas(v.reservas.length)}`);
  return [T.viajes(viajes.length), ...lineas].join("\n");
}

function componerViaje(T, v) {
  const lineas = v.reservas.map(
    (r) =>
      `• ${r.tipo} ${r.titulo_no_confiable}: ${fechaLegible(r.inicioLocal)}${r.finLocal ? ` → ${fechaLegible(r.finLocal)}` : ""} · ${r.estado}${r.codigoConfirmacion ? ` · #${r.codigoConfirmacion}` : ""}`,
  );
  return [T.detalle(v.nombre_no_confiable), ...lineas].join("\n");
}

function componerError(T, resultado) {
  if (resultado.error === "RESERVA_DE_PROVEEDOR") return T.deProveedor(resultado.proveedor);
  return T.error[resultado.error] ?? T.error.otro;
}

function componerCaso(T, resultado) {
  if (resultado.error) return componerError(T, resultado);
  const { estado, agencia, ticket } = resultado.caso;
  const nombre = agencia.charAt(0).toUpperCase() + agencia.slice(1);
  return estado === "DERIVADO" ? T.derivado(nombre, ticket) : T.pendiente(nombre);
}

function decidir({ idioma, mensajes }) {
  const T = TEXTOS[idioma] ?? TEXTOS.es;
  const desde = mensajes.map((m) => m.rol).lastIndexOf("usuario");
  const texto = mensajes[desde]?.texto ?? "";
  const r = resultadosDelTurno(mensajes, desde + 1);
  const quiere = intencion(texto);

  if (quiere === "ayuda") return decir(T.ayuda);
  if (!r.listar_viajes) return llamar("listar_viajes", {});
  const viajes = r.listar_viajes.viajes ?? [];

  if (quiere === "listar") return decir(componerViajes(T, viajes));

  if (quiere === "detalle") {
    if (r.consultar_viaje) return decir(r.consultar_viaje.error ? T.error.otro : componerViaje(T, r.consultar_viaje.viaje));
    const viaje = elegirViaje(texto, viajes);
    return viaje ? llamar("consultar_viaje", { viajeId: viaje.id }) : decir(componerViajes(T, viajes));
  }

  if (r.derivar_a_agencia) return decir(componerCaso(T, r.derivar_a_agencia));
  const reserva = elegirReserva(texto, viajes);

  if (quiere === "derivar") {
    if (!reserva) return decir(T.cualReserva);
    return llamar("derivar_a_agencia", { reservaId: reserva.id, resumen: texto.slice(0, 500) });
  }

  // reprogramar
  if (r.proponer_reprogramacion) {
    const p = r.proponer_reprogramacion;
    if (p.error) return decir(componerError(T, p));
    const { reserva: actual, nuevoInicioLocal } = p.propuesta;
    return decir(T.propuesta(actual.titulo_no_confiable, fechaLegible(actual.inicioLocal), fechaLegible(nuevoInicioLocal), actual.zonaHorariaInicio));
  }
  if (!reserva) return decir(T.cualReserva);
  const fecha = fechaPedida(texto, reserva.inicioLocal);
  if (!fecha) return decir(T.cualFecha);
  return llamar("proponer_reprogramacion", { reservaId: reserva.id, nuevoInicioLocal: fecha, nuevoFinLocal: null });
}

// ------------------------------------------------------------------ API
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

router.post("/llm/completar", async (req, res) => {
  solicitudes++;
  ultimaSolicitud = { recibidaEn: new Date().toISOString(), cuerpo: req.body };
  if (modo === "caido") return res.status(503).json({ error: "overloaded" });
  if (modo === "lento") await espera(8000);
  if (!Array.isArray(req.body?.mensajes)) return res.status(400).json({ error: "mensajes requerido" });
  res.json(decidir(req.body));
});

// ------------------------------------------------------------------ Para el simulador
const sim = express.Router();
sim.get("/llm/estado", (_req, res) => res.json({ modo, solicitudes, ultimaSolicitud }));
sim.post("/llm/modo", (req, res) => {
  if (!["normal", "lento", "caido"].includes(req.body.modo)) return res.status(400).json({ error: "modo inválido" });
  res.json({ modo: (modo = req.body.modo) });
});

function restablecer() {
  modo = "normal";
  solicitudes = 0;
  ultimaSolicitud = null;
}

module.exports = { router, sim, restablecer, decidir };
