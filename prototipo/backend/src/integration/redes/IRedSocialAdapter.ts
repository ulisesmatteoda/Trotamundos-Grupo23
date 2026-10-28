// Contrato del ACL para redes sociales (ADR-009, Iteración 5 — Vista de Módulos).
// A la red social solo viaja el texto y el enlace al recurso Compartido, nunca el itinerario (ADR-010).

export interface PublicacionDTO {
  texto: string;
  enlace: string;
}

export interface ResultadoPublicacion {
  idExterno: string;
  url: string;
}

export interface IRedSocialAdapter {
  readonly nombre: string;
  publicar(publicacion: PublicacionDTO, timeoutMs: number): Promise<ResultadoPublicacion>;
}
