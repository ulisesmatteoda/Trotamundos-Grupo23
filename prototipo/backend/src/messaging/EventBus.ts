// Event Bus / Message Broker (ADR-003) sobre RabbitMQ.
// Los publishers y subscribers solo conocen esta clase, no amqplib.
import amqp, { Channel, ConsumeMessage } from "amqplib";
import { config } from "../config";

export type Manejador = (evento: unknown) => Promise<void>;
type Conexion = Awaited<ReturnType<typeof amqp.connect>>;

export class EventBus {
  private conexion?: Conexion;
  private canal?: Channel;

  async conectar(): Promise<void> {
    if (this.canal) return;
    this.conexion = await amqp.connect(config.rabbitUrl);
    this.conexion.on("close", () => {
      this.conexion = undefined;
      this.canal = undefined;
    });
    this.canal = await this.conexion.createChannel();
  }

  estaConectado(): boolean {
    return this.canal !== undefined;
  }

  // Cola durable con su cola de mensajes fallidos (<cola>.dlq): un evento que no se pudo
  // procesar no se pierde, queda para inspección o reproceso.
  private async asegurarCola(cola: string): Promise<Channel> {
    await this.conectar();
    const canal = this.canal!;
    await canal.assertQueue(`${cola}.dlq`, { durable: true });
    await canal.assertQueue(cola, {
      durable: true,
      arguments: { "x-dead-letter-exchange": "", "x-dead-letter-routing-key": `${cola}.dlq` },
    });
    return canal;
  }

  async publicar(cola: string, evento: object): Promise<void> {
    const canal = await this.asegurarCola(cola);
    canal.sendToQueue(cola, Buffer.from(JSON.stringify(evento)), { persistent: true, contentType: "application/json" });
  }

  // Publicación diferida (reintentos con espera): el mensaje queda en <cola>.espera con un TTL
  // y, al vencer, RabbitMQ lo reenvía a la cola principal (dead-lettering).
  async publicarConDemora(cola: string, evento: object, demoraMs: number): Promise<void> {
    const canal = await this.asegurarCola(cola);
    await canal.assertQueue(`${cola}.espera`, {
      durable: true,
      arguments: { "x-dead-letter-exchange": "", "x-dead-letter-routing-key": cola },
    });
    canal.sendToQueue(`${cola}.espera`, Buffer.from(JSON.stringify(evento)), {
      persistent: true,
      contentType: "application/json",
      expiration: String(demoraMs),
    });
  }

  // Un mensaje por worker a la vez (prefetch 1): así, al escalar workers,
  // la cola se reparte entre todos (ADR-006).
  async suscribir(cola: string, manejar: Manejador): Promise<void> {
    const canal = await this.asegurarCola(cola);
    await canal.prefetch(1);
    await canal.consume(cola, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        await manejar(JSON.parse(msg.content.toString()));
        canal.ack(msg);
      } catch (err) {
        console.error(`[EventBus] error procesando mensaje de ${cola}, se envía a ${cola}.dlq`, err);
        canal.nack(msg, false, false);
      }
    });
  }
}

export const eventBus = new EventBus();

export async function pingRabbit(): Promise<boolean> {
  try {
    await eventBus.conectar();
    return eventBus.estaConectado();
  } catch {
    return false;
  }
}
