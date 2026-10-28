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

Al arrancar con la base vacía se cargan tres usuarios (contraseña `demo1234`). La casilla de Ana ya está conectada por OAuth:

| Usuario | Datos |
|---|---|
| `ana@trotamundos.test` | "Escapada a Madrid" (próximo) y "Fin de semana en Córdoba" (ya terminado: el `ArchivadoJob` lo archiva al iniciar). Whitelist: `@booking.com`, `@despegar.com`. Tiene reservas de Lisboa en Booking, Despegar y el operador de trenes simulados |
| `bruno@trotamundos.test` | "Ski en Bariloche" (sirve para comprobar que un usuario no ve los viajes de otro). Cuenta en inglés. Sin correo conectado |
| `carla@trotamundos.test` | Sin viajes. Cuenta en portugués. Sirve para comprobar que alguien no designado no puede ver un itinerario compartido |

Para volver a los datos iniciales: `docker compose down -v && docker compose up -d`.

### Demo de la ingesta (Fase 2)

1. Entrar a http://localhost:8080 como Ana y dejar el panel abierto.
2. En el simulador (http://localhost:4000) enviar "Booking confirma el hotel de Lisboa" y "Despegar confirma el vuelo": en ≤ 10 s aparece el viaje "Lisboa, Portugal" sin recargar.
3. Enviar el correo del remitente no seguro y la newsletter: se ignoran (ver `docker compose logs -f worker`).
4. En la app, "Integraciones → Sincronizar" con cada proveedor: el hotel no se duplica y el tren se agrupa en el mismo viaje.
5. En el simulador, disparar los webhooks (reprogramar vuelo, cancelar hotel): el cambio se refleja al instante.

### Demo de analítica y disponibilidad (Fase 6)

1. **Reportes del equipo de datos (UC-03):** `docker compose exec etl node dist/etl/reportes.js` (destinos más elegidos, tasa de cancelación por tipo, origen de las reservas, tendencia por trimestre). Corren sobre el Data Warehouse, nunca sobre la base operacional.
2. **ETL a demanda:** `docker compose exec etl node dist/etl/main.js --una-vez` (además corre solo cada minuto). Una reserva creada en la app aparece en los reportes recién después de una corrida (consistencia eventual, ADR-004).
3. **Réplica:** `docker compose exec postgres psql -U trotamundos -c "select * from pg_stat_replication"`. Intentar escribir en la réplica falla: `docker compose exec postgres-replica psql -U trotamundos -c "delete from viaje"`.
4. **Balanceo y failover:** en el navegador (F12 → Red) el header `X-Instancia` cambia entre requests. `docker stop prototipo-backend-1` y la app sigue funcionando; `docker start prototipo-backend-1` y vuelve a la rotación.

> Si venís de una versión anterior del prototipo, levantá con la base limpia (`docker compose down -v`), porque la replicación se configura al inicializar el volumen del primario.

### Demo de redes, agencia y GPS (Fase 5)

1. **Pedir ayuda (≤ 3 toques):** en una reserva, "Pedir ayuda" → "Enviar a mi agencia". Se ve el ticket de la agencia y, en el simulador (sección "Soporte de Despegar"), el caso con todos los datos de la reserva.
2. **Agencia caída o lenta:** en el simulador elegir "Caída" o "Lenta" y pedir ayuda: el caso queda pendiente y se reintenta (`docker compose logs -f worker`). Al volver a "Normal", la pantalla se actualiza sola con el ticket. Con "Lenta" la agencia abre un solo caso aunque haya reintentos (idempotencia).
3. **Publicar en redes:** en "Compartir", elegir Facebook o X y escribir el mensaje. En el simulador aparece la publicación: solo el texto y el enlace. Con "Simular caída de las redes" el enlace se crea igual.
4. **Cómo llegar:** el botón en cada reserva abre la ruta desde tu ubicación (el navegador pide permiso la primera vez).

### Demo de seguridad (Fase 4)

1. **Compartir:** como Ana, "Compartir" en "Escapada a Madrid" con `bruno@trotamundos.test` y copiar el enlace. Abrirlo en una ventana privada: pide login; como Bruno se ve en solo lectura, como Carla aparece "No tenés acceso" (y queda registrado).
2. **Conectar el correo (OAuth2):** como Bruno, "Integraciones → Conectar Gmail" → pantalla de consentimiento del proveedor simulado → "Permitir" → vuelve a la app conectado.
3. **Revocar:** como Ana, "Integraciones → Desconectar". En el simulador (http://localhost:4000) la casilla deja de figurar como autorizada; un correo enviado después aparece en el log del worker como `CASILLA_NO_CONECTADA`.
4. **Token cifrado:** `docker compose exec postgres psql -U trotamundos -c "select casilla, token_sobre from conexion_correo"`.
5. **Auditoría:** `docker compose exec postgres psql -U trotamundos -c "select tipo, recurso, ip, ocurrido_en from acceso_denegado_log"` y `docker compose logs backend | grep ALERTA-SEGURIDAD`.

### Demo de caché e idiomas (Fase 3)

1. En la app, abrir las herramientas del navegador (F12 → Red) y recargar: `GET /api/viajes` responde `X-Cache: MISS` la primera vez y `HIT` las siguientes. Al editar algo vuelve a `MISS`.
2. Cambiar el idioma con el selector (Español, English, Português): la API no se vuelve a llamar con otro idioma, solo se descarga el paquete `/locales/xx.json`.
3. El vuelo EZE → MAD muestra la salida en hora de Buenos Aires y la llegada en hora de Madrid.
4. Ingresar como `bruno@trotamundos.test`: la app aparece en inglés (preferencia de su cuenta).
5. `docker compose stop redis`: la app sigue funcionando (todo `MISS`); `docker compose start redis` y vuelve a cachear.

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
| `backend` (×2) | API Gateway + Lógica de Negocio sincrónica (`ViajeService`, …). Dos réplicas stateless |
| `worker` | Workers asincrónicos que consumen del Event Bus |
| `etl` | ETL Pipeline Worker: lee de la réplica y carga el Data Warehouse |
| `postgres` | PostgreSQL OLTP Primary |
| `postgres-replica` | PostgreSQL Read Replica (hot standby por streaming) |
| `dw` | Data Warehouse (OLAP), modelo en estrella |
| `redis` | Redis In-Memory Cache |
| `rabbitmq` | Event Bus / Message Broker |
| `mocks` | Sistemas externos simulados (correo, agencias, red social, agencia de soporte) |

## Estado por fases

| Fase | Contenido | Estado |
|---|---|---|
| 0 | Esqueleto, contratos (OpenAPI + eventos), docker compose, healthchecks | ✅ |
| 1 | UC-02 gestión manual, archivado automático, JWT | ✅ |
| 2 | UC-01 ingesta de correos (Pub-Sub), whitelist, adaptadores de agencias | ✅ |
| 3 | Cache-Aside con Redis, i18n en el cliente, zona horaria del destino | ✅ |
| 4 | OAuth2 con el correo, envelope encryption, revocación, auditoría, compartición con designados | ✅ |
| 5 | Redes sociales, agencia preferida con reintento asincrónico, GPS | ✅ |
| 6 | Réplica de lectura + ETL + Data Warehouse, réplicas del backend con failover | ✅ |

## Simplificaciones respecto a la arquitectura documentada

Al ser un prototipo local, algunos elementos de infraestructura se simulan. Las responsabilidades
y los contratos se mantienen iguales a los del diseño.

1. **API Gateway:** no es un producto aparte. nginx es la entrada única y el módulo `backend/src/gateway/` concentra el ruteo y la validación de JWT.
2. **KMS:** la clave maestra se toma de una variable de entorno (en producción, un KMS gestionado). El envelope encryption se implementa de verdad, con AES-256-GCM y una clave de datos por secreto. Se cifran los tokens de acceso al correo; el cifrado del resto de los datos en reposo se delegaría en el cifrado de disco de la base gestionada.
3. **Application Load Balancer / Auto-Scaling Group:** nginx balancea entre dos réplicas fijas del backend y los workers se escalan con `--scale` en forma manual; no hay autoescalado por métrica de la cola. La réplica de base es asincrónica y no hay *failover* automático del primario (la vista de despliegue lo prevé con un standby gestionado).
4. **Gmail/Outlook, agencias y redes sociales:** son servicios simulados (`mocks`). Los adaptadores y contratos son los del diseño. El proveedor de correo empuja los mensajes al webhook de ingesta (variante *Push/Webhook* de la Iteración 2) en lugar de sondear por IMAP. La autorización sí es un flujo OAuth2 real (authorization code) contra el proveedor simulado.
5. **CDN:** nginx sirviendo los estáticos con headers de caché.
6. **App móvil:** se usa el SPA web responsive; el GPS se accede con la API de geolocalización del navegador.
7. **TLS 1.3 / cifrado en tránsito interno:** no se configura TLS local para no complicar la ejecución.
8. **Métricas de escala** (15M de cuentas, 5 min/mes de caída): no son medibles en un entorno local. Se demuestran las tácticas, no las cifras.
9. **Alertas de seguridad:** se emiten como líneas `[ALERTA-SEGURIDAD]` en el log (lo que tomaría un SIEM) además de persistirse en `acceso_denegado_log`; no hay un sistema de notificación real.
10. **Redes sociales y agencia de soporte:** son servicios simulados. La agencia preferida se guarda por usuario (todos usan Despegar en la demo) y no tiene pantalla para cambiarla.
11. **Rutas (GPS):** se usa la API de geolocalización del navegador y se delega la ruta en Google Maps (abre la app nativa en el celular).
12. **ETL y Data Warehouse:** el ETL hace una recarga completa en cada lote, leyendo de la réplica (que se alimenta del WAL del primario por streaming). Una carga incremental por cambios (CDC con Debezium, como prevé la mitigación de ADR-004) queda como evolución. El DW es un PostgreSQL con modelo en estrella, no un motor columnar.
