// Adaptador de Despegar (vuelos). Formato propietario: español, horas locales sin offset
// en formato "dd/mm/aaaa hh:mm" y montos como texto con coma decimal.
import { ErrorDominio } from "../../domain/errores";
import { EstadoReserva, ReservaExterna } from "../../domain/modelo";
import { IAgenciaAdapter } from "../IAgenciaAdapter";
import { getJson } from "../http";
import { horaLocalAUtc } from "../zonaHoraria";

interface Aeropuerto {
  iata: string;
  ciudad: string;
  pais: string;
  zonaHoraria: string;
}

interface DespegarReserva {
  codigoReserva: string;
  estado: "EMITIDA" | "REPROGRAMADA" | "ANULADA";
  pasajero: { correo: string; nombre: string };
  vuelo: { aerolinea: string; numero: string; origen: Aeropuerto; destino: Aeropuerto; salida: string; llegada: string };
  tarifa?: { total: string; moneda: string };
}

const ESTADOS: Record<DespegarReserva["estado"], EstadoReserva> = {
  EMITIDA: "CONFIRMADA",
  REPROGRAMADA: "MODIFICADA",
  ANULADA: "CANCELADA",
};

// "01/12/2026 23:40" en la zona del aeropuerto → instante UTC
function horaDespegar(texto: string, zona: string): Date {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(texto);
  if (!m) throw new ErrorDominio("FORMATO_EXTERNO_INVALIDO", 502, { campo: "vuelo.salida/llegada" });
  const [, dd, mm, aaaa, hh, min] = m.map(Number);
  return horaLocalAUtc(aaaa, mm, dd, hh, min, zona);
}

function traducir(r: DespegarReserva): ReservaExterna {
  const v = r.vuelo;
  return {
    emailCliente: r.pasajero.correo,
    estado: ESTADOS[r.estado],
    destino: `${v.destino.ciudad}, ${v.destino.pais}`,
    datos: {
      tipo: "VUELO",
      titulo: `${v.origen.iata} → ${v.destino.iata} · ${v.aerolinea} ${v.numero}`,
      proveedor: "Despegar",
      codigoConfirmacion: r.codigoReserva,
      inicio: horaDespegar(v.salida, v.origen.zonaHoraria),
      fin: horaDespegar(v.llegada, v.destino.zonaHoraria),
      ubicacion: { direccion: `Aeropuerto ${v.origen.iata}, ${v.origen.ciudad}`, zonaHoraria: v.origen.zonaHoraria },
      ubicacionFin: { direccion: `Aeropuerto ${v.destino.iata}, ${v.destino.ciudad}`, zonaHoraria: v.destino.zonaHoraria },
      precio: r.tarifa ? { valor: Number(r.tarifa.total.replace(/\./g, "").replace(",", ".")), moneda: r.tarifa.moneda } : undefined,
    },
  };
}

export class DespegarAdapter implements IAgenciaAdapter {
  readonly nombre = "despegar";

  constructor(private readonly baseUrl: string) {}

  // Webhook: { "codigoReserva": "DSP-1", "novedad": "CAMBIO_HORARIO" }
  traducirNotificacion(payload: any): string {
    if (typeof payload?.codigoReserva !== "string") throw new ErrorDominio("NOTIFICACION_INVALIDA", 400);
    return payload.codigoReserva;
  }

  async obtenerDetallesReserva(referencia: string): Promise<ReservaExterna> {
    return traducir(await getJson<DespegarReserva>(`${this.baseUrl}/api/reservas/${encodeURIComponent(referencia)}`));
  }

  async sincronizarItinerario(emailCliente: string): Promise<ReservaExterna[]> {
    const { reservas } = await getJson<{ reservas: DespegarReserva[] }>(
      `${this.baseUrl}/api/reservas?correo=${encodeURIComponent(emailCliente)}`,
    );
    return reservas.map(traducir);
  }
}
