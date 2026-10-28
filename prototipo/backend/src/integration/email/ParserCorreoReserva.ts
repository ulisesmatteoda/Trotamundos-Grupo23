// Traduce el texto de un correo de confirmación al modelo canónico (parte del ACL, ADR-002).
// Reconoce el bloque "Clave: valor" que usan los correos de confirmación:
//
//   Tipo: HOTEL
//   Reserva: Hotel Lisboa Plaza
//   Proveedor: Booking
//   Código: BK-60311
//   Desde: 2026-12-02 15:00
//   Hasta: 2026-12-06 11:00
//   Zona horaria: Europe/Lisbon
//   Dirección: Travessa do Salitre 7, Lisboa
//   Destino: Lisboa, Portugal
//   Precio: 520.00 EUR
//   Estado: CONFIRMADA
//
// Si faltan los datos mínimos (tipo, título, inicio, zona horaria) el correo no es una
// reserva y se devuelve null: se ignora sin generar errores (QA-03b).
import { EstadoReserva, ReservaExterna } from "../../domain/modelo";
import { CorreoEntrante } from "../../messaging/colas";
import { horaLocalAUtc } from "../zonaHoraria";

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function campos(cuerpo: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const linea of cuerpo.split(/\r?\n/)) {
    const m = /^\s*([A-Za-zÁÉÍÓÚáéíóúñÑ ]{2,20}):\s*(.+?)\s*$/.exec(linea);
    if (m) resultado[sinAcentos(m[1])] = m[2];
  }
  return resultado;
}

function fechaLocal(texto: string | undefined, zona: string): Date | undefined {
  const m = texto && /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(texto);
  if (!m) return undefined;
  const [, a, mes, d, h, min] = m.map(Number);
  return horaLocalAUtc(a, mes, d, h, min, zona);
}

function zonaValida(zona: string | undefined): zona is string {
  if (!zona) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

const ESTADOS: Record<string, EstadoReserva> = { confirmada: "CONFIRMADA", modificada: "MODIFICADA", cancelada: "CANCELADA" };

export function extraerDatosViaje(correo: CorreoEntrante): ReservaExterna | null {
  const c = campos(correo.cuerpo);
  const zona = c["zona horaria"];
  const tipo = c.tipo?.toUpperCase();
  if (!tipo || !/^[A-Z_]+$/.test(tipo) || !c.reserva || !zonaValida(zona)) return null;

  const inicio = fechaLocal(c.desde, zona);
  if (!inicio) return null;

  const precio = /^([\d.]+)\s+([A-Z]{3})$/.exec(c.precio ?? "");
  return {
    estado: ESTADOS[sinAcentos(c.estado ?? "")] ?? "CONFIRMADA",
    destino: c.destino,
    datos: {
      tipo,
      titulo: c.reserva,
      proveedor: c.proveedor,
      codigoConfirmacion: c.codigo,
      inicio,
      fin: fechaLocal(c.hasta, zona) ?? null,
      ubicacion: { zonaHoraria: zona, direccion: c.direccion },
      precio: precio ? { valor: Number(precio[1]), moneda: precio[2] } : undefined,
    },
  };
}
