// Estado de la conexión con el proveedor de correo, conexión OAuth2 y revocación (CON-02, QA-04c).
import { useEffect, useState } from "react";
import { api } from "../api/cliente";
import { ConexionCorreo as Estado } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { iniciarConexion } from "../oauthCorreo";
import { useSesion } from "../sesion";

export interface Aviso {
  texto: string;
  ok: boolean;
}

export function ConexionCorreo({ aviso }: { aviso?: Aviso | null }) {
  const { t, dia } = useI18n();
  const { mensajeDe } = useMensajes();
  const { usuario } = useSesion();
  const [estado, setEstado] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.estadoCorreo().then(setEstado).catch((err) => setError(mensajeDe(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function desconectar() {
    if (!estado?.casilla || !window.confirm(t("correo.confirmarDesconectar", { casilla: estado.casilla }))) return;
    try {
      await api.desconectarCorreo();
      setEstado(await api.estadoCorreo());
    } catch (err) {
      setError(mensajeDe(err));
    }
  }

  return (
    <fieldset>
      <legend>{t("correo.titulo")}</legend>
      {aviso && (
        <p className={aviso.ok ? "ok-texto" : "error"} role={aviso.ok ? "status" : "alert"}>
          {aviso.texto}
        </p>
      )}
      {estado?.conectado ? (
        <ul className="lista-simple">
          <li>
            <div>
              <strong>{t("correo.conectada", { casilla: estado.casilla ?? "" })}</strong>
              {estado.conectadoEn && <div className="pista">{t("correo.desde", { fecha: dia(estado.conectadoEn) })}</div>}
            </div>
            <button className="peligro" onClick={desconectar}>
              {t("correo.desconectar")}
            </button>
          </li>
        </ul>
      ) : (
        estado && (
          <div className="fila-alineada espaciada">
            <p className="tenue">{t("correo.noConectada")}</p>
            <button className="primario" onClick={() => iniciarConexion(estado.urlAutorizacion, usuario?.email ?? "")}>
              {t("correo.conectar")}
            </button>
          </div>
        )
      )}
      <p className="pista">{t("correo.privacidad")}</p>
      {error && <p className="error" role="alert">{error}</p>}
    </fieldset>
  );
}
