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

### Fase 2 — UC-01 Ingesta asincrónica de correos e integración con proveedores

| Elemento arquitectónico | Origen | Código | Cómo se verifica |
|---|---|---|---|
| `EmailIngestionListener` (Publisher) | ADR-003, Iteración 2 | [`backend/src/integration/email/EmailIngestionListener.ts`](./backend/src/integration/email/EmailIngestionListener.ts) | `POST /api/ingesta/email` responde 202 en ~40 ms sin procesar el correo |
| Contrato `NuevoMailReservaEvent` + Correlation ID | ADR-003, Iteración 2 (mitigación de trazabilidad) | [`backend/src/messaging/colas.ts`](./backend/src/messaging/colas.ts), [`specs/events/nuevo-mail-reserva.schema.json`](./specs/events/nuevo-mail-reserva.schema.json) | El mismo `cid` aparece en el log del listener y del worker |
| Event Bus con cola de mensajes fallidos | ADR-003 | [`backend/src/messaging/EventBus.ts`](./backend/src/messaging/EventBus.ts) | Colas `correos.reservas` y `correos.reservas.dlq` en la consola de RabbitMQ |
| `ItinerarioEmailConsumer` (Subscriber) | ADR-003, Iteración 2 | [`backend/src/workers/ItinerarioEmailConsumer.ts`](./backend/src/workers/ItinerarioEmailConsumer.ts) | `docker compose logs -f worker` |
| Reparto de carga entre workers | ADR-006, QA-07 | `prefetch(1)` en [`EventBus.ts`](./backend/src/messaging/EventBus.ts) | `--scale worker=3` + "Ráfaga de 12 correos" → se reparten 4/4/4 |
| Whitelist de remitentes (el contenido solo se lee si el remitente es seguro) | QA-03b | [`backend/src/domain/whitelist.ts`](./backend/src/domain/whitelist.ts), `ViajeService.procesarReservaMail` | Correo de un remitente no seguro → `REMITENTE_NO_SEGURO` |
| Correos no relacionados se ignoran sin errores | QA-03b | [`backend/src/integration/email/ParserCorreoReserva.ts`](./backend/src/integration/email/ParserCorreoReserva.ts) | Newsletter → `SIN_DATOS_DE_VIAJE`, la DLQ queda vacía |
| Contrato `IAgenciaAdapter` (ACL) | ADR-002, Iteración 2 | [`backend/src/integration/IAgenciaAdapter.ts`](./backend/src/integration/IAgenciaAdapter.ts) | — |
| `BookingAdapter` / `DespegarAdapter` (formatos propietarios distintos) | ADR-002, QA-03a | [`backend/src/integration/adapters/`](./backend/src/integration/adapters) | Booking: inglés, ISO con offset, centavos. Despegar: español, hora local "dd/mm/aaaa", "1.380,50" |
| Core desacoplado de los adaptadores concretos | ADR-002, QA-05b | Inyección en [`server.ts`](./backend/src/server.ts) desde [`registroAgencias.ts`](./backend/src/integration/registroAgencias.ts) | `ViajeService` solo importa el tipo `IAgenciaAdapter` |
| Nuevo medio de transporte sin tocar el core | QA-05a | [`backend/src/integration/adapters/TrenAdapter.ts`](./backend/src/integration/adapters/TrenAdapter.ts) + 1 línea en `registroAgencias.ts` | El commit que agrega el tren (`git log --grep QA-05a`) no modifica `domain/`, `persistence/`, `api/` ni la lógica del frontend: solo agrega el adaptador, una línea de registro, el mock del operador y su nombre visible |
| Webhooks de proveedores (aviso → consulta del detalle vigente) | QA-03a | `ViajeService.procesarNotificacionAgencia` | Cambio de horario/cancelación reflejado en ~10-20 ms (escenario: < 30 s) |
| `ViajeService.sincronizarConAgencia` | Iteración 2 (Vista de Módulos) | [`backend/src/domain/ViajeService.ts`](./backend/src/domain/ViajeService.ts) | "Integraciones → Sincronizar" en la UI |
| Sin duplicados entre fuentes (identidad proveedor + código) | UC-01 | `incorporarReservaExterna` en `ViajeService` | El mismo hotel por mail y por Booking queda como una sola reserva |
| Agrupación automática en el viaje que corresponde | UC-01, UC-02 | `ViajeRepository.viajeActivoQueContiene` | Vuelo, hotel y tren de Lisboa terminan en el mismo viaje |
| Autenticación de webhooks con secreto compartido | QA-04 | [`backend/src/gateway/webhook.ts`](./backend/src/gateway/webhook.ts) | Webhook sin `X-Webhook-Secret` → 401 |
| Falla del proveedor aislada | QA-02 | [`backend/src/integration/http.ts`](./backend/src/integration/http.ts) | "Simular caída de Booking" → 502 `AGENCIA_NO_DISPONIBLE`, el resto sigue funcionando |
| Actualizaciones visibles sin recargar | QA-01a | Refresco cada 10 s en [`Panel.tsx`](./frontend/src/pages/Panel.tsx) | Un correo enviado con el panel abierto aparece en ≤ 10 s |
| Sistemas externos simulados | Diagrama de Contexto (Iteración 1) | [`mocks/src/`](./mocks/src) | Simulador en http://localhost:4000 |

## Pendiente por fase

| Fase | Elementos |
|---|---|
| 3 | Cache-Aside en `ViajeService`, `I18nProvider`, `DateTimeFormatter`, `CurrencyFormatter`, `es.json`/`en.json` |
| 4 | Envelope encryption, revocación de correo, `CompartirService`, `Compartido`, log de accesos denegados |
| 5 | `IRedSocialAdapter`, `FacebookAdapter`, `XAdapter`, `SoporteService`, `IAgenciaSoporteAdapter`, `DespegarSoporteAdapter`, `SoporteRetryConsumer`, "Cómo llegar" |
| 6 | Read Replica, ETL Pipeline Worker, Data Warehouse, réplicas del backend |
