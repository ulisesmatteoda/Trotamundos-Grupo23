// Remitentes seguros (QA-03b) y sincronización con proveedores (UC-01, ADR-002).
// La lista de proveedores viene del backend: sumar un adaptador no requiere cambios acá (QA-05a).
import { FormEvent, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { RemitenteSeguro, ResultadoSincronizacion } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";
import { Aviso, ConexionCorreo } from "./ConexionCorreo";

// Se guardan resultados y códigos (no textos) para que todo siga al idioma elegido.
type EstadoSync = { resultado: ResultadoSincronizacion } | { error: string };
type ErrorRemitente = { campo: string } | { codigo: string };

const codigoDe = (err: unknown) => (err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO");

export function Integraciones({ onSincronizado, avisoCorreo }: { onSincronizado: () => void; avisoCorreo?: Aviso | null }) {
  const { t } = useI18n();
  const { mensajeError, mensajeCampo } = useMensajes();
  const [remitentes, setRemitentes] = useState<RemitenteSeguro[]>([]);
  const [agencias, setAgencias] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [errorRemitente, setErrorRemitente] = useState<ErrorRemitente | null>(null);
  const [estado, setEstado] = useState<Record<string, EstadoSync>>({});
  const [ocupada, setOcupada] = useState<string | null>(null);

  useEffect(() => {
    api.listarRemitentes().then(setRemitentes).catch(() => undefined);
    api.listarAgencias().then(setAgencias).catch(() => undefined);
  }, []);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    setErrorRemitente(null);
    try {
      const creado = await api.agregarRemitente(nuevo);
      setRemitentes((r) => [...r, creado].sort((a, b) => a.remitente.localeCompare(b.remitente)));
      setNuevo("");
    } catch (err) {
      const campo = err instanceof ErrorApi ? err.detalle?.remitente : undefined;
      setErrorRemitente(campo ? { campo } : { codigo: codigoDe(err) });
    }
  }

  async function quitar(r: RemitenteSeguro) {
    try {
      await api.eliminarRemitente(r.id);
      setRemitentes((lista) => lista.filter((x) => x.id !== r.id));
    } catch (err) {
      setErrorRemitente({ codigo: codigoDe(err) });
    }
  }

  async function sincronizar(agencia: string) {
    setOcupada(agencia);
    try {
      const resultado = await api.sincronizarAgencia(agencia);
      setEstado((e) => ({ ...e, [agencia]: { resultado } }));
      onSincronizado();
    } catch (err) {
      setEstado((e) => ({ ...e, [agencia]: { error: codigoDe(err) } }));
    } finally {
      setOcupada(null);
    }
  }

  const textoEstado = (e: EstadoSync) =>
    "resultado" in e
      ? t("integraciones.resultado", { creadas: e.resultado.creadas, actualizadas: e.resultado.actualizadas, canceladas: e.resultado.canceladas })
      : mensajeError(e.error);

  return (
    <div className="formulario">
      <ConexionCorreo aviso={avisoCorreo} />

      <fieldset>
        <legend>{t("integraciones.remitentes")}</legend>
        <p className="pista">{t("integraciones.remitentesPista")}</p>
        {remitentes.length === 0 && <p className="tenue">{t("integraciones.sinRemitentes")}</p>}
        <ul className="lista-simple">
          {remitentes.map((r) => (
            <li key={r.id}>
              <code>{r.remitente}</code>
              <button className="peligro" onClick={() => quitar(r)} aria-label={t("integraciones.quitarAria", { remitente: r.remitente })}>
                {t("integraciones.quitar")}
              </button>
            </li>
          ))}
        </ul>
        <form className="fila-alineada" onSubmit={agregar}>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder={t("integraciones.placeholder")} />
          <button className="primario" disabled={!nuevo.trim()}>
            {t("integraciones.agregar")}
          </button>
        </form>
        {errorRemitente && (
          <p className="error" role="alert">
            {"campo" in errorRemitente ? mensajeCampo(errorRemitente.campo) : mensajeError(errorRemitente.codigo)}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>{t("integraciones.sincronizarTitulo")}</legend>
        <p className="pista">{t("integraciones.sincronizarPista")}</p>
        <ul className="lista-simple">
          {agencias.map((a) => (
            <li key={a}>
              <div>
                <strong>{t(`agencia.${a}`, undefined, a)}</strong>
                {estado[a] && <div className="pista">{textoEstado(estado[a])}</div>}
              </div>
              <button onClick={() => sincronizar(a)} disabled={ocupada !== null}>
                {ocupada === a ? t("integraciones.sincronizando") : t("integraciones.sincronizar")}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
