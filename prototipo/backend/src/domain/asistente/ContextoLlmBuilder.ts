// ContextoLlmBuilder (ADR-012, QA-04f): única forma en que datos del dominio llegan al LLM.
//  - Lista blanca de campos: nada de precio, dirección, email, tokens ni contenidos de correos.
//  - Fechas en hora local de cada reserva, con su zona (ADR-008): el modelo no hace aritmética
//    de zonas horarias.
//  - Textos que pueden venir de fuentes externas o del usuario (títulos, nombres) se entregan
//    en campos *_no_confiable: son datos, nunca instrucciones.
import { Reserva, Viaje, rangoDelViaje } from "../modelo";

const MAX_TEXTO = 120;

// Quita caracteres de control y acota el largo: un título no puede traer un "prompt" largo.
export function textoNoConfiable(v: string | undefined | null): string | null {
  if (!v) return null;
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, MAX_TEXTO);
}

// Instante UTC → "AAAA-MM-DDTHH:MM" en la zona indicada.
export function fechaLocal(instante: Date | null | undefined, zona: string): string | null {
  if (!instante) return null;
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instante);
  const v = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}`;
}

const zonaInicio = (r: Reserva) => r.ubicacion?.zonaHoraria ?? "UTC";
const zonaFin = (r: Reserva) => r.ubicacionFin?.zonaHoraria ?? zonaInicio(r);

export const ContextoLlmBuilder = {
  reserva(r: Reserva) {
    return {
      id: r.id,
      tipo: r.tipo,
      titulo_no_confiable: textoNoConfiable(r.titulo),
      proveedor: textoNoConfiable(r.proveedor),
      codigoConfirmacion: textoNoConfiable(r.codigoConfirmacion),
      estado: r.estado,
      // MANUAL: la cargó el usuario y el asistente puede proponer reprogramarla (ADR-013).
      origen: r.origen,
      inicioLocal: fechaLocal(r.inicio, zonaInicio(r)),
      zonaHorariaInicio: zonaInicio(r),
      finLocal: fechaLocal(r.fin, zonaFin(r)),
      zonaHorariaFin: r.fin ? zonaFin(r) : null,
    };
  },

  // Resumen para listar: suficiente para ubicar viajes y reservas, sin el detalle.
  viajeResumido(v: Viaje) {
    const { inicio, fin } = rangoDelViaje(v);
    const zona = v.reservas[0] ? zonaInicio(v.reservas[0]) : "UTC";
    return {
      id: v.id,
      nombre_no_confiable: textoNoConfiable(v.nombre),
      destino_no_confiable: textoNoConfiable(v.destino),
      inicioLocal: fechaLocal(inicio, zona)?.slice(0, 10) ?? null,
      finLocal: fechaLocal(fin, zona)?.slice(0, 10) ?? null,
      reservas: v.reservas.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        titulo_no_confiable: textoNoConfiable(r.titulo),
        estado: r.estado,
        origen: r.origen,
        inicioLocal: fechaLocal(r.inicio, zonaInicio(r)),
      })),
    };
  },

  viaje(v: Viaje) {
    return {
      id: v.id,
      nombre_no_confiable: textoNoConfiable(v.nombre),
      destino_no_confiable: textoNoConfiable(v.destino),
      reservas: v.reservas.map((r) => this.reserva(r)),
    };
  },

  // Del usuario solo viaja el nombre de pila.
  nombreDePila(nombre: string | undefined): string | null {
    return textoNoConfiable(nombre?.split(/\s+/)[0]);
  },
};
