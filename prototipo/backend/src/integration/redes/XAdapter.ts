// Adaptador de X (API v2 simulada): no tiene campo para el enlace y limita el texto a 280
// caracteres, así que el adaptador recorta el mensaje y le agrega el enlace al final.
import { postJson } from "../http";
import { IRedSocialAdapter, PublicacionDTO, ResultadoPublicacion } from "./IRedSocialAdapter";

const LIMITE = 280;
const LARGO_ENLACE = 23; // X cuenta cualquier URL como 23 caracteres

export class XAdapter implements IRedSocialAdapter {
  readonly nombre = "x";

  constructor(
    private readonly baseUrl: string,
    private readonly tokenApp: string,
  ) {}

  async publicar(p: PublicacionDTO, timeoutMs: number): Promise<ResultadoPublicacion> {
    const disponible = LIMITE - LARGO_ENLACE - 1;
    const texto = p.texto.length > disponible ? `${p.texto.slice(0, disponible - 1)}…` : p.texto;
    const r = await postJson<{ data: { id: string } }>(
      `${this.baseUrl}/2/tweets`,
      { text: `${texto} ${p.enlace}` },
      { headers: { Authorization: `Bearer ${this.tokenApp}` }, timeoutMs, codigoError: "RED_SOCIAL_NO_DISPONIBLE" },
    );
    // La API v2 no devuelve la URL del post: se arma con el formato público de X.
    return { idExterno: r.data.id, url: `https://x.com/i/web/status/${r.data.id}` };
  }
}
