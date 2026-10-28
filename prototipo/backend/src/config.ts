// Configuración leída del entorno. Los nodos son stateless (ADR-006): todo el estado
// vive en PostgreSQL, Redis o RabbitMQ.
function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida("DATABASE_URL"),
  redisUrl: requerida("REDIS_URL"),
  rabbitUrl: requerida("RABBITMQ_URL"),
};
