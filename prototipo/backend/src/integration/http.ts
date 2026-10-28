// Cliente HTTP para las APIs de terceros. Cualquier falla del proveedor se traduce a un
// error de dominio para que el core no dependa de detalles de red.
import { ErrorDominio } from "../domain/errores";

const TIMEOUT_MS = 5000;

async function pedir<T>(url: string, init: RequestInit, timeoutMs: number, codigoError: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    throw new ErrorDominio(codigoError, 502, { motivo: timeout ? "TIMEOUT" : "SIN_CONEXION" });
  }
  if (res.status === 404) throw new ErrorDominio("RESERVA_EXTERNA_NO_ENCONTRADA", 404);
  if (!res.ok) throw new ErrorDominio(codigoError, 502, { status: res.status });
  return (await res.json()) as T;
}

export function getJson<T>(url: string, codigoError = "AGENCIA_NO_DISPONIBLE"): Promise<T> {
  return pedir<T>(url, {}, TIMEOUT_MS, codigoError);
}

export function postJson<T>(
  url: string,
  cuerpo: unknown,
  opciones: { headers?: Record<string, string>; timeoutMs?: number; codigoError: string },
): Promise<T> {
  return pedir<T>(
    url,
    { method: "POST", headers: { "Content-Type": "application/json", ...opciones.headers }, body: JSON.stringify(cuerpo) },
    opciones.timeoutMs ?? TIMEOUT_MS,
    opciones.codigoError,
  );
}
