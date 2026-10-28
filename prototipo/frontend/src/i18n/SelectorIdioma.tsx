import { LOCALES, useI18n } from "./I18nProvider";

export function SelectorIdioma() {
  const { locale, cambiarLocale, t } = useI18n();
  return (
    <select className="selector-idioma" aria-label={t("app.idioma")} value={locale} onChange={(e) => cambiarLocale(e.target.value)}>
      {LOCALES.map((l) => (
        <option key={l.locale} value={l.locale}>
          {l.nombre}
        </option>
      ))}
    </select>
  );
}
