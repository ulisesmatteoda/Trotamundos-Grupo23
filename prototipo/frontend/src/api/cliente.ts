// Cliente HTTP del API Gateway. La Capa de Presentación solo habla con /api (Iteración 1, capas estrictas).
import { Reserva, ReservaInput, Usuario, Viaje, ViajeInput } from "./tipos";

export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    readonly detalle?: Record<string, string>,
  ) {
    super(codigo);
  }
}

let token: string | null = null;
let alExpirarSesion: () => void = () => undefined;

export function configurarSesion(nuevoToken: string | null, onExpirar: () => void): void {
  token = nuevoToken;
  alExpirarSesion = onExpirar;
}

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (cuerpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi(0, "SIN_CONEXION");
  }

  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) alExpirarSesion();
    throw new ErrorApi(res.status, datos.codigo ?? "ERROR_INTERNO", datos.detalle);
  }
  return datos as T;
}

export const api = {
  login: (email: string, password: string) =>
    pedir<{ token: string; usuario: Usuario }>("POST", "/auth/login", { email, password }),

  listarViajes: (archivados: boolean) => pedir<Viaje[]>("GET", `/viajes?archivados=${archivados}`),
  crearViaje: (datos: ViajeInput) => pedir<Viaje>("POST", "/viajes", datos),
  actualizarViaje: (id: string, datos: ViajeInput) => pedir<Viaje>("PUT", `/viajes/${id}`, datos),
  eliminarViaje: (id: string) => pedir<void>("DELETE", `/viajes/${id}`),

  agregarReserva: (viajeId: string, datos: ReservaInput) =>
    pedir<Reserva>("POST", `/viajes/${viajeId}/reservas`, datos),
  actualizarReserva: (id: string, datos: ReservaInput) => pedir<Reserva>("PUT", `/reservas/${id}`, datos),
  eliminarReserva: (id: string) => pedir<void>("DELETE", `/reservas/${id}`),
};
