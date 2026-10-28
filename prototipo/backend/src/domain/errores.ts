// Errores de dominio con un código estable. El cliente traduce el código (ADR-008),
// el backend no devuelve textos para el usuario.
export class ErrorDominio extends Error {
  constructor(
    readonly codigo: string,
    readonly status: number,
    readonly detalle?: Record<string, unknown>,
  ) {
    super(codigo);
  }
}

export const noEncontrado = (codigo: string) => new ErrorDominio(codigo, 404);
export const invalido = (detalle: Record<string, unknown>) => new ErrorDominio("DATOS_INVALIDOS", 400, detalle);
