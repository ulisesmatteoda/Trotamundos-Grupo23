// Compartir un viaje con personas designadas (QA-04b, ADR-010): crea enlaces, los lista y los revoca.
// Opcionalmente publica el enlace en una red social con un mensaje del usuario (QA-03c, ADR-009).
import { FormEvent, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { Compartido, Publicacion, Viaje } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";

const enlace = (c: Compartido) => `${window.location.origin}/compartido/${c.enlaceId}`;

export function CompartirViaje({ viaje }: { viaje: Viaje }) {
  const { t } = useI18n();
  const { mensajeDe, mensajeCampo } = useMensajes();
  const [compartidos, setCompartidos] = useState<Compartido[]>([]);
  const [emails, setEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [redes, setRedes] = useState<string[]>([]);
  const [red, setRed] = useState("");
  const [mensaje, setMensaje] = useState(() => t("compartir.mensajeDefault", { viaje: viaje.nombre }));
  const [ultimaPublicacion, setUltimaPublicacion] = useState<Publicacion | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.listarRedes().then(setRedes).catch(() => undefined);
    api.listarCompartidos(viaje.id).then(setCompartidos).catch((err) => setError(mensajeDe(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje.id]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUltimaPublicacion(null);
    setEnviando(true);
    const designados = emails.split(/[,;\s]+/).filter(Boolean);
    try {
      const c = await api.compartirViaje(viaje.id, designados, red || undefined, red ? mensaje : undefined);
      setCompartidos((l) => [c, ...l]);
      setUltimaPublicacion(c.publicacion);
      setEmails("");
    } catch (err) {
      const detalle = err instanceof ErrorApi ? err.detalle : undefined;
      const campo = detalle?.designados ?? detalle?.mensaje ?? detalle?.redSocial;
      setError(campo ? mensajeCampo(campo) : mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  }

  async function revocar(c: Compartido) {
    if (!window.confirm(t("compartir.confirmarRevocar"))) return;
    try {
      await api.revocarCompartido(c.enlaceId);
      setCompartidos((l) => l.filter((x) => x.id !== c.id));
    } catch (err) {
      setError(mensajeDe(err));
    }
  }

  async function copiar(c: Compartido) {
    try {
      await navigator.clipboard.writeText(enlace(c));
      setCopiado(c.id);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      window.prompt(t("compartir.copiar"), enlace(c));
    }
  }

  return (
    <div className="formulario">
      <p className="pista">{t("compartir.pista")}</p>
      <form className="formulario" onSubmit={crear}>
        <label>
          {t("compartir.designados")}
          <input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder={t("compartir.designadosPlaceholder")} autoFocus />
        </label>
        {redes.length > 0 && (
          <label>
            {t("compartir.publicarEn")}
            <select value={red} onChange={(e) => setRed(e.target.value)}>
              <option value="">{t("compartir.noPublicar")}</option>
              {redes.map((r) => (
                <option key={r} value={r}>
                  {t(`red.${r}`, undefined, r)}
                </option>
              ))}
            </select>
          </label>
        )}
        {red && (
          <label>
            {t("compartir.mensaje")}
            <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={200} rows={2} />
            <span className="pista">{t("compartir.mensajePista")}</span>
          </label>
        )}
        <div className="acciones">
          <button className="primario" disabled={!emails.trim() || (Boolean(red) && !mensaje.trim()) || enviando}>
            {t("compartir.crear")}
          </button>
        </div>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {ultimaPublicacion && (
        <p className={ultimaPublicacion.estado === "PUBLICADA" ? "ok-texto" : "aviso-texto"} role="status">
          {t(ultimaPublicacion.estado === "PUBLICADA" ? "compartir.publicada" : "compartir.fallida", {
            red: t(`red.${ultimaPublicacion.redSocial}`, undefined, ultimaPublicacion.redSocial),
          })}
        </p>
      )}

      <fieldset>
        <legend>{t("compartir.activos")}</legend>
        {compartidos.length === 0 && <p className="tenue">{t("compartir.sinEnlaces")}</p>}
        <ul className="lista-simple">
          {compartidos.map((c) => (
            <li key={c.id} className="compartido">
              <div className="compartido-datos">
                <code className="enlace">{enlace(c)}</code>
                <span className="pista">{t("compartir.para", { designados: c.designados.join(", ") })}</span>
              </div>
              <div className="acciones-compactas">
                <button onClick={() => copiar(c)}>{copiado === c.id ? t("compartir.copiado") : t("compartir.copiar")}</button>
                <button className="peligro" onClick={() => revocar(c)}>
                  {t("compartir.revocar")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
