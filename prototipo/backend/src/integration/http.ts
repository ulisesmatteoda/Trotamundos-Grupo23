// Cliente HTTP para las APIs de terceros. Cualquier falla del proveedor se traduce a un
// único error de dominio para que el core no dependa de detalles de red.
import { ErrorDominio } from "../domain/errores";

const TIMEOUT_MS = 5000;

export async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ErrorDominio("AGENCIA_NO_DISPONIBLE", 502);
  }
  if (res.status === 404) throw new ErrorDominio("RESERVA_EXTERNA_NO_ENCONTRADA", 404);
  if (!res.ok) throw new ErrorDominio("AGENCIA_NO_DISPONIBLE", 502, { status: res.status });
  return (await res.json()) as T;
}
