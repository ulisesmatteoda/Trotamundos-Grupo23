// Envelope Encryption (ADR-005): cada secreto se cifra con su propia clave de datos AES-256
// (generada al momento), y esa clave de datos se guarda cifrada por la clave maestra del KMS.
// En la base solo queda el "sobre": nada de lo guardado permite descifrar sin el KMS.
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Kms } from "./Kms";

export interface Sobre {
  kid: string; // clave maestra que cifró la clave de datos (para rotación)
  claveCifrada: string; // clave de datos cifrada por el KMS
  iv: string;
  tag: string;
  datos: string; // secreto cifrado con la clave de datos
}

export function cifrar(texto: string): Sobre {
  const claveDeDatos = randomBytes(32);
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", claveDeDatos, iv);
  const datos = Buffer.concat([cifrador.update(texto, "utf8"), cifrador.final()]);
  const sobre: Sobre = {
    ...Kms.cifrarClaveDeDatos(claveDeDatos),
    iv: iv.toString("base64"),
    tag: cifrador.getAuthTag().toString("base64"),
    datos: datos.toString("base64"),
  };
  claveDeDatos.fill(0); // la clave en claro no queda en memoria más de lo necesario
  return sobre;
}

export function descifrar(sobre: Sobre): string {
  const claveDeDatos = Kms.descifrarClaveDeDatos(sobre.kid, sobre.claveCifrada);
  try {
    const descifrador = createDecipheriv("aes-256-gcm", claveDeDatos, Buffer.from(sobre.iv, "base64"));
    descifrador.setAuthTag(Buffer.from(sobre.tag, "base64"));
    return Buffer.concat([descifrador.update(Buffer.from(sobre.datos, "base64")), descifrador.final()]).toString("utf8");
  } finally {
    claveDeDatos.fill(0);
  }
}
