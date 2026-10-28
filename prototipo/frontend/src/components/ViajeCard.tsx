// Un viaje con sus reservas agrupadas y ordenadas cronológicamente (UC-02).
// Cada horario se muestra en la zona del lugar donde ocurre (QA-06d, ADR-008).
import { Reserva, Viaje } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";

// Sin `acciones` la tarjeta es de solo lectura (itinerario compartido, ADR-010).
interface Acciones {
  onEditar: () => void;
  onEliminar: () => void;
  onCompartir: () => void;
  onAgregarReserva: () => void;
  onEditarReserva: (r: Reserva) => void;
  onEliminarReserva: (r: Reserva) => void;
}

interface Props {
  viaje: Viaje;
  acciones?: Acciones;
}

const zonaInicio = (r: Reserva) => r.ubicacion?.zonaHoraria;
const zonaFin = (r: Reserva) => r.ubicacionFin?.zonaHoraria ?? r.ubicacion?.zonaHoraria;

export function ViajeCard({ viaje, acciones }: Props) {
  const { t, fechaHora, dia, moneda } = useI18n();

  // El rango del viaje se muestra en la zona de la primera salida y de la última llegada.
  const vigentes = viaje.reservas.filter((r) => r.estado !== "CANCELADA");
  const primera = vigentes.find((r) => r.inicio === viaje.inicio);
  const ultima = vigentes.find((r) => (r.fin ?? r.inicio) === viaje.fin);
  const rango =
    viaje.inicio && viaje.fin
      ? `${dia(viaje.inicio, primera && zonaInicio(primera))} – ${dia(viaje.fin, ultima && zonaFin(ultima))}`
      : t("viaje.sinReservas");

  return (
    <article className="tarjeta viaje">
      <header className="viaje-encabezado">
        <div>
          <h2>{viaje.nombre}</h2>
          <p className="tenue">
            {viaje.destino && viaje.destino !== viaje.nombre && <>{viaje.destino} · </>}
            {rango}
          </p>
        </div>
        {acciones && (
          <div className="acciones-compactas">
            <button onClick={acciones.onCompartir}>{t("compartir.boton")}</button>
            <button onClick={acciones.onEditar}>{t("comun.editar")}</button>
            <button className="peligro" onClick={acciones.onEliminar}>
              {t("comun.eliminar")}
            </button>
          </div>
        )}
      </header>

      {viaje.reservas.length > 0 && (
        <ol className="reservas">
          {viaje.reservas.map((r) => {
            const marcaEstado = r.estado !== "CONFIRMADA" ? t(`estado.${r.estado}`) : null;
            const marcaOrigen = r.origen !== "MANUAL" ? t(`origen.${r.origen}`) : null;
            return (
              <li key={r.id} className={`reserva ${r.estado === "CANCELADA" ? "cancelada" : ""}`}>
                <span className={`etiqueta tipo-${r.tipo.toLowerCase()}`}>{t(`tipo.${r.tipo}`, undefined, r.tipo)}</span>
                <div className="reserva-cuerpo">
                  <strong className="reserva-titulo">{r.titulo}</strong>
                  {(marcaEstado || marcaOrigen) && (
                    <span className="chips">
                      {marcaEstado && <span className={`chip estado-${r.estado.toLowerCase()}`}>{marcaEstado}</span>}
                      {marcaOrigen && <span className="chip">{marcaOrigen}</span>}
                    </span>
                  )}
                  <span className="tenue">
                    {fechaHora(r.inicio, zonaInicio(r))}
                    {r.fin && <> → {fechaHora(r.fin, zonaFin(r))}</>}
                  </span>
                  <span className="tenue">
                    {[r.proveedor, r.codigoConfirmacion && `#${r.codigoConfirmacion}`, r.precio && moneda(r.precio), r.ubicacion?.direccion]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {acciones && (
                  <div className="acciones-compactas">
                    <button onClick={() => acciones.onEditarReserva(r)}>{t("comun.editar")}</button>
                    <button
                      className="peligro"
                      onClick={() => acciones.onEliminarReserva(r)}
                      aria-label={t("viaje.eliminarReserva", { titulo: r.titulo })}
                    >
                      ×
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {acciones && (
        <button className="agregar" onClick={acciones.onAgregarReserva}>
          {t("viaje.agregarReserva")}
        </button>
      )}
    </article>
  );
}
