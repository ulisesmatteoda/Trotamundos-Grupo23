// Contrato del ACL con el proveedor de correo para la autorización OAuth2 (CON-02, ADR-002).
export interface IProveedorCorreo {
  readonly nombre: string;
  // Canjea el authorization code por un token de acceso (de servidor a servidor).
  canjearCodigo(codigo: string, redirectUri: string): Promise<string>;
  // Casilla a la que da acceso el token.
  casillaDelToken(token: string): Promise<string>;
  // Revoca el token ante el proveedor.
  revocar(token: string): Promise<void>;
}
