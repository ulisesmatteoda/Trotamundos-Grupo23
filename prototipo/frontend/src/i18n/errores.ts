// Traducción de los códigos de error del backend (schema Error del contrato).
import { ErrorApi } from "../api/cliente";
import { useI18n } from "./I18nProvider";

export function useMensajes() {
  const { t } = useI18n();
  const mensajeError = (codigo: string) => t(`error.${codigo}`, undefined, t("error.ERROR_INTERNO"));
  return {
    mensajeError,
    mensajeCampo: (codigo: string) => t(`campo.${codigo}`, undefined, codigo),
    mensajeDe: (err: unknown) => mensajeError(err instanceof ErrorApi ? err.codigo : "ERROR_INTERNO"),
  };
}
