// Gestión de la whitelist de remitentes seguros del usuario (QA-03b).
import { RemitenteRepository } from "../persistence/RemitenteRepository";
import { ErrorDominio, invalido, noEncontrado } from "./errores";
import { esEntradaValida, normalizarRemitente } from "./whitelist";

export const RemitentesService = {
  listar: RemitenteRepository.listar,

  async agregar(usuarioId: string, remitente: unknown) {
    if (typeof remitente !== "string" || !esEntradaValida(remitente)) throw invalido({ remitente: "REMITENTE_INVALIDO" });
    const creado = await RemitenteRepository.agregar(usuarioId, normalizarRemitente(remitente));
    if (!creado) throw new ErrorDominio("REMITENTE_DUPLICADO", 409);
    return creado;
  },

  async eliminar(usuarioId: string, id: string) {
    if (!(await RemitenteRepository.eliminar(usuarioId, id))) throw noEncontrado("REMITENTE_NO_ENCONTRADO");
  },
};
