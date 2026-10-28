// Alta guiada de una reserva (QA-06b): pasos numerados, solo 3 campos obligatorios,
// valores por defecto razonables y validación en línea antes de enviar.
// Las horas se cargan en la hora local del lugar; si la reserva termina en otro lugar
// (vuelo, tren, bus), el fin se carga en la zona del destino (QA-06d, ADR-008).
import { FormEvent, useMemo, useState } from "react";
import { ErrorApi } from "../api/cliente";
import { Reserva, ReservaInput } from "../api/tipos";
import { esZonaValida, localAUtc, utcALocal, zonaDelNavegador, zonasHorarias } from "../i18n/DateTimeFormatter";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";

interface Props {
  inicial?: Reserva;
  onGuardar: (datos: ReservaInput) => Promise<void>;
  onCancelar: () => void;
}

const TIPOS = ["VUELO", "HOTEL", "AUTO", "TREN", "BUS"];
const TIPOS_CON_TRAYECTO = ["VUELO", "TREN", "BUS"];
const MONEDAS = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "GBP"];

export function ReservaForm({ inicial, onGuardar, onCancelar }: Props) {
  const { t } = useI18n();
  const { mensajeDe, mensajeCampo } = useMensajes();

  const zonaInicial = inicial?.ubicacion?.zonaHoraria ?? zonaDelNavegador();
  const zonaFinInicial = inicial?.ubicacionFin?.zonaHoraria ?? zonaInicial;
  const [tipo, setTipo] = useState(inicial?.tipo ?? "VUELO");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [zona, setZona] = useState(zonaInicial);
  const [otroLugar, setOtroLugar] = useState(Boolean(inicial?.ubicacionFin));
  const [zonaFin, setZonaFin] = useState(zonaFinInicial);
  const [inicio, setInicio] = useState(inicial ? utcALocal(inicial.inicio, zonaInicial) : "");
  const [fin, setFin] = useState(inicial?.fin ? utcALocal(inicial.fin, zonaFinInicial) : "");
  const [direccion, setDireccion] = useState(inicial?.ubicacion?.direccion ?? "");
  const [proveedor, setProveedor] = useState(inicial?.proveedor ?? "");
  const [codigo, setCodigo] = useState(inicial?.codigoConfirmacion ?? "");
  const [precio, setPrecio] = useState(inicial?.precio ? String(inicial.precio.valor) : "");
  const [moneda, setMoneda] = useState(inicial?.precio?.moneda ?? "USD");

  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const zonas = useMemo(zonasHorarias, []);

  const conTrayecto = TIPOS_CON_TRAYECTO.includes(tipo) && otroLugar;
  const zonaDelFin = conTrayecto ? zonaFin : zona;

  // Validación local, con los mismos códigos que devuelve el backend. Las horas se comparan
  // como instantes porque inicio y fin pueden estar en zonas distintas.
  const errores: Record<string, string> = { ...erroresServidor };
  if (!esZonaValida(zona)) errores["ubicacion.zonaHoraria"] = "ZONA_HORARIA_INVALIDA";
  if (conTrayecto && !esZonaValida(zonaFin)) errores["ubicacionFin.zonaHoraria"] = "ZONA_HORARIA_INVALIDA";
  const zonasOk = !errores["ubicacion.zonaHoraria"] && !errores["ubicacionFin.zonaHoraria"];
  if (fin && inicio && zonasOk && localAUtc(fin, zonaDelFin) < localAUtc(inicio, zona)) errores.fin = "ANTERIOR_AL_INICIO";
  if (precio && (Number.isNaN(Number(precio)) || Number(precio) < 0)) errores["precio.valor"] = "NUMERO_INVALIDO";
  const completo = titulo.trim() && inicio && zonasOk && !errores.fin && !errores["precio.valor"];

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
        fin: fin ? localAUtc(fin, zonaDelFin) : null,
        ubicacion: { zonaHoraria: zona, direccion: direccion.trim() || undefined },
        ubicacionFin: conTrayecto ? { zonaHoraria: zonaFin } : undefined,
        precio: precio ? { valor: Number(precio), moneda } : undefined,
      });
    } catch (err) {
      setErroresServidor(err instanceof ErrorApi ? err.detalle ?? {} : {});
      setError(mensajeDe(err));
      setEnviando(false);
    }
  }

  const errorDe = (campo: string) =>
    errores[campo] && <span className="error-campo">{mensajeCampo(errores[campo])}</span>;

  return (
    <form className="formulario" onSubmit={enviar}>
      <datalist id="zonas">
        {zonas.map((z) => (
          <option key={z} value={z} />
        ))}
      </datalist>

      <fieldset>
        <legend>{t("reservaForm.paso1")}</legend>
        <div className="tipos" role="radiogroup" aria-label={t("reservaForm.tipos")}>
          {TIPOS.map((valor) => (
            <button
              type="button"
              key={valor}
              role="radio"
              aria-checked={tipo === valor}
              className={tipo === valor ? "tipo activo" : "tipo"}
              onClick={() => setTipo(valor)}
            >
              {t(`tipo.${valor}`)}
            </button>
          ))}
        </div>
        <label>
          {t("reservaForm.titulo")}
          <input
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              limpiarServidor("titulo");
            }}
            placeholder={tipo === "HOTEL" ? t("reservaForm.tituloPlaceholderHotel") : t("reservaForm.tituloPlaceholder")}
            maxLength={160}
            required
            autoFocus
          />
          {errorDe("titulo")}
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("reservaForm.paso2")}</legend>
        <label>
          {conTrayecto ? t("reservaForm.zonaSalida") : t("reservaForm.zona")}
          <input list="zonas" value={zona} onChange={(e) => setZona(e.target.value)} required />
          <span className="pista">{t("reservaForm.zonaPista")}</span>
          {errorDe("ubicacion.zonaHoraria")}
        </label>
        {TIPOS_CON_TRAYECTO.includes(tipo) && (
          <label className="check">
            <input type="checkbox" checked={otroLugar} onChange={(e) => setOtroLugar(e.target.checked)} />
            {t("reservaForm.otroLugar")}
          </label>
        )}
        {conTrayecto && (
          <label>
            {t("reservaForm.zonaLlegada")}
            <input list="zonas" value={zonaFin} onChange={(e) => setZonaFin(e.target.value)} required />
            <span className="pista">{t("reservaForm.zonaLlegadaPista")}</span>
            {errorDe("ubicacionFin.zonaHoraria")}
          </label>
        )}
        <div className="fila">
          <label>
            {t("reservaForm.inicio")}
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
            {t("reservaForm.fin")}
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
            {errorDe("fin")}
          </label>
        </div>
        <label>
          {t("reservaForm.direccion")}
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder={t("comun.opcional")} />
        </label>
      </fieldset>

      <fieldset>
        <legend>{t("reservaForm.paso3")}</legend>
        <div className="fila">
          <label>
            {t("reservaForm.proveedor")}
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder={t("reservaForm.proveedorPlaceholder")} />
          </label>
          <label>
            {t("reservaForm.codigo")}
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </label>
        </div>
        <div className="fila">
          <label>
            {t("reservaForm.precio")}
            <input type="number" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            {errorDe("precio.valor")}
          </label>
          <label>
            {t("reservaForm.moneda")}
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
          {t("comun.cancelar")}
        </button>
        <button className="primario" disabled={enviando || !completo}>
          {inicial ? t("reservaForm.guardar") : t("reservaForm.agregar")}
        </button>
      </div>
    </form>
  );
}
