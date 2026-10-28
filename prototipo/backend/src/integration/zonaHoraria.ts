// Convierte una hora "de pared" en una zona IANA a un instante UTC. Lo usan los traductores
// de formatos externos que informan horas locales sin offset (ADR-008: el core guarda UTC).

function offsetMs(instante: Date, zona: string): number {
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
  const v = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - Math.floor(instante.getTime() / 1000) * 1000;
}

export function horaLocalAUtc(anio: number, mes: number, dia: number, hora: number, minuto: number, zona: string): Date {
  const comoUtc = Date.UTC(anio, mes - 1, dia, hora, minuto);
  let instante = comoUtc - offsetMs(new Date(comoUtc), zona);
  instante = comoUtc - offsetMs(new Date(instante), zona); // corrige cambios de horario de verano
  return new Date(instante);
}
