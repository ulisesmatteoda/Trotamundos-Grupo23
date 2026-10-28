// Conversión entre instantes UTC (lo que viaja por la API, ADR-008) y la hora local del lugar
// de cada reserva (QA-06d). En la Fase 3 esto pasa a formar parte del DateTimeFormatter.

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

// "2026-12-10T09:00" en la zona `zona` → ISO UTC
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

// ISO UTC → "2026-12-10T09:00" en la zona `zona`, para un <input type="datetime-local">
export function utcALocal(iso: string, zona: string): string {
  const p = partesEnZona(new Date(iso), zona);
  return `${p.y}-${dos(p.m)}-${dos(p.d)}T${dos(p.h)}:${dos(p.min)}`;
}

export function formatearFecha(iso: string, zona?: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zona,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatearDia(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(iso));
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
