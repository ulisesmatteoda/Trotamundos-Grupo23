// i18n Context / Provider (Iteración 4, Vista de Módulos; ADR-008).
// Los componentes visuales no tienen textos ni formatos fijos: dependen de este proveedor,
// que expone la traducción (t) y los formateadores según el locale elegido.
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Monto } from "../api/tipos";
import { formatearMoneda } from "./CurrencyFormatter";
import { formatearDia, formatearFechaHora } from "./DateTimeFormatter";
import { cargarIdioma, Diccionario, Parametros, traducir } from "./TranslatorService";

export const LOCALES = [
  { locale: "es-AR", nombre: "Español" },
  { locale: "en-US", nombre: "English" },
  { locale: "pt-BR", nombre: "Português" },
] as const;

const CLAVE = "trotamundos.locale";
const idiomaDe = (locale: string) => locale.split("-")[0];

// Locale soportado más cercano al pedido (ej. "en-GB" → "en-US", "pt" → "pt-BR").
function soportado(pedido: string): string {
  const exacto = LOCALES.find((l) => l.locale.toLowerCase() === pedido.toLowerCase());
  return (exacto ?? LOCALES.find((l) => idiomaDe(l.locale) === idiomaDe(pedido)) ?? LOCALES[0]).locale;
}

function leerElegido(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

interface ContextoI18n {
  locale: string;
  // true si el usuario eligió el idioma a mano (tiene prioridad sobre su preferencia de cuenta)
  elegidoManualmente: boolean;
  cambiarLocale: (locale: string, manual?: boolean) => void;
  t: (clave: string, params?: Parametros, respaldo?: string) => string;
  fechaHora: (iso: string, zona?: string) => string;
  dia: (iso: string, zona?: string) => string;
  moneda: (monto: Monto) => string;
}

const Contexto = createContext<ContextoI18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [elegido, setElegido] = useState<string | null>(leerElegido);
  const [locale, setLocale] = useState(() => soportado(elegido ?? navigator.language));
  const [diccionario, setDiccionario] = useState<Diccionario | null>(null);

  useEffect(() => {
    let vigente = true;
    cargarIdioma(idiomaDe(locale))
      .catch(() => cargarIdioma(idiomaDe(LOCALES[0].locale)))
      .then((dic) => vigente && setDiccionario(dic));
    document.documentElement.lang = locale;
    return () => {
      vigente = false;
    };
  }, [locale]);

  const cambiarLocale = useCallback((nuevo: string, manual = true) => {
    const l = soportado(nuevo);
    setLocale(l);
    if (manual) {
      setElegido(l);
      try {
        localStorage.setItem(CLAVE, l);
      } catch {
        // sin storage, la elección dura lo que la pestaña
      }
    }
  }, []);

  const valor = useMemo<ContextoI18n | null>(() => {
    if (!diccionario) return null;
    return {
      locale,
      elegidoManualmente: elegido !== null,
      cambiarLocale,
      t: (clave, params, respaldo) => traducir(diccionario, clave, params, respaldo),
      fechaHora: (iso, zona) => formatearFechaHora(iso, locale, zona),
      dia: (iso, zona) => formatearDia(iso, locale, zona),
      moneda: (monto) => formatearMoneda(monto, locale),
    };
  }, [diccionario, locale, elegido, cambiarLocale]);

  // Hasta que llega el primer paquete de idioma no se muestra texto sin traducir.
  if (!valor) return null;
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useI18n(): ContextoI18n {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useI18n fuera de I18nProvider");
  return ctx;
}
