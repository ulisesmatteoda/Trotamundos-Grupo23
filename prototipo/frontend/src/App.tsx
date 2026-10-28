// Capa de Presentación (Iteración 1). Habla exclusivamente con el API Gateway (/api).
import { useEffect } from "react";
import { I18nProvider, useI18n } from "./i18n/I18nProvider";
import { Login } from "./pages/Login";
import { Panel } from "./pages/Panel";
import { ProveedorSesion, useSesion } from "./sesion";

function Rutas() {
  const { usuario } = useSesion();
  const { elegidoManualmente, cambiarLocale } = useI18n();

  // Al ingresar se usa el idioma preferido de la cuenta, salvo que el usuario haya elegido otro a mano.
  useEffect(() => {
    if (usuario?.localePreferido && !elegidoManualmente) cambiarLocale(usuario.localePreferido, false);
  }, [usuario, elegidoManualmente, cambiarLocale]);

  return usuario ? <Panel /> : <Login />;
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
