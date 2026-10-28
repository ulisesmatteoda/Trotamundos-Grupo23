// Remitentes seguros (QA-03b) y sincronización con proveedores (UC-01, ADR-002).
// La lista de proveedores viene del backend: sumar un adaptador no requiere cambios acá (QA-05a).
import { FormEvent, useEffect, useState } from "react";
import { api, ErrorApi } from "../api/cliente";
import { RemitenteSeguro } from "../api/tipos";
import { mensajeCampo, mensajeError, NOMBRE_AGENCIA } from "../textos";

const codigoDe = (err: unknown) => (err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO");

export function Integraciones({ onSincronizado }: { onSincronizado: () => void }) {
  const [remitentes, setRemitentes] = useState<RemitenteSeguro[]>([]);
  const [agencias, setAgencias] = useState<string[]>([]);
  const [nuevo, setNuevo] = useState("");
  const [errorRemitente, setErrorRemitente] = useState<string | null>(null);
  const [estado, setEstado] = useState<Record<string, string>>({});
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
      const detalle = err instanceof ErrorApi ? err.detalle?.remitente : undefined;
      setErrorRemitente(detalle ? mensajeCampo(detalle) : mensajeError(codigoDe(err)));
    }
  }

  async function quitar(r: RemitenteSeguro) {
    try {
      await api.eliminarRemitente(r.id);
      setRemitentes((lista) => lista.filter((x) => x.id !== r.id));
    } catch (err) {
      setErrorRemitente(mensajeError(codigoDe(err)));
    }
  }

  async function sincronizar(agencia: string) {
    setOcupada(agencia);
    try {
      const r = await api.sincronizarAgencia(agencia);
      setEstado((e) => ({
        ...e,
        [agencia]: `${r.creadas} nuevas · ${r.actualizadas} actualizadas · ${r.canceladas} canceladas`,
      }));
      onSincronizado();
    } catch (err) {
      setEstado((e) => ({ ...e, [agencia]: mensajeError(codigoDe(err)) }));
    } finally {
      setOcupada(null);
    }
  }

  return (
    <div className="formulario">
      <fieldset>
        <legend>Remitentes seguros</legend>
        <p className="pista">Solo se leen los correos de estos remitentes para agregar reservas automáticamente.</p>
        {remitentes.length === 0 && <p className="tenue">Todavía no agregaste remitentes.</p>}
        <ul className="lista-simple">
          {remitentes.map((r) => (
            <li key={r.id}>
              <code>{r.remitente}</code>
              <button className="peligro" onClick={() => quitar(r)} aria-label={`Quitar ${r.remitente}`}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
        <form className="fila-alineada" onSubmit={agregar}>
          <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="@aerolinea.com o reservas@hotel.com" />
          <button className="primario" disabled={!nuevo.trim()}>
            Agregar
          </button>
        </form>
        {errorRemitente && <p className="error" role="alert">{errorRemitente}</p>}
      </fieldset>

      <fieldset>
        <legend>Sincronizar con proveedores</legend>
        <p className="pista">Trae las reservas que tenés en cada proveedor y las agrupa en tus viajes.</p>
        <ul className="lista-simple">
          {agencias.map((a) => (
            <li key={a}>
              <div>
                <strong>{NOMBRE_AGENCIA[a] ?? a}</strong>
                {estado[a] && <div className="pista">{estado[a]}</div>}
              </div>
              <button onClick={() => sincronizar(a)} disabled={ocupada !== null}>
                {ocupada === a ? "Sincronizando…" : "Sincronizar"}
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}
