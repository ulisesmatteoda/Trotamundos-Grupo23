// Regla de remitentes seguros (QA-03b). Una entrada es una dirección exacta
// ("reservas@iberia.com") o un dominio con prefijo "@" ("@booking.com").

const FORMATO = /^(@[a-z0-9.-]+\.[a-z]{2,}|[^@\s]+@[a-z0-9.-]+\.[a-z]{2,})$/i;

export const normalizarRemitente = (entrada: string) => entrada.trim().toLowerCase();

export const esEntradaValida = (entrada: string) => FORMATO.test(entrada.trim());

export function esRemitenteSeguro(remitente: string, entradas: string[]): boolean {
  const r = normalizarRemitente(remitente);
  return entradas.map(normalizarRemitente).some((e) => (e.startsWith("@") ? r.endsWith(e) : r === e));
}
