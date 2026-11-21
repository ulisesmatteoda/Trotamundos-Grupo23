// derivar_a_agencia (escalamiento, ADR-014): delega en el SoporteService de la Iteración 5,
// que llama a la agencia con timeout de 2 s y, si falla, reintenta por el Event Bus.
import { Sesion } from "../../../security/AuthService";
import { SoporteService } from "../../SoporteService";
import { ErrorDominio } from "../../errores";
import { IHerramienta, ResultadoHerramienta, UUID } from "../IHerramienta";
import { recursoNoEncontrado } from "../RegistroHerramientas";

export class DerivarAAgencia implements IHerramienta {
  readonly nombre = "derivar_a_agencia";
  readonly descripcion =
    "Deriva un problema con una reserva a la agencia de viajes preferida del usuario, que recibe todos los datos de la reserva. Usala cuando el usuario lo pide, cuando la reserva es de un proveedor (origen EMAIL o AGENCIA) y quiere cambiarla, o cuando no podés resolver el problema. El resumen describe el problema en pocas líneas.";
  readonly tipo = "ESCALAMIENTO" as const;
  readonly esquema = {
    type: "object" as const,
    properties: {
      reservaId: { type: "string" as const, description: "Id de la reserva afectada.", pattern: UUID },
      resumen: { type: "string" as const, description: "Resumen del problema para la agencia (máx. 500 caracteres).", maxLength: 500 },
    },
    required: ["reservaId", "resumen"],
    additionalProperties: false as const,
  };

  async ejecutar(sesion: Sesion, args: Record<string, unknown>): Promise<ResultadoHerramienta> {
    const reservaId = args.reservaId as string;
    try {
      const caso = await SoporteService.solicitarAsistencia(sesion, reservaId, args.resumen);
      return {
        datos: { caso: { estado: caso.estado, agencia: caso.agencia, ticket: caso.ticketAgencia } },
        caso,
        reservaFoco: reservaId,
      };
    } catch (err) {
      if (err instanceof ErrorDominio && err.status === 404) return recursoNoEncontrado(sesion, this.nombre, "reserva", reservaId);
      throw err;
    }
  }
}
