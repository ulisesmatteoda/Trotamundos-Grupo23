// Alta guiada de una reserva (QA-06b): pasos numerados, solo 3 campos obligatorios,
// valores por defecto razonables y validación en línea antes de enviar.
import { FormEvent, useMemo, useState } from "react";
import { ErrorApi } from "../api/cliente";
import { Reserva, ReservaInput } from "../api/tipos";
import { esZonaValida, localAUtc, utcALocal, zonaDelNavegador, zonasHorarias } from "../fechas";
import { mensajeCampo, mensajeError, TIPOS_RESERVA } from "../textos";

interface Props {
  inicial?: Reserva;
  onGuardar: (datos: ReservaInput) => Promise<void>;
  onCancelar: () => void;
}

const MONEDAS = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "GBP"];

export function ReservaForm({ inicial, onGuardar, onCancelar }: Props) {
  const zonaInicial = inicial?.ubicacion?.zonaHoraria ?? zonaDelNavegador();
  const [tipo, setTipo] = useState(inicial?.tipo ?? "VUELO");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [zona, setZona] = useState(zonaInicial);
  const [inicio, setInicio] = useState(inicial ? utcALocal(inicial.inicio, zonaInicial) : "");
  const [fin, setFin] = useState(inicial?.fin ? utcALocal(inicial.fin, zonaInicial) : "");
  const [direccion, setDireccion] = useState(inicial?.ubicacion?.direccion ?? "");
  const [proveedor, setProveedor] = useState(inicial?.proveedor ?? "");
  const [codigo, setCodigo] = useState(inicial?.codigoConfirmacion ?? "");
  const [precio, setPrecio] = useState(inicial?.precio ? String(inicial.precio.valor) : "");
  const [moneda, setMoneda] = useState(inicial?.precio?.moneda ?? "USD");

  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const zonas = useMemo(zonasHorarias, []);

  // Validación local, con los mismos códigos que devuelve el backend.
  const zonaValida = esZonaValida(zona);
  const errores: Record<string, string> = { ...erroresServidor };
  if (!zonaValida) errores["ubicacion.zonaHoraria"] = "ZONA_HORARIA_INVALIDA";
  if (fin && inicio && fin < inicio) errores.fin = "ANTERIOR_AL_INICIO";
  if (precio && (Number.isNaN(Number(precio)) || Number(precio) < 0)) errores["precio.valor"] = "NUMERO_INVALIDO";
  const completo = titulo.trim() && inicio && zonaValida && !errores.fin && !errores["precio.valor"];

  const limpiarServidor = (campo: string) => {
    if (erroresServidor[campo]) setErroresServidor(({ [campo]: _, ...resto }) => resto);
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!completo) return;
    setEnviando(true);
    setError(null);
    try {
      await onGuardar({
        tipo,
        titulo: titulo.trim(),
        proveedor: proveedor.trim() || undefined,
        codigoConfirmacion: codigo.trim() || undefined,
        inicio: localAUtc(inicio, zona),
        fin: fin ? localAUtc(fin, zona) : null,
        ubicacion: { zonaHoraria: zona, direccion: direccion.trim() || undefined },
        precio: precio ? { valor: Number(precio), moneda } : undefined,
      });
    } catch (err) {
      setErroresServidor(err instanceof ErrorApi ? err.detalle ?? {} : {});
      setError(mensajeError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"));
      setEnviando(false);
    }
  }

  const errorDe = (campo: string) =>
    errores[campo] && <span className="error-campo">{mensajeCampo(errores[campo])}</span>;

  return (
    <form className="formulario" onSubmit={enviar}>
      <fieldset>
        <legend>1. ¿Qué reservaste?</legend>
        <div className="tipos" role="radiogroup" aria-label="Tipo de reserva">
          {Object.entries(TIPOS_RESERVA).map(([valor, etiqueta]) => (
            <button
              type="button"
              key={valor}
              role="radio"
              aria-checked={tipo === valor}
              className={tipo === valor ? "tipo activo" : "tipo"}
              onClick={() => setTipo(valor)}
            >
              {etiqueta}
            </button>
          ))}
        </div>
        <label>
          Título *
          <input
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              limpiarServidor("titulo");
            }}
            placeholder={tipo === "HOTEL" ? "Ej. Hotel Central" : "Ej. Buenos Aires → Madrid"}
            maxLength={160}
            required
            autoFocus
          />
          {errorDe("titulo")}
        </label>
      </fieldset>

      <fieldset>
        <legend>2. ¿Cuándo y dónde?</legend>
        <label>
          Zona horaria del lugar *
          <input list="zonas" value={zona} onChange={(e) => setZona(e.target.value)} required />
          <datalist id="zonas">
            {zonas.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <span className="pista">Las horas se cargan en la hora local de este lugar.</span>
          {errorDe("ubicacion.zonaHoraria")}
        </label>
        <div className="fila">
          <label>
            Inicio *
            <input
              type="datetime-local"
              value={inicio}
              onChange={(e) => {
                setInicio(e.target.value);
                limpiarServidor("inicio");
              }}
              required
            />
            {errorDe("inicio")}
          </label>
          <label>
            Fin
            <input type="datetime-local" value={fin} min={inicio || undefined} onChange={(e) => setFin(e.target.value)} />
            {errorDe("fin")}
          </label>
        </div>
        <label>
          Dirección
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Opcional" />
        </label>
      </fieldset>

      <fieldset>
        <legend>3. Detalles (opcional)</legend>
        <div className="fila">
          <label>
            Proveedor
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Ej. Iberia" />
          </label>
          <label>
            Código de confirmación
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </label>
        </div>
        <div className="fila">
          <label>
            Precio
            <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            {errorDe("precio.valor")}
          </label>
          <label>
            Moneda
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)}>
              {MONEDAS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="button" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="primario" disabled={enviando || !completo}>
          {inicial ? "Guardar cambios" : "Agregar reserva"}
        </button>
      </div>
    </form>
  );
}
