// Adaptador OAuth2 del proveedor de correo (en el prototipo, el "Gmail" simulado de mocks).
import { ErrorDominio } from "../../domain/errores";
import { IProveedorCorreo } from "./IProveedorCorreo";

const TIMEOUT_MS = 5000;

export class GmailOAuthAdapter implements IProveedorCorreo {
  readonly nombre = "gmail";

  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async llamar(ruta: string, init: RequestInit): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${ruta}`, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new ErrorDominio("PROVEEDOR_CORREO_NO_DISPONIBLE", 502);
    }
    if (res.status === 400 || res.status === 401) throw new ErrorDominio("AUTORIZACION_CORREO_INVALIDA", 400);
    if (!res.ok) throw new ErrorDominio("PROVEEDOR_CORREO_NO_DISPONIBLE", 502, { status: res.status });
    return res.status === 204 ? null : res.json();
  }

  async canjearCodigo(codigo: string, redirectUri: string): Promise<string> {
    const r = await this.llamar("/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: codigo,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    return r.access_token;
  }

  async casillaDelToken(token: string): Promise<string> {
    const r = await this.llamar("/api/perfil", { headers: { Authorization: `Bearer ${token}` } });
    return r.email;
  }

  async revocar(token: string): Promise<void> {
    await this.llamar("/oauth/revocar", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, client_id: this.clientId, client_secret: this.clientSecret }),
    });
  }
}
