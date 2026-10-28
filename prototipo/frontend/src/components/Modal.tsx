import { ReactNode, useEffect } from "react";
import { useI18n } from "../i18n/I18nProvider";

export function Modal({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  const { t } = useI18n();

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onCerrar]);

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="modal-encabezado">
          <h2>{titulo}</h2>
          <button className="icono" onClick={onCerrar} aria-label={t("comun.cerrar")}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
