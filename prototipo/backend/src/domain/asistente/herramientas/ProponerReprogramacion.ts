// proponer_reprogramacion (propuesta de escritura, ADR-013): no modifica nada. Valida el
// cambio y crea una AccionPendiente que el dueño confirma desde la interfaz.
//  - Solo reservas MANUAL: las de proveedor se reprograman en el proveedor (se sugiere la agencia).
//  - Las fechas llegan en hora local de la reserva y el backend las pasa a UTC (ADR-008).
//    Si solo cambia el día, se mantiene la hora; si no se indica el fin, se corre con el inicio.
import { randomUUID } from "crypto";
import { config } from "../../../config";
import { Sesion } from "../../../security/AuthService";
import { horaLocalAUtc } from "../../../integration/zonaHoraria";
import { AccionPendienteRepository } from "../../../persistence/AccionPendienteRepository";
import { ViajeRepository } from "../../../persistence/ViajeRepository";
import { ViajeService } from "../../ViajeService";
import { ContextoLlmBuilder, fechaLocal, textoNoConfiable } from "../ContextoLlmBuilder";
import { IHerramienta, ResultadoHerramienta, UUID, error } from "../IHerramienta";
import { recursoNoEncontrado } from "../RegistroHerramientas";

const FECHA_LOCAL = "^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2})?$";

// "2026-12-12" o "2026-12-12T15:30" en la zona dada; sin hora, usa la hora de referencia.
function aUtc(valor: string, zona: string, horaReferencia: string): Date | null {
  const [fecha, hora = horaReferencia] = valor.split("T");
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hh > 23 || mm > 59) return null;
  const utc = horaLocalAUtc(anio, mes, dia, hh, mm, zona);
  // Rechaza fechas inexistentes (31 de febrero, etc.)
  return fechaLocal(utc, zona)?.slice(0, 10) === fecha ? utc : null;
}

export class ProponerReprogramacion implements IHerramienta {
  readonly nombre = "proponer_reprogramacion";
  readonly descripcion =
    "Propone cambiar las fechas de una reserva de origen MANUAL. No aplica el cambio: crea una propuesta que el usuario confirma con un botón en la pantalla. Las fechas van en hora local de la reserva (AAAA-MM-DD o AAAA-MM-DDTHH:MM); si se omite la hora se mantiene la actual, y si se omite el fin se corre junto con el inicio.";
  readonly tipo = "PROPUESTA_ESCRITURA" as const;
  readonly esquema = {
    type: "object" as const,
    properties: {
      reservaId: { type: "string" as const, description: "Id de la reserva.", pattern: UUID },
      nuevoInicioLocal: { type: "string" as const, description: "Nuevo inicio en hora local de la reserva.", pattern: FECHA_LOCAL },
      nuevoFinLocal: {
        type: ["string", "null"] as ("string" | "null")[],
        description: "Nuevo fin en hora local, o null para correrlo junto con el inicio.",
        pattern: FECHA_LOCAL,
      },
    },
    required: ["reservaId", "nuevoInicioLocal", "nuevoFinLocal"],
    additionalProperties: false as const,
  };

  async ejecutar(sesion: Sesion, args: Record<string, unknown>): Promise<ResultadoHerramienta> {
    const reservaId = args.reservaId as string;
    const viajeId = await ViajeRepository.viajeDeReserva(sesion.usuarioId, reservaId);
    if (!viajeId) return recursoNoEncontrado(sesion, this.nombre, "reserva", reservaId);
    const viaje = await ViajeService.obtener(sesion.usuarioId, viajeId);
    const r = viaje.reservas.find((x) => x.id === reservaId)!;

    if (r.estado === "CANCELADA") return error("RESERVA_CANCELADA");
    if (r.origen !== "MANUAL") {
      return {
        ...error("RESERVA_DE_PROVEEDOR", {
          proveedor: textoNoConfiable(r.proveedor),
          indicacion: "La reprograma el proveedor. Ofrecé derivar el caso a la agencia con derivar_a_agencia.",
        }),
        reservaFoco: r.id,
        sugerirDerivacion: true,
      };
    }

    const zonaInicio = r.ubicacion?.zonaHoraria ?? "UTC";
    const zonaFin = r.ubicacionFin?.zonaHoraria ?? zonaInicio;
    const inicioActual = fechaLocal(r.inicio, zonaInicio)!;
    const inicio = aUtc(args.nuevoInicioLocal as string, zonaInicio, inicioActual.slice(11));
    if (!inicio) return error("FECHA_INVALIDA");

    let fin: Date | null = null;
    if (typeof args.nuevoFinLocal === "string") {
      fin = aUtc(args.nuevoFinLocal, zonaFin, fechaLocal(r.fin ?? r.inicio, zonaFin)!.slice(11));
      if (!fin) return error("FECHA_INVALIDA");
    } else if (r.fin) {
      fin = new Date(r.fin.getTime() + (inicio.getTime() - r.inicio.getTime()));
    }

    if (inicio <= new Date()) return error("FECHA_EN_EL_PASADO");
    if (fin && fin < inicio) return error("FIN_ANTERIOR_AL_INICIO");
    if (inicio.getTime() === r.inicio.getTime() && (fin?.getTime() ?? null) === (r.fin?.getTime() ?? null)) return error("SIN_CAMBIOS");

    const accion = await AccionPendienteRepository.crear({
      id: randomUUID(),
      usuarioId: sesion.usuarioId,
      tipo: "REPROGRAMAR_RESERVA",
      reservaId: r.id,
      parametros: { inicio: inicio.toISOString(), fin: fin ? fin.toISOString() : null },
      versionReserva: r.actualizadoEn.toISOString(),
      expiraEn: new Date(Date.now() + config.accionPendienteTtlMs),
    });

    return {
      datos: {
        propuesta: {
          estado: "PENDIENTE_DE_CONFIRMACION",
          reserva: ContextoLlmBuilder.reserva(r),
          nuevoInicioLocal: fechaLocal(inicio, zonaInicio),
          nuevoFinLocal: fin ? fechaLocal(fin, zonaFin) : null,
          venceEnMinutos: Math.round(config.accionPendienteTtlMs / 60_000),
        },
        indicacion: "El cambio NO está aplicado. Pedile al usuario que lo confirme con el botón Confirmar de la pantalla.",
      },
      accion,
      reservaFoco: r.id,
    };
  }
}
