// Validación de los cuerpos de entrada contra los schemas de specs/openapi.yaml
// (ViajeInput, ReservaInput). Traduce el JSON a tipos del dominio.
import { DatosReserva, DatosViaje, Monto, Ubicacion } from "../domain/modelo";
import { invalido } from "../domain/errores";

type Errores = Record<string, string>;

const esTexto = (v: unknown): v is string => typeof v === "string";
const vacio = (v: unknown) => v === undefined || v === null || v === "";

function texto(body: any, campo: string, errores: Errores, { requerido = false, max = 500 } = {}): string | undefined {
  const v = body?.[campo];
  if (vacio(v)) {
    if (requerido) errores[campo] = "REQUERIDO";
    return undefined;
  }
  if (!esTexto(v) || v.trim().length === 0) errores[campo] = "TEXTO_INVALIDO";
  else if (v.length > max) errores[campo] = "DEMASIADO_LARGO";
  return esTexto(v) ? v.trim() : undefined;
}

function fecha(body: any, campo: string, errores: Errores, requerido: boolean): Date | undefined {
  const v = body?.[campo];
  if (vacio(v)) {
    if (requerido) errores[campo] = "REQUERIDO";
    return undefined;
  }
  const d = esTexto(v) ? new Date(v) : new Date(NaN);
  if (Number.isNaN(d.getTime())) errores[campo] = "FECHA_INVALIDA";
  return d;
}

export function zonaHorariaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

function ubicacion(v: any, errores: Errores, campo = "ubicacion"): Ubicacion | undefined {
  if (vacio(v)) return undefined;
  if (typeof v !== "object" || !esTexto(v.zonaHoraria) || !zonaHorariaValida(v.zonaHoraria)) {
    errores[`${campo}.zonaHoraria`] = "ZONA_HORARIA_INVALIDA";
    return undefined;
  }
  const u: Ubicacion = { zonaHoraria: v.zonaHoraria };
  if (esTexto(v.direccion) && v.direccion.trim()) u.direccion = v.direccion.trim();
  for (const eje of ["lat", "lng"] as const) {
    if (vacio(v[eje])) continue;
    if (typeof v[eje] !== "number") errores[`${campo}.${eje}`] = "NUMERO_INVALIDO";
    else u[eje] = v[eje];
  }
  return u;
}

function precio(v: any, errores: Errores): Monto | undefined {
  if (vacio(v)) return undefined;
  if (typeof v?.valor !== "number" || v.valor < 0) errores["precio.valor"] = "NUMERO_INVALIDO";
  if (!esTexto(v?.moneda) || !/^[A-Z]{3}$/.test(v.moneda)) errores["precio.moneda"] = "MONEDA_INVALIDA";
  return { valor: v?.valor, moneda: v?.moneda };
}

export function validarViaje(body: any): DatosViaje {
  const errores: Errores = {};
  const nombre = texto(body, "nombre", errores, { requerido: true, max: 120 });
  const destino = texto(body, "destino", errores, { max: 120 });
  if (Object.keys(errores).length) throw invalido(errores);
  return { nombre: nombre!, destino };
}

export function validarReserva(body: any): DatosReserva {
  const errores: Errores = {};
  const tipo = texto(body, "tipo", errores, { requerido: true, max: 30 });
  if (tipo && !/^[A-Z_]+$/.test(tipo)) errores.tipo = "TIPO_INVALIDO";
  const titulo = texto(body, "titulo", errores, { requerido: true, max: 160 });
  const proveedor = texto(body, "proveedor", errores, { max: 80 });
  const codigoConfirmacion = texto(body, "codigoConfirmacion", errores, { max: 40 });
  const inicio = fecha(body, "inicio", errores, true);
  const fin = fecha(body, "fin", errores, false);
  if (inicio && fin && !errores.inicio && !errores.fin && fin < inicio) errores.fin = "ANTERIOR_AL_INICIO";
  const u = ubicacion(body?.ubicacion, errores);
  const uFin = ubicacion(body?.ubicacionFin, errores, "ubicacionFin");
  const p = precio(body?.precio, errores);

  if (Object.keys(errores).length) throw invalido(errores);
  return { tipo: tipo!, titulo: titulo!, proveedor, codigoConfirmacion, inicio: inicio!, fin: fin ?? null, ubicacion: u, ubicacionFin: uFin, precio: p };
}
