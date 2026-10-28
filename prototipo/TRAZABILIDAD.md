# Trazabilidad: Arquitectura → Código

Relación entre los elementos de la arquitectura (drivers, ADRs y vistas de las iteraciones) y el código del
prototipo. Se actualiza al cerrar cada fase.

## Elementos implementados

| Elemento arquitectónico | Origen | Código | Cómo se verifica |
|---|---|---|---|
| Contratos de la API REST | CON-03 | [`specs/openapi.yaml`](./specs/openapi.yaml) | Cada operación indica `x-fase` y `x-trazabilidad` |
| Contrato `NuevoMailReservaEvent` | ADR-003, Iteración 2 | [`specs/events/nuevo-mail-reserva.schema.json`](./specs/events/nuevo-mail-reserva.schema.json) | — (se usa desde la Fase 2) |
| Contrato `CasoSoportePendienteEvent` | ADR-009, Iteración 5 | [`specs/events/caso-soporte-pendiente.schema.json`](./specs/events/caso-soporte-pendiente.schema.json) | — (se usa desde la Fase 5) |
| Capa de Presentación (SPA) | ADR-001, CON-01 | [`frontend/src/`](./frontend/src) | http://localhost:8080 |
| Entrada pública (CDN + ALB simulados) | ADR-006, ADR-007 | [`frontend/nginx.conf`](./frontend/nginx.conf) | `/` sirve el SPA, `/api` llega al backend |
| API Gateway (único punto de entrada) | ADR-001 | [`backend/src/gateway/router.ts`](./backend/src/gateway/router.ts) | Todas las rutas cuelgan de `/api` |
| Health check de dependencias | QA-02 | [`backend/src/api/controllers/HealthController.ts`](./backend/src/api/controllers/HealthController.ts) | `GET /api/health` → 200, o 503 si cae una dependencia |
| Separación de procesos API / Worker | Iteración 1 (capa 3), ADR-006 | [`backend/src/server.ts`](./backend/src/server.ts), [`backend/src/workers/main.ts`](./backend/src/workers/main.ts) | `docker compose up -d --scale worker=3` |
| Event Bus / Message Broker | ADR-003 | [`backend/src/messaging/EventBus.ts`](./backend/src/messaging/EventBus.ts) | Consola de RabbitMQ en :15672 |
| PostgreSQL OLTP Primary | Iteración 3 | [`backend/src/persistence/db.ts`](./backend/src/persistence/db.ts) | `dependencias.postgres` en `/api/health` |
| Redis In-Memory Cache | ADR-007 | [`backend/src/cache/redisClient.ts`](./backend/src/cache/redisClient.ts) | `dependencias.redis` en `/api/health` |
| Nodos stateless + healthchecks + restart | ADR-006, QA-02 | [`docker-compose.yml`](./docker-compose.yml) | `docker compose ps` → todos *healthy* |

## Pendiente por fase

| Fase | Elementos |
|---|---|
| 1 | `ViajeService`, entidades `Viaje`/`Reserva`, validación JWT en el Gateway, `ArchivadoJob` |
| 2 | `EmailIngestionListener`, `ItinerarioEmailConsumer`, whitelist, `IAgenciaAdapter`, `BookingAdapter`, `DespegarAdapter`, `TrenAdapter` |
| 3 | Cache-Aside en `ViajeService`, `I18nProvider`, `DateTimeFormatter`, `CurrencyFormatter`, `es.json`/`en.json` |
| 4 | Envelope encryption, revocación de correo, `CompartirService`, `Compartido`, log de accesos denegados |
| 5 | `IRedSocialAdapter`, `FacebookAdapter`, `XAdapter`, `SoporteService`, `IAgenciaSoporteAdapter`, `DespegarSoporteAdapter`, `SoporteRetryConsumer`, "Cómo llegar" |
| 6 | Read Replica, ETL Pipeline Worker, Data Warehouse, réplicas del backend |
