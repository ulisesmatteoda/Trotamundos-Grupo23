// Conexión del usuario con su proveedor de correo (CON-02, QA-04a/c/d; ADR-005).
// El token OAuth2 solo existe en claro en memoria, durante el canje y la revocación:
// se persiste dentro de un sobre de Envelope Encryption.
import type { IProveedorCorreo } from "../integration/email/IProveedorCorreo";
import { ConexionCorreoRepository } from "../persistence/ConexionCorreoRepository";
import { cifrar, descifrar } from "../security/CifradoEnvoltorio";
import { ErrorDominio, invalido } from "./errores";

// Los proveedores se inyectan desde la raíz de composición (server.ts).
const proveedores = new Map<string, IProveedorCorreo>();

function proveedor(nombre: unknown): IProveedorCorreo {
  const p = typeof nombre === "string" ? proveedores.get(nombre) : undefined;
  if (!p) throw invalido({ proveedor: "PROVEEDOR_INVALIDO" });
  return p;
}

export const ConexionCorreoService = {
  configurarProveedores(lista: IProveedorCorreo[]): void {
    proveedores.clear();
    for (const p of lista) proveedores.set(p.nombre, p);
  },

  async estado(usuarioId: string) {
    const c = await ConexionCorreoRepository.deUsuario(usuarioId);
    return c
      ? { conectado: true, proveedor: c.proveedor, casilla: c.casilla, conectadoEn: c.conectadoEn.toISOString() }
      : { conectado: false };
  },

  async conectar(usuarioId: string, nombreProveedor: unknown, codigo: unknown, redirectUri: unknown) {
    const p = proveedor(nombreProveedor);
    if (typeof codigo !== "string" || typeof redirectUri !== "string") {
      throw invalido({ codigo: "REQUERIDO", redirectUri: "REQUERIDO" });
    }
    const token = await p.canjearCodigo(codigo, redirectUri);
    const casilla = await p.casillaDelToken(token);

    const otra = await ConexionCorreoRepository.deCasilla(casilla);
    if (otra && otra.usuarioId !== usuarioId) {
      await p.revocar(token).catch(() => undefined);
      throw new ErrorDominio("CASILLA_YA_CONECTADA", 409);
    }

    const c = await ConexionCorreoRepository.guardar(usuarioId, p.nombre, casilla, cifrar(token));
    return { conectado: true, proveedor: c.proveedor, casilla: c.casilla, conectadoEn: c.conectadoEn.toISOString() };
  },

  // QA-04c: revoca ante el proveedor (con el token descifrado) y elimina el sobre.
  // Si el proveedor no responde, el token igual se elimina: desde Trotamundos ya no se usa más.
  async desconectar(usuarioId: string): Promise<void> {
    const c = await ConexionCorreoRepository.deUsuario(usuarioId);
    if (!c) return;
    const p = proveedores.get(c.proveedor);
    if (p) await p.revocar(descifrar(c.tokenSobre)).catch((err) => console.error("[correo] no se pudo revocar ante el proveedor", err));
    await ConexionCorreoRepository.eliminar(usuarioId);
  },

  // Usuario dueño de la casilla, solo si la casilla tiene una conexión vigente.
  async usuarioDeCasilla(casilla: string): Promise<string | null> {
    return (await ConexionCorreoRepository.deCasilla(casilla))?.usuarioId ?? null;
  },
};
