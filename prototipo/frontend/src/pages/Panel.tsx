// Panel principal: viajes activos (o archivados) con sus reservas agrupadas (UC-02).
import { useCallback, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { Reserva, ReservaInput, Viaje, ViajeInput } from "../api/tipos";
import { Modal } from "../components/Modal";
import { ReservaForm } from "../components/ReservaForm";
import { ViajeCard } from "../components/ViajeCard";
import { ViajeForm } from "../components/ViajeForm";
import { useSesion } from "../sesion";
import { mensajeError } from "../textos";

type Edicion =
  | { tipo: "nuevo-viaje" }
  | { tipo: "editar-viaje"; viaje: Viaje }
  | { tipo: "nueva-reserva"; viaje: Viaje }
  | { tipo: "editar-reserva"; reserva: Reserva };

export function Panel() {
  const { usuario, salir } = useSesion();
  const [archivados, setArchivados] = useState(false);
  const [viajes, setViajes] = useState<Viaje[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const cargar = useCallback(async () => {
    try {
      setViajes(await api.listarViajes(archivados));
      setError(null);
    } catch (err) {
      setError(mensajeError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"));
    }
  }, [archivados]);

  useEffect(() => {
    setViajes(null);
    cargar();
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
      setError(mensajeError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"));
    }
  }

  return (
    <>
      <header className="barra">
        <strong className="marca">Trotamundos</strong>
        <span className="tenue">{usuario?.nombre}</span>
        <button onClick={salir}>Salir</button>
      </header>

      <main className="contenedor">
        <div className="panel-encabezado">
          <div className="pestanas" role="tablist">
            <button role="tab" aria-selected={!archivados} className={!archivados ? "activa" : ""} onClick={() => setArchivados(false)}>
              Mis viajes
            </button>
            <button role="tab" aria-selected={archivados} className={archivados ? "activa" : ""} onClick={() => setArchivados(true)}>
              Archivados
            </button>
          </div>
          {!archivados && (
            <button className="primario" onClick={() => setEdicion({ tipo: "nuevo-viaje" })}>
              + Nuevo viaje
            </button>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {!viajes && !error && <p className="tenue">Cargando…</p>}
        {viajes?.length === 0 && (
          <p className="vacio tenue">
            {archivados ? "Todavía no tenés viajes archivados." : "No tenés viajes activos. Creá uno para empezar."}
          </p>
        )}

        {viajes?.map((v) => (
          <ViajeCard
            key={v.id}
            viaje={v}
            onEditar={() => setEdicion({ tipo: "editar-viaje", viaje: v })}
            onEliminar={() => confirmarYEjecutar(`¿Eliminar "${v.nombre}" y todas sus reservas?`, () => api.eliminarViaje(v.id))}
            onAgregarReserva={() => setEdicion({ tipo: "nueva-reserva", viaje: v })}
            onEditarReserva={(r) => setEdicion({ tipo: "editar-reserva", reserva: r })}
            onEliminarReserva={(r) => confirmarYEjecutar(`¿Eliminar la reserva "${r.titulo}"?`, () => api.eliminarReserva(r.id))}
          />
        ))}
      </main>

      {edicion?.tipo === "nuevo-viaje" && (
        <Modal titulo="Nuevo viaje" onCerrar={cerrar}>
          <ViajeForm onCancelar={cerrar} onGuardar={async (d: ViajeInput) => (await api.crearViaje(d), trasGuardar())} />
        </Modal>
      )}
      {edicion?.tipo === "editar-viaje" && (
        <Modal titulo="Editar viaje" onCerrar={cerrar}>
          <ViajeForm
            inicial={edicion.viaje}
            onCancelar={cerrar}
            onGuardar={async (d: ViajeInput) => (await api.actualizarViaje(edicion.viaje.id, d), trasGuardar())}
          />
        </Modal>
      )}
      {edicion?.tipo === "nueva-reserva" && (
        <Modal titulo={`Nueva reserva en "${edicion.viaje.nombre}"`} onCerrar={cerrar}>
          <ReservaForm
            onCancelar={cerrar}
            onGuardar={async (d: ReservaInput) => (await api.agregarReserva(edicion.viaje.id, d), trasGuardar())}
          />
        </Modal>
      )}
      {edicion?.tipo === "editar-reserva" && (
        <Modal titulo="Editar reserva" onCerrar={cerrar}>
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
