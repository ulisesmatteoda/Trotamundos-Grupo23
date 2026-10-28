# Prototipo Trotamundos

Implementación prototipo que demuestra la viabilidad de la arquitectura documentada en
[`../Iteraciones`](../Iteraciones) y [`../adrs`](../adrs). La relación entre drivers, decisiones y código está en
[`TRAZABILIDAD.md`](./TRAZABILIDAD.md). Los contratos (Spec-driven, CON-03) están en [`specs/`](./specs).

## Cómo correrlo

Requisitos: Docker con Docker Compose v2.

```bash
cd prototipo
docker compose up --build
```

| Qué | URL |
|---|---|
| Aplicación web | http://localhost:8080 |
| Estado del backend | http://localhost:8080/api/health |
| Consola de RabbitMQ (Event Bus) | http://localhost:15672 (usuario `trotamundos` / `trotamundos`) |
| Simulador de sistemas externos (correo, agencias) | http://localhost:4000 |

### Usuarios de demo

Al arrancar con la base vacía se cargan dos usuarios (contraseña `demo1234`):

| Usuario | Datos |
|---|---|
| `ana@trotamundos.test` | "Escapada a Madrid" (próximo) y "Fin de semana en Córdoba" (ya terminado: el `ArchivadoJob` lo archiva al iniciar). Whitelist: `@booking.com`, `@despegar.com`. Tiene reservas de Lisboa en Booking y Despegar simulados |
| `bruno@trotamundos.test` | "Ski en Bariloche" (sirve para comprobar que un usuario no ve los viajes de otro) |

Para volver a los datos iniciales: `docker compose down -v && docker compose up -d`.

### Demo de la ingesta (Fase 2)

1. Entrar a http://localhost:8080 como Ana y dejar el panel abierto.
2. En el simulador (http://localhost:4000) enviar "Booking confirma el hotel de Lisboa" y "Despegar confirma el vuelo": en ≤ 10 s aparece el viaje "Lisboa, Portugal" sin recargar.
3. Enviar el correo del remitente no seguro y la newsletter: se ignoran (ver `docker compose logs -f worker`).
4. En la app, "Integraciones → Sincronizar" con cada proveedor: el hotel no se duplica y el vuelo queda en el mismo viaje.
5. En el simulador, disparar los webhooks (reprogramar vuelo, cancelar hotel): el cambio se refleja al instante.

Escalar los workers asincrónicos (ADR-006) y ver el reparto con "Ráfaga de 12 correos":

```bash
docker compose up -d --scale worker=3
docker compose logs -f worker
```

Apagar y borrar los datos:

```bash
docker compose down -v
```

## Servicios

| Servicio | Rol en la arquitectura |
|---|---|
| `web` | nginx: sirve el SPA (hace de CDN) y es la entrada pública que reenvía `/api` al Gateway (hace de ALB) |
| `backend` | API Gateway + Lógica de Negocio sincrónica (`ViajeService`, …) |
| `worker` | Workers asincrónicos que consumen del Event Bus |
| `postgres` | PostgreSQL OLTP Primary |
| `redis` | Redis In-Memory Cache |
| `rabbitmq` | Event Bus / Message Broker |
| `mocks` | Sistemas externos simulados (correo, agencias, red social, agencia de soporte) |

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Esqueleto, contratos (OpenAPI + eventos), docker compose, healthchecks | ✅ |
| 1 | UC-02 gestión manual, archivado automático, JWT | ✅ |
| 2 | UC-01 ingesta de correos (Pub-Sub), whitelist, adaptadores de agencias | ✅ |
| 3 | Cache-Aside con Redis, i18n en el cliente | Pendiente |
| 4 | Envelope encryption, revocación, compartición con designados | Pendiente |
| 5 | Redes sociales, agencia preferida, GPS | Pendiente |
| 6 | Réplica de lectura + ETL + Data Warehouse, réplicas del backend | Pendiente |

## Simplificaciones respecto a la arquitectura documentada

Al ser un prototipo local, algunos elementos de infraestructura se simulan. Las responsabilidades
y los contratos se mantienen iguales a los del diseño.

1. **API Gateway:** no es un producto aparte. nginx es la entrada única y el módulo `backend/src/gateway/` concentra el ruteo y la validación de JWT.
2. **KMS:** la clave maestra se toma de una variable de entorno. El envelope encryption se implementa de verdad.
3. **Application Load Balancer / Auto-Scaling Group:** nginx balancea y los workers se escalan con `--scale` en forma manual; no hay autoescalado por métrica de la cola.
4. **Gmail/Outlook, agencias y redes sociales:** son servicios simulados (`mocks`). Los adaptadores y contratos son los del diseño. El proveedor de correo empuja los mensajes al webhook de ingesta (variante *Push/Webhook* de la Iteración 2) en lugar de sondear por IMAP; en esta fase la casilla se asocia al usuario por su email (la conexión OAuth2 de la casilla llega en la Fase 4).
5. **CDN:** nginx sirviendo los estáticos con headers de caché.
6. **App móvil:** se usa el SPA web responsive; el GPS se accede con la API de geolocalización del navegador.
7. **TLS 1.3 / cifrado en tránsito interno:** no se configura TLS local para no complicar la ejecución.
8. **Métricas de escala** (15M de cuentas, 5 min/mes de caída): no son medibles en un entorno local. Se demuestran las tácticas, no las cifras.
