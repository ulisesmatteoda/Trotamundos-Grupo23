// Un viaje con sus reservas agrupadas y ordenadas cronológicamente (UC-02).
import { Reserva, Viaje } from "../api/tipos";
import { formatearDia, formatearFecha } from "../fechas";
import { TIPOS_RESERVA } from "../textos";

interface Props {
  viaje: Viaje;
  onEditar: () => void;
  onEliminar: () => void;
  onAgregarReserva: () => void;
  onEditarReserva: (r: Reserva) => void;
  onEliminarReserva: (r: Reserva) => void;
}

function formatearPrecio(r: Reserva): string | null {
  if (!r.precio) return null;
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: r.precio.moneda }).format(r.precio.valor);
}

export function ViajeCard({ viaje, onEditar, onEliminar, onAgregarReserva, onEditarReserva, onEliminarReserva }: Props) {
  const rango =
    viaje.inicio && viaje.fin ? `${formatearDia(viaje.inicio)} – ${formatearDia(viaje.fin)}` : "Sin reservas todavía";

  return (
    <article className="tarjeta viaje">
      <header className="viaje-encabezado">
        <div>
          <h2>{viaje.nombre}</h2>
          <p className="tenue">
            {viaje.destino && <>{viaje.destino} · </>}
            {rango}
          </p>
        </div>
        <div className="acciones-compactas">
          <button onClick={onEditar}>Editar</button>
          <button className="peligro" onClick={onEliminar}>
            Eliminar
          </button>
        </div>
      </header>

      {viaje.reservas.length > 0 && (
        <ol className="reservas">
          {viaje.reservas.map((r) => {
            const zona = r.ubicacion?.zonaHoraria;
            const precio = formatearPrecio(r);
            return (
              <li key={r.id} className={`reserva ${r.estado === "CANCELADA" ? "cancelada" : ""}`}>
                <span className={`etiqueta tipo-${r.tipo.toLowerCase()}`}>{TIPOS_RESERVA[r.tipo] ?? r.tipo}</span>
                <div className="reserva-cuerpo">
                  <strong>{r.titulo}</strong>
                  <span className="tenue">
                    {formatearFecha(r.inicio, zona)}
                    {r.fin && <> → {formatearFecha(r.fin, zona)}</>}
                    {zona && <> ({zona})</>}
                  </span>
                  <span className="tenue">
                    {[r.proveedor, r.codigoConfirmacion && `#${r.codigoConfirmacion}`, precio, r.ubicacion?.direccion]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="acciones-compactas">
                  <button onClick={() => onEditarReserva(r)}>Editar</button>
                  <button className="peligro" onClick={() => onEliminarReserva(r)} aria-label={`Eliminar ${r.titulo}`}>
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button className="agregar" onClick={onAgregarReserva}>
        + Agregar reserva
      </button>
    </article>
  );
}
