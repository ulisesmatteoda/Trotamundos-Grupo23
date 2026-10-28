// Sesión del usuario en el cliente. El JWT se guarda en localStorage solo como comodidad
// para no reingresar al recargar; el backend lo valida en cada request (ADR-005).
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, configurarSesion } from "./api/cliente";
import { Usuario } from "./api/tipos";

const CLAVE = "trotamundos.sesion";

interface DatosSesion {
  token: string;
  usuario: Usuario;
}

interface ContextoSesion {
  usuario: Usuario | null;
  ingresar: (email: string, password: string) => Promise<void>;
  salir: () => void;
}

const Contexto = createContext<ContextoSesion | null>(null);

function leerGuardada(): DatosSesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function guardar(datos: DatosSesion | null): void {
  try {
    if (datos) localStorage.setItem(CLAVE, JSON.stringify(datos));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin storage disponible la sesión dura lo que la pestaña.
  }
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<DatosSesion | null>(leerGuardada);

  const salir = useCallback(() => {
    guardar(null);
    setSesion(null);
  }, []);

  // Se configura durante el render para que los hijos ya tengan el token en su primer efecto.
  configurarSesion(sesion?.token ?? null, salir);
  useEffect(() => () => configurarSesion(null, () => undefined), []);

  const ingresar = useCallback(async (email: string, password: string) => {
    const datos = await api.login(email, password);
    guardar(datos);
    setSesion(datos);
  }, []);

  const valor = useMemo(() => ({ usuario: sesion?.usuario ?? null, ingresar, salir }), [sesion, ingresar, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useSesion fuera de ProveedorSesion");
  return ctx;
}
