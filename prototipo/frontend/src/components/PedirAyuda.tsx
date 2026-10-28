// Derivación de un problema a la agencia preferida (QA-03d, QA-06c; ADR-009).
// Toque 1: "Pedir ayuda" en la reserva; toque 2: "Enviar a mi agencia". El contexto de la
// reserva viaja completo sin reingreso manual. Si la agencia no responde a tiempo, el caso
// queda PENDIENTE y el backend lo reintenta: acá se consulta su estado hasta que se derive.
import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/cliente";
import { CasoSoporte, Reserva } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";

const CONSULTA_MS = 3000;

export function PedirAyuda({ reserva }: { reserva: Reserva }) {
  const { t, fechaHora, moneda } = useI18n();
  const { mensajeDe } = useMensajes();
  const [descripcion, setDescripcion] = useState("");
  const [caso, setCaso] = useState<CasoSoporte | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mientras el caso esté pendiente, se consulta su estado.
  useEffect(() => {
    if (caso?.estado !== "PENDIENTE") return;
    const intervalo = setInterval(() => api.obtenerCaso(caso.id).then(setCaso).catch(() => undefined), CONSULTA_MS);
    return () => clearInterval(intervalo);
  }, [caso?.id, caso?.estado]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      setCaso(await api.solicitarAsistencia(reserva.id, descripcion.trim() || undefined));
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }

  const zonaFin = reserva.ubicacionFin?.zonaHoraria ?? reserva.ubicacion?.zonaHoraria;
  const datos = [
    t(`tipo.${reserva.tipo}`, undefined, reserva.tipo),
    reserva.titulo,
    `${fechaHora(reserva.inicio, reserva.ubicacion?.zonaHoraria)}${reserva.fin ? ` → ${fechaHora(reserva.fin, zonaFin)}` : ""}`,
    reserva.proveedor,
    reserva.codigoConfirmacion && `#${reserva.codigoConfirmacion}`,
    reserva.precio && moneda(reserva.precio),
    reserva.ubicacion?.direccion,
  ].filter(Boolean);

  return (
    <div className="formulario">
      <p className="pista">{t("soporte.pista")}</p>
      <ul className="contexto-caso">
        {datos.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>

      {!caso && (
        <form className="formulario" onSubmit={enviar}>
          <label>
            {t("soporte.descripcion")}
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("soporte.descripcionPlaceholder")}
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="acciones">
            <button className="primario" disabled={enviando} autoFocus>
              {enviando ? t("soporte.enviando") : t("soporte.enviar")}
            </button>
          </div>
        </form>
      )}

      {caso?.estado === "DERIVADO" && (
        <p className="ok-texto" role="status">
          {t("soporte.derivado", { agencia: t(`agencia.${caso.agencia}`, undefined, caso.agencia), ticket: caso.ticketAgencia ?? "" })}
        </p>
      )}
      {caso?.estado === "PENDIENTE" && (
        <div role="status">
          <p className="aviso-texto">{t("soporte.pendiente")}</p>
          <p className="pista">{t("soporte.intentos", { intentos: caso.intentos })}</p>
        </div>
      )}
    </div>
  );
}
