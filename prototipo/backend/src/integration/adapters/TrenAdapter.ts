// Adaptador de un operador ferroviario (QA-05a: incorporación de un nuevo medio de transporte).
// Agregarlo requirió solo este archivo y una línea en registroAgencias.ts: el core
// (ViajeService, modelo, base de datos) no se modificó.
import { ErrorDominio } from "../../domain/errores";
import { EstadoReserva, ReservaExterna } from "../../domain/modelo";
import { IAgenciaAdapter } from "../IAgenciaAdapter";
import { getJson } from "../http";

interface RailBooking {
  pnr: string;
  state: "BOOKED" | "CHANGED" | "CANCELLED";
  passenger_email: string;
  operator: string;
  journey: { from: string; to: string; to_city: string; country: string; tz: string; departure_utc: string; arrival_utc: string };
  fare?: { value: number; ccy: string };
}

const ESTADOS: Record<RailBooking["state"], EstadoReserva> = {
  BOOKED: "CONFIRMADA",
  CHANGED: "MODIFICADA",
  CANCELLED: "CANCELADA",
};

function traducir(b: RailBooking): ReservaExterna {
  const j = b.journey;
  return {
    emailCliente: b.passenger_email,
    estado: ESTADOS[b.state],
    destino: `${j.to_city}, ${j.country}`,
    datos: {
      tipo: "TREN",
      titulo: `${j.from} → ${j.to}`,
      proveedor: b.operator,
      codigoConfirmacion: b.pnr,
      inicio: new Date(j.departure_utc),
      fin: new Date(j.arrival_utc),
      ubicacion: { direccion: j.from, zonaHoraria: j.tz },
      ubicacionFin: { direccion: j.to, zonaHoraria: j.tz },
      precio: b.fare ? { valor: b.fare.value, moneda: b.fare.ccy } : undefined,
    },
  };
}

export class TrenAdapter implements IAgenciaAdapter {
  readonly nombre = "tren";

  constructor(private readonly baseUrl: string) {}

  // Webhook: { "pnr": "CP-4410", "type": "BOOKING_CHANGED" }
  traducirNotificacion(payload: any): string {
    if (typeof payload?.pnr !== "string") throw new ErrorDominio("NOTIFICACION_INVALIDA", 400);
    return payload.pnr;
  }

  async obtenerDetallesReserva(referencia: string): Promise<ReservaExterna> {
    return traducir(await getJson<RailBooking>(`${this.baseUrl}/v1/bookings/${encodeURIComponent(referencia)}`));
  }

  async sincronizarItinerario(emailCliente: string): Promise<ReservaExterna[]> {
    const { bookings } = await getJson<{ bookings: RailBooking[] }>(
      `${this.baseUrl}/v1/bookings?email=${encodeURIComponent(emailCliente)}`,
    );
    return bookings.map(traducir);
  }
}
