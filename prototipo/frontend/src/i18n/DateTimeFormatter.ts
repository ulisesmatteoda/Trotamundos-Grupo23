// DateTime & Timezone Formatter (Iteración 4, Vista de Módulos; ADR-008).
// El backend envía instantes UTC; acá se convierten a la zona horaria del LUGAR de cada
// reserva (QA-06d) y se formatean según el locale del usuario.

function partesEnZona(instante: Date, zona: string) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instante);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return { y: valor("year"), m: valor("month"), d: valor("day"), h: valor("hour"), min: valor("minute"), s: valor("second") };
}

function offsetMs(instante: Date, zona: string): number {
  const p = partesEnZona(instante, zona);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(instante.getTime() / 1000) * 1000;
}

const dos = (n: number) => String(n).padStart(2, "0");

// "2026-12-10T09:00" (hora local de `zona`) → ISO UTC
export function localAUtc(valorInput: string, zona: string): string {
  const [fecha, hora] = valorInput.split("T");
  const [y, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const comoUtc = Date.UTC(y, m - 1, d, h, min);
  let instante = comoUtc - offsetMs(new Date(comoUtc), zona);
  // Segunda pasada por si el offset cambia en ese instante (horario de verano).
  instante = comoUtc - offsetMs(new Date(instante), zona);
  return new Date(instante).toISOString();
}

// ISO UTC → "2026-12-10T09:00" en `zona`, para un <input type="datetime-local">
export function utcALocal(iso: string, zona: string): string {
  const p = partesEnZona(new Date(iso), zona);
  return `${p.y}-${dos(p.m)}-${dos(p.d)}T${dos(p.h)}:${dos(p.min)}`;
}

// Fecha y hora en la zona del lugar, con la abreviatura de esa zona (ej. "18 nov 2026, 14:00 GMT+1").
export function formatearFechaHora(iso: string, locale: string, zona?: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zona,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso)) + (zona ? ` ${abreviaturaZona(iso, locale, zona)}` : "");
}

export function formatearDia(iso: string, locale: string, zona?: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: zona, dateStyle: "medium" }).format(new Date(iso));
}

function abreviaturaZona(iso: string, locale: string, zona: string): string {
  const parte = new Intl.DateTimeFormat(locale, { timeZone: zona, timeZoneName: "short" })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "timeZoneName");
  return parte?.value ?? zona;
}

export const zonaDelNavegador = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Misma regla que el backend: vale cualquier zona IANA que Intl reconozca (incluye alias).
export function esZonaValida(zona: string): boolean {
  if (!zona) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zona });
    return true;
  } catch {
    return false;
  }
}

export const zonasHorarias = (): string[] => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [zonaDelNavegador()];
  }
};
