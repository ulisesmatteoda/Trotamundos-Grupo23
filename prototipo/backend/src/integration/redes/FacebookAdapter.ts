// Adaptador de Facebook (Graph API simulada): el enlace va en un campo propio (`link`).
import { postJson } from "../http";
import { IRedSocialAdapter, PublicacionDTO, ResultadoPublicacion } from "./IRedSocialAdapter";

export class FacebookAdapter implements IRedSocialAdapter {
  readonly nombre = "facebook";

  constructor(
    private readonly baseUrl: string,
    private readonly tokenApp: string,
  ) {}

  async publicar(p: PublicacionDTO, timeoutMs: number): Promise<ResultadoPublicacion> {
    const r = await postJson<{ id: string; permalink_url: string }>(
      `${this.baseUrl}/v19.0/me/feed`,
      { message: p.texto, link: p.enlace },
      { headers: { Authorization: `Bearer ${this.tokenApp}` }, timeoutMs, codigoError: "RED_SOCIAL_NO_DISPONIBLE" },
    );
    return { idExterno: r.id, url: r.permalink_url };
  }
}
