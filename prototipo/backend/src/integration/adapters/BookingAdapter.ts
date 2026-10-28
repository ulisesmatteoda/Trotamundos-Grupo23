// Adaptador de Booking (hoteles). Formato propietario: inglés, fechas ISO con offset y
// precios en unidades menores (centavos).
import { ErrorDominio } from "../../domain/errores";
import { EstadoReserva, ReservaExterna } from "../../domain/modelo";
import { IAgenciaAdapter } from "../IAgenciaAdapter";
import { getJson } from "../http";

interface BookingReservation {
  reservation_id: string;
  status: "confirmed" | "modified" | "cancelled";
  guest: { email: string; name: string };
  property: {
    name: string;
    address: string;
    city: string;
    country: string;
    timezone: string;
    location?: { latitude: number; longitude: number };
  };
  check_in: string;
  check_out: string;
  total_price?: { amount_minor: number; currency: string };
}

const ESTADOS: Record<BookingReservation["status"], EstadoReserva> = {
  confirmed: "CONFIRMADA",
  modified: "MODIFICADA",
  cancelled: "CANCELADA",
};

function traducir(r: BookingReservation): ReservaExterna {
  const p = r.property;
  return {
    emailCliente: r.guest.email,
    estado: ESTADOS[r.status],
    destino: `${p.city}, ${p.country}`,
    datos: {
      tipo: "HOTEL",
      titulo: p.name,
      proveedor: "Booking",
      codigoConfirmacion: r.reservation_id,
      inicio: new Date(r.check_in),
      fin: new Date(r.check_out),
      ubicacion: {
        direccion: `${p.address}, ${p.city}`,
        lat: p.location?.latitude,
        lng: p.location?.longitude,
        zonaHoraria: p.timezone,
      },
      precio: r.total_price ? { valor: r.total_price.amount_minor / 100, moneda: r.total_price.currency } : undefined,
    },
  };
}

export class BookingAdapter implements IAgenciaAdapter {
  readonly nombre = "booking";

  constructor(private readonly baseUrl: string) {}

  // Webhook: { "event_type": "reservation.modified", "reservation_id": "BK-123" }
  traducirNotificacion(payload: any): string {
    if (typeof payload?.reservation_id !== "string") throw new ErrorDominio("NOTIFICACION_INVALIDA", 400);
    return payload.reservation_id;
  }

  async obtenerDetallesReserva(referencia: string): Promise<ReservaExterna> {
    const r = await getJson<BookingReservation>(`${this.baseUrl}/api/v2/reservations/${encodeURIComponent(referencia)}`);
    return traducir(r);
  }

  async sincronizarItinerario(emailCliente: string): Promise<ReservaExterna[]> {
    const { reservations } = await getJson<{ reservations: BookingReservation[] }>(
      `${this.baseUrl}/api/v2/reservations?guest_email=${encodeURIComponent(emailCliente)}`,
    );
    return reservations.map(traducir);
  }
}
