// Compartir un viaje con personas designadas (QA-04b, ADR-010): crea enlaces, los lista y los revoca.
import { FormEvent, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { Compartido, Viaje } from "../api/tipos";
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

  useEffect(() => {
    api.listarCompartidos(viaje.id).then(setCompartidos).catch((err) => setError(mensajeDe(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje.id]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const designados = emails.split(/[,;\s]+/).filter(Boolean);
    try {
      const c = await api.compartirViaje(viaje.id, designados);
      setCompartidos((l) => [c, ...l]);
      setEmails("");
    } catch (err) {
      const campo = err instanceof ErrorApi ? err.detalle?.designados : undefined;
      setError(campo ? mensajeCampo(campo) : mensajeDe(err));
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
        <div className="acciones">
          <button className="primario" disabled={!emails.trim()}>
            {t("compartir.crear")}
          </button>
        </div>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

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
