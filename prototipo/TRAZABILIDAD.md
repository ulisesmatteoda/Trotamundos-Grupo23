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

### Fase 1 — UC-02 Gestión manual y ciclo de vida

| Elemento arquitectónico | Origen | Código | Cómo se verifica |
|---|---|---|---|
| `ViajeService` (módulo central del dominio) | Iteración 2 (Paso 5.3), UC-02 | [`backend/src/domain/ViajeService.ts`](./backend/src/domain/ViajeService.ts) | CRUD de viajes y reservas desde la UI |
| Modelo canónico (`Viaje`, `Reserva`, fechas UTC) | ADR-002, ADR-008 | [`backend/src/domain/modelo.ts`](./backend/src/domain/modelo.ts) | La API devuelve fechas ISO-8601 en UTC |
| Tipo de reserva abierto (no enum) | QA-05a | [`modelo.ts`](./backend/src/domain/modelo.ts), migración en [`migraciones.ts`](./backend/src/persistence/migraciones.ts) | Se puede crear una reserva `TREN` sin cambiar el esquema |
| Agrupación por viaje (rango derivado de las reservas) | UC-02 | `rangoDelViaje` en [`modelo.ts`](./backend/src/domain/modelo.ts) | Cada viaje muestra sus reservas ordenadas y su rango de fechas |
| Archivado automático de viajes completados | UC-02 | [`backend/src/workers/ArchivadoJob.ts`](./backend/src/workers/ArchivadoJob.ts) → `ViajeService.archivarCompletados` | Un viaje cuya última reserva ya terminó pasa a "Archivados" en ≤ 30 s |
| Validación centralizada de JWT en el Gateway | ADR-005, QA-04 | [`backend/src/gateway/autenticacion.ts`](./backend/src/gateway/autenticacion.ts), [`router.ts`](./backend/src/gateway/router.ts) | `GET /api/viajes` sin token → 401 `TOKEN_REQUERIDO` |
| Auth Manager (emisión de JWT, hash scrypt) | Iteración 3 (Paso 5.1) | [`backend/src/security/AuthService.ts`](./backend/src/security/AuthService.ts), [`passwords.ts`](./backend/src/security/passwords.ts) | `POST /api/auth/login` |
| Aislamiento de datos por usuario | QA-04 | Todas las consultas de [`ViajeRepository.ts`](./backend/src/persistence/ViajeRepository.ts) filtran por usuario | Bruno pide un viaje de Ana → 404 |
| Validación contra el contrato + errores con código | CON-03, ADR-008 | [`backend/src/api/validacion.ts`](./backend/src/api/validacion.ts), [`manejoErrores.ts`](./backend/src/api/manejoErrores.ts) | Cuerpo inválido → 400 `DATOS_INVALIDOS` con el detalle por campo |
| DTOs planos hacia la presentación | Iteración 2 (Paso 5.1) | [`backend/src/api/dto.ts`](./backend/src/api/dto.ts) | — |
| Migraciones con advisory lock (varias réplicas) | ADR-006 | [`backend/src/persistence/migraciones.ts`](./backend/src/persistence/migraciones.ts) | Log `[db] migración 1 aplicada` |
| Alta guiada de reservas | QA-06b | [`frontend/src/components/ReservaForm.tsx`](./frontend/src/components/ReservaForm.tsx) | 3 pasos, 3 campos obligatorios, validación en línea |
| Horas en la zona del lugar de la reserva | QA-06d | [`frontend/src/fechas.ts`](./frontend/src/fechas.ts) | Una reserva en `Europe/Madrid` se carga y muestra en hora de Madrid |
| Panel agrupado por viaje, activos / archivados | UC-02, CON-01 | [`frontend/src/pages/Panel.tsx`](./frontend/src/pages/Panel.tsx), [`ViajeCard.tsx`](./frontend/src/components/ViajeCard.tsx) | http://localhost:8080 (también en ancho de móvil) |

## Pendiente por fase

| Fase | Elementos |
|---|---|
| 2 | `EmailIngestionListener`, `ItinerarioEmailConsumer`, whitelist, `IAgenciaAdapter`, `BookingAdapter`, `DespegarAdapter`, `TrenAdapter` |
| 3 | Cache-Aside en `ViajeService`, `I18nProvider`, `DateTimeFormatter`, `CurrencyFormatter`, `es.json`/`en.json` |
| 4 | Envelope encryption, revocación de correo, `CompartirService`, `Compartido`, log de accesos denegados |
| 5 | `IRedSocialAdapter`, `FacebookAdapter`, `XAdapter`, `SoporteService`, `IAgenciaSoporteAdapter`, `DespegarSoporteAdapter`, `SoporteRetryConsumer`, "Cómo llegar" |
| 6 | Read Replica, ETL Pipeline Worker, Data Warehouse, réplicas del backend |
