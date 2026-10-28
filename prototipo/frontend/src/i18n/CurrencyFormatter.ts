// Currency & Number Formatter (Iteración 4, Vista de Módulos; ADR-008).
// El backend envía { valor, moneda ISO-4217 }; el formato depende del locale del usuario.
import { Monto } from "../api/tipos";

export function formatearMoneda(monto: Monto, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: monto.moneda }).format(monto.valor);
  } catch {
    return `${monto.valor} ${monto.moneda}`;
  }
}
