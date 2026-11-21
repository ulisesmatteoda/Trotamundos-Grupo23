// listar_viajes (lectura): viajes activos del usuario con sus reservas resumidas.
import { Sesion } from "../../../security/AuthService";
import { ViajeService } from "../../ViajeService";
import { ContextoLlmBuilder } from "../ContextoLlmBuilder";
import { IHerramienta, ResultadoHerramienta } from "../IHerramienta";

export class ListarViajes implements IHerramienta {
  readonly nombre = "listar_viajes";
  readonly descripcion =
    "Lista los viajes activos del usuario con sus fechas y un resumen de cada reserva (id, tipo, título, estado, origen e inicio en hora local). Usala para ubicar un viaje o una reserva antes de consultarla o proponer cambios.";
  readonly tipo = "LECTURA" as const;
  readonly esquema = { type: "object" as const, properties: {}, required: [], additionalProperties: false as const };

  async ejecutar(sesion: Sesion): Promise<ResultadoHerramienta> {
    const { viajes } = await ViajeService.listar(sesion.usuarioId, false);
    return { datos: { viajes: viajes.map((v) => ContextoLlmBuilder.viajeResumido(v)) } };
  }
}
