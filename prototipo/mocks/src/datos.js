// Reservas que cada proveedor externo tiene para los clientes de la demo, en su formato propietario.
// Las fechas son relativas a "hoy": un viaje a Lisboa dentro de ~35 días y el hotel de Madrid
// que Ana ya cargó a mano (mismo código BK-55120, para mostrar que no se duplica).

const DIA = 24 * 3600_000;

// Fecha UTC a `dias` de hoy, a la hora UTC indicada
function utc(dias, hora, minuto = 0) {
  const d = new Date(Date.now() + dias * DIA);
  d.setUTCHours(hora, minuto, 0, 0);
  return d;
}

// "dd/mm/aaaa hh:mm" (hora local del aeropuerto, formato Despegar). La hora se fija a mano.
function textoDespegar(dias, hora, minuto) {
  const d = utc(dias, 12);
  const dos = (n) => String(n).padStart(2, "0");
  return `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${dos(hora)}:${dos(minuto)}`;
}

function crearDatos() {
  const ana = { email: "ana@trotamundos.test", name: "Ana" };
  return {
    booking: {
      "BK-55120": {
        reservation_id: "BK-55120",
        status: "confirmed",
        guest: ana,
        property: {
          name: "Hotel Gran Vía",
          address: "Gran Vía 25",
          city: "Madrid",
          country: "España",
          timezone: "Europe/Madrid",
          location: { latitude: 40.4203, longitude: -3.7058 },
        },
        check_in: utc(21, 14).toISOString(),
        check_out: utc(25, 10).toISOString(),
        total_price: { amount_minor: 48000, currency: "EUR" },
      },
      "BK-60311": {
        reservation_id: "BK-60311",
        status: "confirmed",
        guest: ana,
        property: {
          name: "Hotel Lisboa Plaza",
          address: "Travessa do Salitre 7",
          city: "Lisboa",
          country: "Portugal",
          timezone: "Europe/Lisbon",
          location: { latitude: 38.7197, longitude: -9.1453 },
        },
        check_in: utc(36, 15).toISOString(),
        check_out: utc(40, 11).toISOString(),
        total_price: { amount_minor: 52000, currency: "EUR" },
      },
    },
    despegar: {
      "DSP-90211": {
        codigoReserva: "DSP-90211",
        estado: "EMITIDA",
        pasajero: { correo: ana.email, nombre: "Ana" },
        vuelo: {
          aerolinea: "TAP",
          numero: "TP122",
          origen: { iata: "EZE", ciudad: "Buenos Aires", pais: "Argentina", zonaHoraria: "America/Argentina/Buenos_Aires" },
          destino: { iata: "LIS", ciudad: "Lisboa", pais: "Portugal", zonaHoraria: "Europe/Lisbon" },
          salida: textoDespegar(35, 23, 40),
          llegada: textoDespegar(36, 15, 10),
        },
        tarifa: { total: "1.380,50", moneda: "USD" },
      },
    },
  };
}

module.exports = { crearDatos };
