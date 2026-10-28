// Ruteo mínimo del SPA sobre la History API (nginx devuelve index.html para cualquier ruta).
import { useEffect, useState } from "react";

export function navegar(ruta: string): void {
  window.history.pushState(null, "", ruta);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useRuta(): string {
  const [ruta, setRuta] = useState(window.location.pathname);
  useEffect(() => {
    const alCambiar = () => setRuta(window.location.pathname);
    window.addEventListener("popstate", alCambiar);
    return () => window.removeEventListener("popstate", alCambiar);
  }, []);
  return ruta;
}
