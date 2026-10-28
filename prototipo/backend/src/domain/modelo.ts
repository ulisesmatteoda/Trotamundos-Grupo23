// Modelo canónico del dominio. Todo lo que entra desde fuentes externas (correo, agencias)
// se traduce a estas estructuras antes de llegar al ViajeService (ADR-002).
// Las fechas son siempre instantes UTC (ADR-008).

export type EstadoViaje = "ACTIVO" | "ARCHIVADO";
export type OrigenReserva = "MANUAL" | "EMAIL" | "AGENCIA";
export type EstadoReserva = "CONFIRMADA" | "MODIFICADA" | "CANCELADA";

// Valores conocidos; el tipo es abierto para incorporar nuevos medios de transporte (QA-05a).
export const TIPOS_CONOCIDOS = ["VUELO", "HOTEL", "AUTO", "TREN", "BUS"] as const;
export type TipoReserva = string;

export interface Ubicacion {
  direccion?: string;
  lat?: number;
  lng?: number;
  zonaHoraria: string;
}

export interface Monto {
  valor: number;
  moneda: string;
}

export interface DatosReserva {
  tipo: TipoReserva;
  titulo: string;
  proveedor?: string;
  codigoConfirmacion?: string;
  inicio: Date;
  fin?: Date | null;
  ubicacion?: Ubicacion;
  precio?: Monto;
}

export interface Reserva extends DatosReserva {
  id: string;
  viajeId: string;
  origen: OrigenReserva;
  estado: EstadoReserva;
  actualizadoEn: Date;
}

export interface DatosViaje {
  nombre: string;
  destino?: string;
}

export interface Viaje extends DatosViaje {
  id: string;
  usuarioId: string;
  estado: EstadoViaje;
  reservas: Reserva[];
}

// Reserva proveniente de una fuente externa (correo o agencia), ya traducida al modelo
// canónico por la Capa de Integración (ADR-002).
export interface ReservaExterna {
  datos: DatosReserva;
  estado: EstadoReserva;
  destino?: string;
  emailCliente?: string;
}

export type ResultadoIncorporacion = "CREADA" | "ACTUALIZADA" | "CANCELADA" | "SIN_CAMBIOS" | "USUARIO_DESCONOCIDO";

// Inicio y fin del viaje se derivan de sus reservas vigentes (UC-02: agrupación por viaje).
export function rangoDelViaje(viaje: Viaje): { inicio: Date | null; fin: Date | null } {
  const vigentes = viaje.reservas.filter((r) => r.estado !== "CANCELADA");
  if (vigentes.length === 0) return { inicio: null, fin: null };
  const inicios = vigentes.map((r) => r.inicio.getTime());
  const fines = vigentes.map((r) => (r.fin ?? r.inicio).getTime());
  return { inicio: new Date(Math.min(...inicios)), fin: new Date(Math.max(...fines)) };
}
