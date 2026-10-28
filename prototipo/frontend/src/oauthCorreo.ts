// Inicio del flujo OAuth2 (authorization code) con el proveedor de correo (CON-02).
// El cliente solo maneja el `code`: el canje por el token lo hace el backend (ADR-005).
const CLAVE_STATE = "trotamundos.oauth.state";
export const RUTA_CALLBACK = "/oauth/callback";

export const redirectUri = () => `${window.location.origin}${RUTA_CALLBACK}`;

export function iniciarConexion(urlAutorizacion: string, emailSugerido: string): void {
  // `state` aleatorio contra CSRF: se verifica al volver del proveedor.
  const state = crypto.randomUUID();
  sessionStorage.setItem(CLAVE_STATE, state);
  const url = new URL(urlAutorizacion);
  url.search = new URLSearchParams({
    client_id: "trotamundos",
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: "correo.lectura",
    state,
    login_hint: emailSugerido,
  }).toString();
  window.location.assign(url.toString());
}

// Lee la respuesta del proveedor en la URL de callback y consume el state guardado.
export function leerCallback(): { codigo: string } | { error: "denegado" | "estado-invalido" } {
  const params = new URLSearchParams(window.location.search);
  let esperado: string | null = null;
  try {
    esperado = sessionStorage.getItem(CLAVE_STATE);
    sessionStorage.removeItem(CLAVE_STATE);
  } catch {
    // sin storage no se puede verificar el state
  }
  if (!esperado || params.get("state") !== esperado) return { error: "estado-invalido" };
  const codigo = params.get("code");
  return codigo ? { codigo } : { error: "denegado" };
}
