// Panel principal: viajes activos (o archivados) con sus reservas agrupadas (UC-02).
import { useCallback, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { Reserva, ReservaInput, Viaje, ViajeInput } from "../api/tipos";
import { Integraciones } from "../components/Integraciones";
import { Modal } from "../components/Modal";
import { ReservaForm } from "../components/ReservaForm";
import { ViajeCard } from "../components/ViajeCard";
import { ViajeForm } from "../components/ViajeForm";
import { useSesion } from "../sesion";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { SelectorIdioma } from "../i18n/SelectorIdioma";

// Refresco periódico para que las reservas que llegan por correo o por las agencias
// aparezcan sin recargar (QA-01a: reflejadas en menos de 5 minutos).
const REFRESCO_MS = 10_000;

type Edicion =
  | { tipo: "integraciones" }
  | { tipo: "nuevo-viaje" }
  | { tipo: "editar-viaje"; viaje: Viaje }
  | { tipo: "nueva-reserva"; viaje: Viaje }
  | { tipo: "editar-reserva"; reserva: Reserva };

export function Panel() {
  const { usuario, salir } = useSesion();
  const { t } = useI18n();
  const { mensajeError } = useMensajes();
  const [archivados, setArchivados] = useState(false);
  const [viajes, setViajes] = useState<Viaje[] | null>(null);
  // Se guarda el código y no el texto, para que el mensaje siga al idioma elegido.
  const [error, setError] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const cargar = useCallback(async () => {
    try {
      setViajes(await api.listarViajes(archivados));
      setError(null);
    } catch (err) {
      setError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO");
    }
  }, [archivados]);

  useEffect(() => {
    setViajes(null);
    cargar();
    const intervalo = setInterval(() => document.visibilityState === "visible" && cargar(), REFRESCO_MS);
    return () => clearInterval(intervalo);
  }, [cargar]);

  const cerrar = useCallback(() => setEdicion(null), []);
  const trasGuardar = async () => {
    setEdicion(null);
    await cargar();
  };

  async function confirmarYEjecutar(pregunta: string, accion: () => Promise<void>) {
    if (!window.confirm(pregunta)) return;
    try {
      await accion();
      await cargar();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO");
    }
  }

  return (
    <>
      <header className="barra">
        <strong className="marca">Trotamundos</strong>
        <span className="tenue">{usuario?.nombre}</span>
        <SelectorIdioma />
        <button onClick={() => setEdicion({ tipo: "integraciones" })}>{t("barra.integraciones")}</button>
        <button onClick={salir}>{t("barra.salir")}</button>
      </header>

      <main className="contenedor">
        <div className="panel-encabezado">
          <div className="pestanas" role="tablist">
            <button role="tab" aria-selected={!archivados} className={!archivados ? "activa" : ""} onClick={() => setArchivados(false)}>
              {t("panel.misViajes")}
            </button>
            <button role="tab" aria-selected={archivados} className={archivados ? "activa" : ""} onClick={() => setArchivados(true)}>
              {t("panel.archivados")}
            </button>
          </div>
          {!archivados && (
            <button className="primario" onClick={() => setEdicion({ tipo: "nuevo-viaje" })}>
              {t("panel.nuevoViaje")}
            </button>
          )}
        </div>

        {error && <p className="error" role="alert">{mensajeError(error)}</p>}
        {!viajes && !error && <p className="tenue">{t("comun.cargando")}</p>}
        {viajes?.length === 0 && (
          <p className="vacio tenue">
            {archivados ? t("panel.vacioArchivados") : t("panel.vacioActivos")}
          </p>
        )}

        {viajes?.map((v) => (
          <ViajeCard
            key={v.id}
            viaje={v}
            onEditar={() => setEdicion({ tipo: "editar-viaje", viaje: v })}
            onEliminar={() => confirmarYEjecutar(t("panel.confirmarEliminarViaje", { nombre: v.nombre }), () => api.eliminarViaje(v.id))}
            onAgregarReserva={() => setEdicion({ tipo: "nueva-reserva", viaje: v })}
            onEditarReserva={(r) => setEdicion({ tipo: "editar-reserva", reserva: r })}
            onEliminarReserva={(r) => confirmarYEjecutar(t("panel.confirmarEliminarReserva", { titulo: r.titulo }), () => api.eliminarReserva(r.id))}
          />
        ))}
      </main>

      {edicion?.tipo === "integraciones" && (
        <Modal titulo={t("integraciones.titulo")} onCerrar={cerrar}>
          <Integraciones onSincronizado={cargar} />
        </Modal>
      )}
      {edicion?.tipo === "nuevo-viaje" && (
        <Modal titulo={t("panel.tituloNuevoViaje")} onCerrar={cerrar}>
          <ViajeForm onCancelar={cerrar} onGuardar={async (d: ViajeInput) => (await api.crearViaje(d), trasGuardar())} />
        </Modal>
      )}
      {edicion?.tipo === "editar-viaje" && (
        <Modal titulo={t("panel.tituloEditarViaje")} onCerrar={cerrar}>
          <ViajeForm
            inicial={edicion.viaje}
            onCancelar={cerrar}
            onGuardar={async (d: ViajeInput) => (await api.actualizarViaje(edicion.viaje.id, d), trasGuardar())}
          />
        </Modal>
      )}
      {edicion?.tipo === "nueva-reserva" && (
        <Modal titulo={t("panel.tituloNuevaReserva", { viaje: edicion.viaje.nombre })} onCerrar={cerrar}>
          <ReservaForm
            onCancelar={cerrar}
            onGuardar={async (d: ReservaInput) => (await api.agregarReserva(edicion.viaje.id, d), trasGuardar())}
          />
        </Modal>
      )}
      {edicion?.tipo === "editar-reserva" && (
        <Modal titulo={t("panel.tituloEditarReserva")} onCerrar={cerrar}>
          <ReservaForm
            inicial={edicion.reserva}
            onCancelar={cerrar}
            onGuardar={async (d: ReservaInput) => (await api.actualizarReserva(edicion.reserva.id, d), trasGuardar())}
          />
        </Modal>
      )}
    </>
  );
}
