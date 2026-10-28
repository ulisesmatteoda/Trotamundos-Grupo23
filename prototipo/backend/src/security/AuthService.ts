// Auth Manager (Iteración 3, Paso 5.1): emite y valida los JWT que el Gateway exige
// en toda ruta protegida (ADR-005).
import jwt from "jsonwebtoken";
import { config } from "../config";
import { ErrorDominio } from "../domain/errores";
import { UsuarioRepository } from "../persistence/UsuarioRepository";
import { verificar } from "./passwords";

export interface Sesion {
  usuarioId: string;
  email: string;
}

export const AuthService = {
  async login(email: string, password: string) {
    const usuario = await UsuarioRepository.porEmail(email);
    // Mismo error para usuario inexistente y contraseña incorrecta.
    if (!usuario || !(await verificar(password, usuario.passwordHash))) {
      throw new ErrorDominio("CREDENCIALES_INVALIDAS", 401);
    }
    const token = jwt.sign({ email: usuario.email }, config.jwtSecret, {
      subject: usuario.id,
      expiresIn: config.jwtExpiracion,
    } as jwt.SignOptions);
    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        localePreferido: usuario.localePreferido,
      },
    };
  },

  validar(token: string): Sesion {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      return { usuarioId: payload.sub as string, email: payload.email };
    } catch {
      throw new ErrorDominio("TOKEN_INVALIDO", 401);
    }
  },
};
