// Capa de Presentación (Iteración 1). Habla exclusivamente con el API Gateway (/api).
import { useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { Login } from "./pages/Login";
import { Panel } from "./pages/Panel";
import { CallbackOAuth } from "./pages/CallbackOAuth";
import { VistaCompartida } from "./pages/VistaCompartida";
import { RUTA_CALLBACK } from "./oauthCorreo";
import { useRuta } from "./ruta";
import { ProveedorSesion, useSesion } from "./sesion";

function Rutas() {
  const { usuario } = useSesion();
  const { elegidoManualmente, cambiarLocale } = useI18n();

  // Al ingresar se usa el idioma preferido de la cuenta, salvo que el usuario haya elegido otro a mano.
  useEffect(() => {
    if (usuario?.localePreferido && !elegidoManualmente) cambiarLocale(usuario.localePreferido, false);
  }, [usuario, elegidoManualmente, cambiarLocale]);

  const ruta = useRuta();

  // Las rutas profundas (enlace compartido, vuelta del OAuth) requieren sesión: si no hay,
  // se muestra el login y, al ingresar, se continúa en la misma URL.
  if (!usuario) return <Login />;
  const compartido = /^\/compartido\/([\w-]+)$/.exec(ruta);
  if (compartido) return <VistaCompartida enlaceId={compartido[1]} />;
  if (ruta === RUTA_CALLBACK) return <CallbackOAuth />;
  return <Panel />;
}

export function App() {
  return (
    <I18nProvider>
      <ProveedorSesion>
        <Rutas />
      </ProveedorSesion>
    </I18nProvider>
  );
}
