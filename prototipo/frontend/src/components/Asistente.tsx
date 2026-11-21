// Widget del Asistente Virtual (Iteración 6, Paso 5.1).
//  - Conversación con el asistente en el idioma del usuario (ADR-008).
//  - Las reprogramaciones llegan como tarjeta: el cambio solo se aplica con "Confirmar",
//    que llama a un endpoint propio y no pasa por el chat (ADR-013, QA-04e).
//  - "Enviar a mi agencia" está siempre visible y no depende del LLM (ADR-014, QA-02b):
//    toque 1 abre la elección de reserva (o va directo a la reserva en foco), toque 2 elige,
//    toque 3 envía (QA-06e).
import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { AccionPendiente, AccionSugerida, MensajeAsistente, Reserva, Viaje } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { PedirAyuda } from "./PedirAyuda";

interface Props {
  // Se llama cuando una acción confirmada cambió el itinerario.
  onItinerarioCambiado: () => void;
}

type Vista = { tipo: "chat" } | { tipo: "elegir-reserva" } | { tipo: "agencia"; reserva: Reserva };

let idLocal = 0;
const avisoLocal = (codigo: string): MensajeAsistente => ({
  id: `local-${++idLocal}`,
  rol: "asistente",
  texto: null,
  codigo,
  accion: null,
  caso: null,
  creadoEn: new Date().toISOString(),
});

export function Asistente({ onItinerarioCambiado }: Props) {
  const { t, locale, fechaHora } = useI18n();
  const { mensajeDe } = useMensajes();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeAsistente[] | null>(null);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugerida, setSugerida] = useState<AccionSugerida | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: "chat" });
  // Viajes activos, para mostrar las tarjetas y elegir la reserva a derivar.
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const fin = useRef<HTMLDivElement>(null);

  const reservas = viajes.flatMap((v) => v.reservas.filter((r) => r.estado !== "CANCELADA"));
  const reservaPorId = (id?: string | null) => reservas.find((r) => r.id === id);

  const cargarViajes = () =>
    api
      .listarViajes(false)
      .then(setViajes)
      .catch(() => undefined);

  useEffect(() => {
    if (!abierto || mensajes) return;
    cargarViajes();
    api
      .conversacionAsistente()
      .then((r) => setMensajes(r.mensajes))
      .catch((err) => {
        setMensajes([]);
        setError(mensajeDe(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  useEffect(() => fin.current?.scrollIntoView({ block: "end" }), [mensajes, escribiendo, vista]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const contenido = texto.trim();
    if (!contenido || escribiendo) return;
    setTexto("");
    setError(null);
    setEscribiendo(true);
    try {
      const r = await api.enviarMensajeAsistente(contenido, locale.split("-")[0]);
      setMensajes((m) => [...(m ?? []), ...r.mensajes]);
      setSugerida(r.accionSugerida);
    } catch (err) {
      if (err instanceof ErrorApi && err.codigo === "LIMITE_MENSAJES") {
        setMensajes((m) => [...(m ?? []), avisoLocal("LIMITE_MENSAJES")]);
        setSugerida({ tipo: "DERIVAR_A_AGENCIA" });
      } else {
        setTexto(contenido);
        setError(mensajeDe(err));
      }
    } finally {
      setEscribiendo(false);
    }
  }

  function actualizarAccion(accion: AccionPendiente) {
    setMensajes((m) => m?.map((x) => (x.accion?.id === accion.id ? { ...x, accion } : x)) ?? null);
  }

  async function resolverAccion(accion: AccionPendiente, confirmar: boolean) {
    setError(null);
    try {
      if (confirmar) {
        const r = await api.confirmarAccion(accion.id);
        actualizarAccion(r.accion);
        cargarViajes();
        onItinerarioCambiado();
      } else {
        actualizarAccion(await api.cancelarAccion(accion.id));
      }
    } catch (err) {
      setError(mensajeDe(err));
      if (err instanceof ErrorApi && err.status === 409) {
        actualizarAccion({ ...accion, estado: err.codigo === "ACCION_NO_PENDIENTE" ? "CANCELADA" : "EXPIRADA" });
      }
    }
  }

  // Toque 1: si se sabe de qué reserva se habla, se va directo; si no, se elige.
  function irAAgencia() {
    const ultimo = [...(mensajes ?? [])].reverse().find((m) => m.accion || m.caso);
    const enFoco = reservaPorId(sugerida?.reservaId) ?? reservaPorId(ultimo?.accion?.reservaId ?? ultimo?.caso?.reservaId);
    setVista(enFoco ? { tipo: "agencia", reserva: enFoco } : { tipo: "elegir-reserva" });
  }

  function tarjetaAccion(a: AccionPendiente) {
    const r = reservaPorId(a.reservaId);
    const zona = r?.ubicacion?.zonaHoraria;
    const zonaFin = r?.ubicacionFin?.zonaHoraria ?? zona;
    return (
      <div className="tarjeta-accion">
        <strong>{t("asistente.propuesta")}</strong>
        <span>{r?.titulo}</span>
        {r && (
          <span className="tenue">
            {fechaHora(r.inicio, zona)} → <strong>{fechaHora(a.nuevoInicio, zona)}</strong>
            {a.nuevoFin && r.fin && (
              <>
                {" · "}
                {t("asistente.fin")}: {fechaHora(r.fin, zonaFin)} → <strong>{fechaHora(a.nuevoFin, zonaFin)}</strong>
              </>
            )}
          </span>
        )}
        {a.estado === "PENDIENTE" ? (
          <div className="acciones">
            <button onClick={() => resolverAccion(a, false)}>{t("comun.cancelar")}</button>
            <button className="primario" onClick={() => resolverAccion(a, true)}>
              {t("asistente.confirmar")}
            </button>
          </div>
        ) : (
          <span className={a.estado === "CONFIRMADA" ? "ok-texto" : "tenue"}>{t(`asistente.accion.${a.estado}`)}</span>
        )}
      </div>
    );
  }

  if (!abierto) {
    return (
      <button className="asistente-boton primario" onClick={() => setAbierto(true)} aria-label={t("asistente.abrir")}>
        💬 {t("asistente.titulo")}
      </button>
    );
  }

  return (
    <section className="asistente" aria-label={t("asistente.titulo")}>
      <header className="asistente-encabezado">
        <strong>{t("asistente.titulo")}</strong>
        <button className="icono" onClick={() => setAbierto(false)} aria-label={t("comun.cerrar")}>
          ×
        </button>
      </header>

      {vista.tipo === "chat" && (
        <div className="asistente-mensajes" aria-live="polite">
          {!mensajes && <p className="tenue">{t("comun.cargando")}</p>}
          {mensajes?.length === 0 && <p className="pista">{t("asistente.bienvenida")}</p>}
          {mensajes?.map((m) => (
            <div key={m.id} className={`burbuja ${m.rol}`}>
              {m.texto ? <p>{m.texto}</p> : m.codigo && <p className="aviso-texto">{t(`asistente.${m.codigo}`, undefined, t("asistente.ASISTENTE_NO_DISPONIBLE"))}</p>}
              {m.accion && tarjetaAccion(m.accion)}
              {m.caso && (
                <p className={m.caso.estado === "DERIVADO" ? "ok-texto" : "aviso-texto"}>
                  {m.caso.estado === "DERIVADO"
                    ? t("soporte.derivado", { agencia: t(`agencia.${m.caso.agencia}`, undefined, m.caso.agencia), ticket: m.caso.ticketAgencia ?? "" })
                    : t("soporte.pendiente")}
                </p>
              )}
            </div>
          ))}
          {escribiendo && <p className="tenue escribiendo">{t("asistente.escribiendo")}</p>}
          <div ref={fin} />
        </div>
      )}

      {vista.tipo === "elegir-reserva" && (
        <div className="asistente-mensajes">
          <p className="pista">{t("asistente.elegirReserva")}</p>
          {reservas.length === 0 && <p className="tenue">{t("asistente.sinReservas")}</p>}
          {reservas.map((r) => (
            <button key={r.id} className="opcion-reserva" onClick={() => setVista({ tipo: "agencia", reserva: r })}>
              {t(`tipo.${r.tipo}`, undefined, r.tipo)} · {r.titulo} · {fechaHora(r.inicio, r.ubicacion?.zonaHoraria)}
            </button>
          ))}
          <div ref={fin} />
        </div>
      )}

      {vista.tipo === "agencia" && (
        <div className="asistente-mensajes">
          <strong>{t("soporte.titulo", { titulo: vista.reserva.titulo })}</strong>
          <PedirAyuda reserva={vista.reserva} />
          <div ref={fin} />
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <footer className="asistente-pie">
        {vista.tipo === "chat" ? (
          <>
            <form className="asistente-form" onSubmit={enviar}>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={1000}
                placeholder={t("asistente.placeholder")}
                aria-label={t("asistente.placeholder")}
                autoFocus
              />
              <button className="primario" disabled={escribiendo || !texto.trim()}>
                {t("asistente.enviar")}
              </button>
            </form>
            <button className={sugerida ? "primario" : ""} onClick={irAAgencia}>
              {t("soporte.enviar")}
            </button>
          </>
        ) : (
          <button onClick={() => setVista({ tipo: "chat" })}>{t("asistente.volver")}</button>
        )}
      </footer>
    </section>
  );
}
