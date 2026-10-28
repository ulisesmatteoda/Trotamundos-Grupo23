// Vuelta del proveedor de correo (redirect_uri del flujo OAuth2). Envía el code al backend,
// que lo canjea y guarda el token cifrado; después vuelve al panel con Integraciones abierto.
import { useEffect, useRef } from "react";
import { api, ErrorApi } from "../api/cliente";
import { useI18n } from "../i18n/I18nProvider";
import { leerCallback, redirectUri } from "../oauthCorreo";
import { navegar } from "../ruta";

export type ResultadoConexion = "ok" | "denegado" | "estado-invalido" | `error:${string}`;
export const CLAVE_RESULTADO = "trotamundos.oauth.resultado";

export function CallbackOAuth() {
  const { t } = useI18n();
  const procesado = useRef(false);

  useEffect(() => {
    if (procesado.current) return; // StrictMode monta dos veces: el code se usa una sola vez
    procesado.current = true;

    const terminar = (r: ResultadoConexion) => {
      sessionStorage.setItem(CLAVE_RESULTADO, r);
      navegar("/");
    };
    const respuesta = leerCallback();
    if ("error" in respuesta) return terminar(respuesta.error);
    api
      .conectarCorreo(respuesta.codigo, redirectUri())
      .then(() => terminar("ok"))
      .catch((err) => terminar(`error:${err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"}`));
  }, []);

  return (
    <main className="login">
      <p className="tenue">{t("correo.conectando")}</p>
    </main>
  );
}
