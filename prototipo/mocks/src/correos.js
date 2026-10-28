// Proveedor de correo simulado: arma correos de confirmación (y de los otros tipos) que
// después se envían por push al webhook de ingesta de Trotamundos.

const dos = (n) => String(n).padStart(2, "0");

// Instante ISO → "aaaa-mm-dd hh:mm" en la zona indicada (hora local del lugar)
function horaLocal(iso, zona) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

// "dd/mm/aaaa hh:mm" + horas (formato Despegar)
function sumarHorasTexto(texto, horas) {
  const [, dd, mm, aaaa, hh, min] = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(texto).map(Number);
  const d = new Date(Date.UTC(aaaa, mm - 1, dd, hh + horas, min));
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

// "dd/mm/aaaa hh:mm" → "aaaa-mm-dd hh:mm"
const despegarAIso = (t) => t.replace(/^(\d{2})\/(\d{2})\/(\d{4}) /, "$3-$2-$1 ");

function bloqueHotel(r, estado, corrimientoDias = 0) {
  const zona = r.property.timezone;
  const mover = (iso) => new Date(new Date(iso).getTime() + corrimientoDias * 86_400_000).toISOString();
  return [
    "Tipo: HOTEL",
    `Reserva: ${r.property.name}`,
    "Proveedor: Booking",
    `Código: ${r.reservation_id}`,
    `Desde: ${horaLocal(mover(r.check_in), zona)}`,
    `Hasta: ${horaLocal(mover(r.check_out), zona)}`,
    `Zona horaria: ${zona}`,
    `Dirección: ${r.property.address}, ${r.property.city}`,
    `Destino: ${r.property.city}, ${r.property.country}`,
    `Precio: ${(r.total_price.amount_minor / 100).toFixed(2)} ${r.total_price.currency}`,
    `Estado: ${estado}`,
  ].join("\n");
}

const PLANTILLAS = {
  "confirmacion-hotel": {
    descripcion: "Booking confirma el hotel de Lisboa (BK-60311)",
    armar: (d) => ({
      remitente: "reservas@booking.com",
      asunto: "Tu reserva en Hotel Lisboa Plaza está confirmada",
      cuerpo: `Hola Ana,\n\n¡Gracias por reservar con Booking!\n\n${bloqueHotel(d.booking["BK-60311"], "CONFIRMADA")}\n\nBuen viaje.`,
    }),
  },
  "confirmacion-vuelo": {
    descripcion: "Despegar confirma el vuelo EZE → LIS (DSP-90211)",
    armar: (d) => {
      const r = d.despegar["DSP-90211"];
      return {
        remitente: "notificaciones@despegar.com",
        asunto: `Confirmación de vuelo ${r.vuelo.aerolinea} ${r.vuelo.numero}`,
        cuerpo: [
          "Hola Ana, tu vuelo está confirmado.",
          "",
          "Tipo: VUELO",
          `Reserva: ${r.vuelo.origen.iata} → ${r.vuelo.destino.iata} · ${r.vuelo.aerolinea} ${r.vuelo.numero}`,
          "Proveedor: Despegar",
          `Código: ${r.codigoReserva}`,
          `Desde: ${despegarAIso(r.vuelo.salida)}`,
          `Hasta: ${despegarAIso(r.vuelo.llegada)}`,
          `Zona horaria: ${r.vuelo.origen.zonaHoraria}`,
          `Zona horaria llegada: ${r.vuelo.destino.zonaHoraria}`,
          `Dirección: Aeropuerto ${r.vuelo.origen.iata}, ${r.vuelo.origen.ciudad}`,
          `Destino: ${r.vuelo.destino.ciudad}, ${r.vuelo.destino.pais}`,
          `Precio: ${r.tarifa.total.replace(/\./g, "").replace(",", ".")} ${r.tarifa.moneda}`,
        ].join("\n"),
      };
    },
  },
  "modificacion-hotel": {
    descripcion: "Booking avisa que el hotel de Lisboa se corrió un día",
    armar: (d) => ({
      remitente: "reservas@booking.com",
      asunto: "Cambios en tu reserva BK-60311",
      cuerpo: `Hola Ana, tu reserva fue modificada.\n\n${bloqueHotel(d.booking["BK-60311"], "MODIFICADA", 1)}`,
    }),
  },
  "remitente-no-seguro": {
    descripcion: "Un remitente que NO está en la whitelist (se ignora)",
    armar: (d) => ({
      remitente: "ofertas@viajes-baratos.example",
      asunto: "¡Reserva confirmada! (no lo es)",
      cuerpo: `Promoción imperdible.\n\n${bloqueHotel(d.booking["BK-60311"], "CONFIRMADA")}`,
    }),
  },
  "no-relacionado": {
    descripcion: "Newsletter de Booking sin datos de reserva (se ignora)",
    armar: (_d, n) => ({
      remitente: "novedades@booking.com",
      asunto: `Ofertas de la semana${n ? ` #${n}` : ""}`,
      cuerpo: "Hola Ana,\n\nEstas son las ofertas de la semana. ¡No te las pierdas!\n\nEl equipo de Booking",
    }),
  },
};

function plantillas() {
  return Object.entries(PLANTILLAS).map(([id, p]) => ({ id, descripcion: p.descripcion }));
}

function armar(id, casilla, datos, n) {
  const p = PLANTILLAS[id];
  if (!p) return null;
  return { casilla, ...p.armar(datos, n), recibidoEn: new Date().toISOString() };
}

module.exports = { plantillas, armar, sumarHorasTexto };
