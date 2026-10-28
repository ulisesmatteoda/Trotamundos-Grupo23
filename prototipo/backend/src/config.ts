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
  jwtSecret: requerida("JWT_SECRET"),
  jwtExpiracion: process.env.JWT_EXPIRACION ?? "8h",
  seedDemo: process.env.SEED_DEMO === "true",
  archivadoIntervaloMs: Number(process.env.ARCHIVADO_INTERVALO_MS ?? 60_000),
  // TTL del Cache-Aside de itinerarios (ADR-007). Acota cuánto puede durar un dato viejo
  // si se perdiera una invalidación; coincide con la ventana de QA-01a (5 minutos).
  cacheTtlSegundos: Number(process.env.CACHE_TTL_SEGUNDOS ?? 300),
  // Secreto compartido con los sistemas externos que llaman a nuestros webhooks.
  webhookSecret: requerida("WEBHOOK_SECRET"),
  // Base de las APIs de agencias (en el prototipo, el servicio de mocks).
  agenciasUrl: process.env.AGENCIAS_URL ?? "http://mocks:4000",
};
