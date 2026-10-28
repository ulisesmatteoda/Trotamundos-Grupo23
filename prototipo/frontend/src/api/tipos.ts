// Tipos de los DTOs, espejo de los schemas de specs/openapi.yaml.

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  localePreferido?: string;
}

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

export interface ReservaInput {
  tipo: string;
  titulo: string;
  proveedor?: string;
  codigoConfirmacion?: string;
  inicio: string;
  fin?: string | null;
  ubicacion?: Ubicacion;
  // Lugar del fin cuando difiere del inicio: su zona se usa para mostrar el fin (QA-06d).
  ubicacionFin?: Ubicacion;
  precio?: Monto;
}

export interface Reserva extends ReservaInput {
  id: string;
  viajeId: string;
  origen: "MANUAL" | "EMAIL" | "AGENCIA";
  estado: "CONFIRMADA" | "MODIFICADA" | "CANCELADA";
  actualizadoEn: string;
}

export interface RemitenteSeguro {
  id: string;
  remitente: string;
}

export interface ResultadoSincronizacion {
  proveedor: string;
  creadas: number;
  actualizadas: number;
  canceladas: number;
}

export interface ConexionCorreo {
  conectado: boolean;
  proveedor?: string;
  casilla?: string;
  conectadoEn?: string;
  urlAutorizacion: string;
}

export interface Compartido {
  id: string;
  viajeId: string;
  enlaceId: string;
  designados: string[];
  estado: "ACTIVO" | "REVOCADO";
}

export interface ViajeInput {
  nombre: string;
  destino?: string;
}

export interface Viaje extends ViajeInput {
  id: string;
  estado: "ACTIVO" | "ARCHIVADO";
  inicio: string | null;
  fin: string | null;
  reservas: Reserva[];
}

export interface ViajeCompartido extends Viaje {
  compartidoPor: string;
}
