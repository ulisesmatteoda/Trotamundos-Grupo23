// Adaptador de la API de soporte de Despegar (simulada). Formato propietario en español y
// clave de idempotencia en el header: si un reintento llega dos veces, la agencia devuelve
// el mismo ticket en lugar de abrir un caso duplicado (ADR-009).
import { postJson } from "../http";
import { ContextoCasoDTO, IAgenciaSoporteAdapter, TicketAgencia } from "./IAgenciaSoporteAdapter";

export class DespegarSoporteAdapter implements IAgenciaSoporteAdapter {
  readonly nombre = "despegar";

  constructor(private readonly baseUrl: string) {}

  async derivarCaso(c: ContextoCasoDTO, timeoutMs: number): Promise<TicketAgencia> {
    const r = c.reserva;
    const cuerpo = {
      cliente: { nombreCompleto: c.viajero.nombre, correo: c.viajero.email },
      motivo: c.descripcion ?? "Asistencia con una reserva",
      origen: "TROTAMUNDOS",
      reservaAfectada: {
        tipoProducto: r.tipo,
        descripcion: r.titulo,
        prestador: r.proveedor ?? null,
        localizador: r.codigoConfirmacion ?? null,
        estado: r.estado,
        inicioUtc: r.inicio,
        finUtc: r.fin,
        husoInicio: r.zonaHorariaInicio ?? null,
        husoFin: r.zonaHorariaFin ?? null,
        lugar: r.direccion ?? null,
        importe: r.precio ? { monto: r.precio.valor, divisa: r.precio.moneda } : null,
      },
      viaje: { nombre: c.viaje.nombre, destino: c.viaje.destino ?? null },
    };
    const res = await postJson<{ numeroTicket: string }>(`${this.baseUrl}/soporte/casos`, cuerpo, {
      headers: { "Idempotency-Key": c.casoId },
      timeoutMs,
      codigoError: "AGENCIA_SOPORTE_NO_DISPONIBLE",
    });
    return { ticket: res.numeroTicket };
  }
}
