import { FormEvent, useState } from "react";
import { ErrorApi } from "../api/cliente";
import { Viaje, ViajeInput } from "../api/tipos";
import { useI18n } from "../i18n/I18nProvider";
import { useMensajes } from "../i18n/errores";

interface Props {
  inicial?: Viaje;
  onGuardar: (datos: ViajeInput) => Promise<void>;
  onCancelar: () => void;
}

export function ViajeForm({ inicial, onGuardar, onCancelar }: Props) {
  const { t } = useI18n();
  const { mensajeDe, mensajeCampo } = useMensajes();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [destino, setDestino] = useState(inicial?.destino ?? "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await onGuardar({ nombre, destino: destino || undefined });
    } catch (err) {
      setErrores(err instanceof ErrorApi ? err.detalle ?? {} : {});
      setError(mensajeDe(err));
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label>
        {t("viajeForm.nombre")}
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={t("viajeForm.nombrePlaceholder")}
          required
          maxLength={120}
          autoFocus
        />
        {errores.nombre && <span className="error-campo">{mensajeCampo(errores.nombre)}</span>}
      </label>
      <label>
        {t("viajeForm.destino")}
        <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder={t("viajeForm.destinoPlaceholder")} maxLength={120} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="button" onClick={onCancelar}>
          {t("comun.cancelar")}
        </button>
        <button className="primario" disabled={enviando || !nombre.trim()}>
          {inicial ? t("viajeForm.guardar") : t("viajeForm.crear")}
        </button>
      </div>
    </form>
  );
}
