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

Escalar los workers asincrónicos (ADR-006):

```bash
docker compose up -d --scale worker=3
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
| 1 | UC-02 gestión manual, archivado automático, JWT | Pendiente |
| 2 | UC-01 ingesta de correos (Pub-Sub), whitelist, adaptadores de agencias | Pendiente |
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
4. **Gmail/Outlook, agencias y redes sociales:** son servicios simulados (`mocks`). Los adaptadores y contratos son los del diseño.
5. **CDN:** nginx sirviendo los estáticos con headers de caché.
6. **App móvil:** se usa el SPA web responsive; el GPS se accede con la API de geolocalización del navegador.
7. **TLS 1.3 / cifrado en tránsito interno:** no se configura TLS local para no complicar la ejecución.
8. **Métricas de escala** (15M de cuentas, 5 min/mes de caída): no son medibles en un entorno local. Se demuestran las tácticas, no las cifras.
