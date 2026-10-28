// Hash de contraseñas con scrypt (módulo crypto de Node), formato "salt:hash" en hex.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (pwd: string, salt: Buffer, len: number) => Promise<Buffer>;
const LARGO = 32;

export async function hashear(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, LARGO);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verificar(password: string, guardado: string): Promise<boolean> {
  const [saltHex, hashHex] = guardado.split(":");
  const esperado = Buffer.from(hashHex, "hex");
  const hash = await scrypt(password, Buffer.from(saltHex, "hex"), esperado.length);
  return timingSafeEqual(hash, esperado);
}
