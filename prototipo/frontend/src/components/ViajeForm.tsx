import { FormEvent, useState } from "react";
import { ErrorApi } from "../api/cliente";
import { Viaje, ViajeInput } from "../api/tipos";
import { mensajeCampo, mensajeError } from "../textos";

interface Props {
  inicial?: Viaje;
  onGuardar: (datos: ViajeInput) => Promise<void>;
  onCancelar: () => void;
}

export function ViajeForm({ inicial, onGuardar, onCancelar }: Props) {
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
      const codigo = err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO";
      setErrores(err instanceof ErrorApi ? err.detalle ?? {} : {});
      setError(mensajeError(codigo));
      setEnviando(false);
    }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <label>
        Nombre del viaje *
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Vacaciones en Brasil" required maxLength={120} autoFocus />
        {errores.nombre && <span className="error-campo">{mensajeCampo(errores.nombre)}</span>}
      </label>
      <label>
        Destino
        <input value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ej. Florianópolis" maxLength={120} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="acciones">
        <button type="button" onClick={onCancelar}>
          Cancelar
        </button>
        <button className="primario" disabled={enviando || !nombre.trim()}>
          {inicial ? "Guardar cambios" : "Crear viaje"}
        </button>
      </div>
    </form>
  );
}
