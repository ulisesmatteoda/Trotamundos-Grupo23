// consultar_viaje (lectura): reservas de un viaje con estado, horarios locales y códigos.
import { Sesion } from "../../../security/AuthService";
import { ViajeService } from "../../ViajeService";
import { ErrorDominio } from "../../errores";
import { ContextoLlmBuilder } from "../ContextoLlmBuilder";
import { IHerramienta, ResultadoHerramienta, UUID } from "../IHerramienta";
import { recursoNoEncontrado } from "../RegistroHerramientas";

export class ConsultarViaje implements IHerramienta {
  readonly nombre = "consultar_viaje";
  readonly descripcion =
    "Devuelve el detalle de un viaje del usuario: cada reserva con su tipo, título, proveedor, código de confirmación, estado, origen y horarios de inicio y fin en la hora local de la reserva.";
  readonly tipo = "LECTURA" as const;
  readonly esquema = {
    type: "object" as const,
    properties: { viajeId: { type: "string" as const, description: "Id del viaje (de listar_viajes).", pattern: UUID } },
    required: ["viajeId"],
    additionalProperties: false as const,
  };

  async ejecutar(sesion: Sesion, args: Record<string, unknown>): Promise<ResultadoHerramienta> {
    const viajeId = args.viajeId as string;
    try {
      const viaje = await ViajeService.obtener(sesion.usuarioId, viajeId);
      return { datos: { viaje: ContextoLlmBuilder.viaje(viaje) } };
    } catch (err) {
      if (err instanceof ErrorDominio && err.status === 404) return recursoNoEncontrado(sesion, this.nombre, "viaje", viajeId);
      throw err;
    }
  }
}
