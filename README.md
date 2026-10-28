# Trotamundos-Grupo23

# Panel de Gestión de Viajes

> **Trabajo Práctico Especial (TPE)** — *Diseño de Sistemas de Software*  
> **Universidad Nacional del Centro de la Provincia de Buenos Aires (UNICEN)** | Facultad de Ciencias Exactas  
> **Grupo 23**

---

## Tabla de Contenidos
- [Vista General del Sistema](#vista-general-del-sistema)
- [Métricas y Escala](#métricas-y-escala)
- [Drivers Arquitectónicos](#drivers-arquitectónicos)
- [Arquitectura e Iteraciones (ADD)](#arquitectura-e-iteraciones-add)
- [Decisiones de Diseño (ADRs)](#decisiones-de-diseño-adrs)
- [Estructura del Repositorio](#estructura-del-repositorio)

---

## Vista General del Sistema
**Trotamundos** es una plataforma centralizada (*Single Source of Truth*) para la gestión unificada de viajes. Permite a los usuarios ver en un único panel todas sus reservas (vuelos, hoteles, autos, y a futuro trenes y autobuses) agrupadas por viaje, desde la web o desde el móvil. Las reservas se incorporan automáticamente escaneando los correos del usuario o sincronizando con APIs de terceros, y también pueden gestionarse manualmente.

---

## Métricas y Escala
* **Cuentas registradas:** 15.000.000.
* **Usuarios Activos Semanales (WAU):** 2.000.000.
* **Patrones de Carga:** Picos entre domingo-lunes y jueves-viernes, y picos masivos ante disrupciones de viaje (ej. climáticas).
* **Metas de Rendimiento:** Actualizaciones externas reflejadas en `< 5 min`, respuesta web `< 800 ms` y First Contentful Paint móvil `< 1.4 s`.
* **Disponibilidad:** Máximo 5 minutos por mes de inactividad no planificada.

---

## Drivers Arquitectónicos
El detalle completo (escenarios de 6 partes) está en [`docs/drivers.md`](./docs/drivers.md).

### Funcionalidad Primaria
| ID | Descripción |
|---|---|
| **UC-01** | Unificación e integración automática de reservas (escaneo de correos y APIs de terceros). |
| **UC-02** | Gestión manual de reservas y ciclo de vida del viaje (agrupación y archivado automático). |
| **UC-03** | Analítica de datos y monetización (consultas analíticas pesadas). |

### Atributos de Calidad
| ID | Atributo | Descripción |
|---|---|---|
| **QA-01** | Performance | Sincronización `< 5 min`, web `< 800 ms`, FCP móvil `< 1.4 s`. |
| **QA-02** | Disponibilidad | Operación global 24/7, máximo 5 min/mes de caída no planificada. |
| **QA-03** | Interoperabilidad | Proveedores de viaje, correo, redes sociales y agencia preferida mediante APIs estándar. |
| **QA-04** | Seguridad | Acceso seguro a correos, cifrado de datos personales e itinerarios compartidos solo con personas designadas. |
| **QA-05** | Evolucionabilidad | Incorporar nuevos medios de transporte y proveedores sin modificar el núcleo. |
| **QA-06** | Usabilidad e i18n | Capacidades nativas del móvil (GPS), resolución de problemas y operación multirregión. |
| **QA-07** | Escalabilidad | 15M de cuentas, 2M WAU y picos masivos por disrupciones. |

### Restricciones y Preocupaciones
| ID | Descripción |
|---|---|
| **CON-01** | Soporte multiplataforma (web y móvil). |
| **CON-02** | Lectura de correos respetando OAuth2 / IMAP. |
| **CON-03** | Desarrollo guiado por especificaciones (*Spec-driven*), ADRs y prototipo ejecutable. |
| **CON-04** | Operación multirregión e internacional. |
| **CRN-01** | Estructura general *greenfield*. |
| **CRN-02** | Desacoplamiento del procesamiento asincrónico. |
| **CRN-03** | Separación de cargas OLTP vs. OLAP. |
| **CRN-04** | Seguridad e identidad para compartir contenido. |

---

## Arquitectura e Iteraciones (ADD)
La arquitectura se diseñó de forma incremental con el método **Attribute-Driven Design (ADD)** a lo largo de 5 iteraciones:

* **[Iteración 1: Estructura General del Sistema](./Iteraciones/Iteracion-1.md)**
Estilo **Cliente-Servidor Multi-Tier con backend en 5 capas lógicas** (Presentación, API Gateway, Lógica de Negocio, Integración y Datos), con separación entre procesamiento sincrónico y asincrónico y bases OLTP/OLAP segregadas.

* **[Iteración 2: Lógica Core e Integraciones](./Iteraciones/Iteracion-2.md)**
**Anti-Corruption Layer / Adapter** (`IAgenciaAdapter`, `BookingAdapter`, `DespegarAdapter`) para aislar el núcleo (`ViajeService`) de las APIs externas, y **Publish-Subscribe** con Message Broker (`EmailIngestionListener` → Event Bus → `ItinerarioEmailConsumer`) para la ingesta asincrónica de correos.

* **[Iteración 3: Seguridad, Sincronización ETL y Topología de Despliegue](./Iteraciones/Iteracion-3.md)**
**JWT** en el API Gateway y **Envelope Encryption (KMS, AES-256)** para tokens de correo; **Batch ETL** desde una réplica de lectura de PostgreSQL hacia el Data Warehouse; despliegue con **Load Balancer y Auto-Scaling Group** de workers.

* **[Iteración 4: Internacionalización y Optimización de Caché/Latencia](./Iteraciones/Iteracion-4.md)**
**Caché de dos niveles** (CDN + Redis con *Cache-Aside*) e **i18n en el cliente** con backend neutro en UTC.

* **[Iteración 5: Redes Sociales, Agencia Preferida y Compartición Segura](./Iteraciones/Iteracion-5.md)**
Extensión del ACL con interfaces segregadas (`IRedSocialAdapter`, `IAgenciaSoporteAdapter`), **timeout con reintento asincrónico** para la derivación a la agencia y **compartición por enlace con lista de personas designadas**.

> El módulo funcional avanzado (Opción A o B, 2da entrega) se abordará en una iteración posterior.

---

## Decisiones de Diseño (ADRs)
Las decisiones de diseño están registradas en formato **MADR** en la carpeta [`/adrs`](./adrs/):

* **[ADR-001](./adrs/adr-001-estilo-arquitectonico.md)** Estilo Cliente-Servidor Multi-Tier con backend desacoplado en capas lógicas.
* **[ADR-002](./adrs/adr-002-patron-acl-adapter-integraciones.md)** Anti-Corruption Layer y patrón Adapter para integraciones externas.
* **[ADR-003](./adrs/adr-003-patron-pubsub-correos.md)** Publish-Subscribe para el procesamiento asincrónico de correos.
* **[ADR-004](./adrs/adr-004-patron-batch-etl.md)** Segregación de cargas y pipeline Batch ETL para la capa analítica.
* **[ADR-005](./adrs/adr-005-autenticacion-basado-tokens.md)** Autenticación perimetral con JWT y cifrado de tokens con Envelope Encryption (KMS).
* **[ADR-006](./adrs/adr-006-patron-auto-escalado-y-cluster.md)** Topología de despliegue con auto-escalado horizontal y cluster balanceado.
* **[ADR-007](./adrs/adr-007-patron-cache-aside.md)** Caché de dos niveles (CDN + Redis) con patrón Cache-Aside.
* **[ADR-008](./adrs/adr-008-client-side-i18n.md)** Internacionalización en el cliente con backend neutro en UTC.
* **[ADR-009](./adrs/adr-009-acl-redes-sociales-y-agencia-preferida.md)** Extensión del ACL para redes sociales y agencia preferida, con timeout y reintento asincrónico.
* **[ADR-010](./adrs/adr-010-comparticion-itinerarios-designados.md)** Compartición de itinerarios mediante enlace con lista de personas designadas.

---

## Estructura del Repositorio

```text
Trotamundos-Grupo23/
├── docs/
│   └── drivers.md          # Propósito, casos de uso, escenarios de calidad, restricciones y preocupaciones
├── Iteraciones/            # Paso a paso del método ADD (vistas en Mermaid)
│   ├── Iteracion-1.md
│   ├── Iteracion-2.md
│   ├── Iteracion-3.md
│   ├── Iteracion-4.md
│   └── Iteracion-5.md
├── adrs/                   # Architecture Decision Records (MADR)
│   ├── adr-001-estilo-arquitectonico.md
│   ├── ...
│   └── adr-010-comparticion-itinerarios-designados.md
└── README.md
```

> El prototipo ejecutable (Docker Compose) se incorporará en la carpeta `prototipo/`.
