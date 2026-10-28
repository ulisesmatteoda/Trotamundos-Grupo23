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

  async publicar(cola: string, evento: object): Promise<void> {
    await this.conectar();
    await this.canal!.assertQueue(cola, { durable: true });
    this.canal!.sendToQueue(cola, Buffer.from(JSON.stringify(evento)), { persistent: true });
  }

  // Un mensaje por worker a la vez (prefetch 1): así, al escalar workers,
  // la cola se reparte entre todos (ADR-006).
  async suscribir(cola: string, manejar: Manejador): Promise<void> {
    await this.conectar();
    const canal = this.canal!;
    await canal.assertQueue(cola, { durable: true });
    await canal.prefetch(1);
    await canal.consume(cola, async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        await manejar(JSON.parse(msg.content.toString()));
        canal.ack(msg);
      } catch (err) {
        console.error(`[EventBus] error procesando mensaje de ${cola}`, err);
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
