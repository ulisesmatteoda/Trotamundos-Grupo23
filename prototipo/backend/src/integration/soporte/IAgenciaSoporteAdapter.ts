// Contrato del ACL para la agencia preferida (ADR-009, Iteración 5 — Vista de Módulos).
// Separado de IAgenciaAdapter (reservas): no toda agencia de reservas ofrece soporte, ni viceversa.

// Contexto completo del caso: la agencia recibe el 100% de los datos de la reserva,
// sin que el viajero tenga que volver a cargarlos (QA-06c).
export interface ContextoCasoDTO {
  casoId: string; // también es la clave de idempotencia ante la agencia
  descripcion: string | null;
  viajero: { nombre: string; email: string };
  viaje: { nombre: string; destino?: string };
  reserva: {
    tipo: string;
    titulo: string;
    proveedor?: string;
    codigoConfirmacion?: string;
    estado: string;
    inicio: string;
    fin: string | null;
    zonaHorariaInicio?: string;
    zonaHorariaFin?: string;
    direccion?: string;
    precio?: { valor: number; moneda: string };
  };
}

export interface TicketAgencia {
  ticket: string;
}

export interface IAgenciaSoporteAdapter {
  readonly nombre: string;
  derivarCaso(contexto: ContextoCasoDTO, timeoutMs: number): Promise<TicketAgencia>;
}
