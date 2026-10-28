// Contrato del Anti-Corruption Layer para proveedores de reservas (ADR-002, Iteración 2).
// ViajeService solo conoce esta interfaz; cada proveedor tiene su adaptador concreto que
// habla su API y traduce su formato propietario al modelo canónico.
import { ReservaExterna } from "../domain/modelo";

export interface IAgenciaAdapter {
  // Nombre con el que se registra el adaptador (ej. "booking"); es el {proveedor} de las rutas.
  readonly nombre: string;

  // Extrae la referencia de la reserva del webhook propietario del proveedor.
  // Lanza ErrorDominio(400) si el aviso no tiene el formato esperado.
  traducirNotificacion(payload: unknown): string;

  // Consulta a la API del proveedor el estado vigente de una reserva.
  obtenerDetallesReserva(referencia: string): Promise<ReservaExterna>;

  // Trae todas las reservas que el proveedor tiene para un cliente.
  sincronizarItinerario(emailCliente: string): Promise<ReservaExterna[]>;
}
