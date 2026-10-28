// DTOs planos que viajan hacia la Capa de Presentación (Iteración 2, Paso 5.1).
// Fechas en ISO-8601 UTC, sin textos traducidos (ADR-008).
import { Reserva, Viaje, rangoDelViaje } from "../domain/modelo";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function reservaDto(r: Reserva) {
  return {
    id: r.id,
    viajeId: r.viajeId,
    tipo: r.tipo,
    titulo: r.titulo,
    proveedor: r.proveedor,
    codigoConfirmacion: r.codigoConfirmacion,
    inicio: iso(r.inicio),
    fin: iso(r.fin),
    ubicacion: r.ubicacion,
    precio: r.precio,
    origen: r.origen,
    estado: r.estado,
    actualizadoEn: iso(r.actualizadoEn),
  };
}

export function viajeDto(v: Viaje) {
  const { inicio, fin } = rangoDelViaje(v);
  return {
    id: v.id,
    nombre: v.nombre,
    destino: v.destino,
    estado: v.estado,
    inicio: iso(inicio),
    fin: iso(fin),
    reservas: v.reservas.map(reservaDto),
  };
}
