// Itinerario compartido, en solo lectura (QA-04b, ADR-010). El backend decide si la persona
// autenticada está designada; acá solo se muestra el resultado.
import { useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { ViajeCompartido } from "../api/tipos";
import { ViajeCard } from "../components/ViajeCard";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { SelectorIdioma } from "../i18n/SelectorIdioma";
import { navegar } from "../ruta";
import { useSesion } from "../sesion";

export function VistaCompartida({ enlaceId }: { enlaceId: string }) {
  const { usuario, salir } = useSesion();
  const { t } = useI18n();
  const { mensajeError } = useMensajes();
  const [viaje, setViaje] = useState<ViajeCompartido | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .verCompartido(enlaceId)
      .then(setViaje)
      .catch((err) => setError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"));
  }, [enlaceId]);

  return (
    <>
      <header className="barra">
        <strong className="marca">Trotamundos</strong>
        <span className="tenue">{usuario?.nombre}</span>
        <SelectorIdioma />
        <button onClick={() => navegar("/")}>{t("compartido.volver")}</button>
        <button onClick={salir}>{t("barra.salir")}</button>
      </header>
      <main className="contenedor">
        {!viaje && !error && <p className="tenue">{t("comun.cargando")}</p>}
        {error && (
          <p className="error" role="alert">
            {error === "ACCESO_DENEGADO" ? t("compartido.denegado") : mensajeError(error)}
          </p>
        )}
        {viaje && (
          <>
            <p className="tenue">
              {t("compartido.por", { nombre: viaje.compartidoPor })} · <span className="chip">{t("compartido.soloLectura")}</span>
            </p>
            <ViajeCard viaje={viaje} />
          </>
        )}
      </main>
    </>
  );
}
