// KMS / Crypto Vault simulado (ADR-005, Iteración 3). Custodia las claves maestras y solo
// expone dos operaciones: cifrar y descifrar claves de datos. La clave maestra nunca sale
// de este módulo ni se guarda en la base. En producción esto es un servicio gestionado
// (AWS KMS, Azure Key Vault…); acá la clave maestra viene de una variable de entorno.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "../config";

const ALGORITMO = "aes-256-gcm";

// Mapa id → clave maestra: permite rotar sin perder la capacidad de descifrar lo viejo.
const clavesMaestras = new Map<string, Buffer>([[config.kmsClaveId, Buffer.from(config.kmsClaveMaestra, "base64")]]);
for (const [id, clave] of clavesMaestras) {
  if (clave.length !== 32) throw new Error(`La clave maestra ${id} del KMS debe tener 32 bytes (AES-256)`);
}

// Formato de una clave cifrada: base64(iv[12] | tag[16] | ciphertext[32])
export const Kms = {
  claveActiva: config.kmsClaveId,

  cifrarClaveDeDatos(claveDeDatos: Buffer): { kid: string; claveCifrada: string } {
    const iv = randomBytes(12);
    const cifrador = createCipheriv(ALGORITMO, clavesMaestras.get(this.claveActiva)!, iv);
    const cifrada = Buffer.concat([cifrador.update(claveDeDatos), cifrador.final()]);
    return { kid: this.claveActiva, claveCifrada: Buffer.concat([iv, cifrador.getAuthTag(), cifrada]).toString("base64") };
  },

  descifrarClaveDeDatos(kid: string, claveCifrada: string): Buffer {
    const maestra = clavesMaestras.get(kid);
    if (!maestra) throw new Error(`Clave maestra desconocida: ${kid}`);
    const crudo = Buffer.from(claveCifrada, "base64");
    const descifrador = createDecipheriv(ALGORITMO, maestra, crudo.subarray(0, 12));
    descifrador.setAuthTag(crudo.subarray(12, 28));
    return Buffer.concat([descifrador.update(crudo.subarray(28)), descifrador.final()]);
  },
};
