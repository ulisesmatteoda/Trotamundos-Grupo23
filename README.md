# Trotamundos-Grupo23

# Panel de Gestión de Viajes

> **Trabajo Práctico Especial (TPE)** — *Diseño de Sistemas de Software*  
> **Universidad Nacional del Centro de la Provincia de Buenos Aires (UNICEN)** | Facultad de Ciencias Exactas  
> **Grupo 23**

---

## Tabla de Contenidos
- [Vista General del Sistema](#vista-general-del-sistema)
- [Métricas y Escala](#métricas-y-escala)
- [Drivers Arquitectónicos Clave](#drivers-arquitectónicos-clave)
- [Arquitectura e Iteraciones (ADD 3.0)](#arquitectura-e-iteraciones-add-30)
- [Decisiones de Diseño (ADRs)](#decisiones-de-diseño-adrs)
- [Estructura del Repositorio](#estructura-del-repositorio)

---

## Vista General del Sistema
**Trotamundos** es una plataforma centralizada (*Single Source of Truth*) para la gestión unificada de viajes. Permite a los usuarios organizar en un único panel sus reservas de vuelos, hoteles, transportes y alquileres, agrupándolos en itinerarios claros y procesando automáticamente comprobantes recibidos por correo electrónico o sincronizados mediante agencias externas.

---

## Métricas y Escala
* **Cuentas registradas:** 15.000.000 usuarios.
* **Usuarios Activos Semanales (WAU):** 2.000.000 WAU.
* **Patrones de Carga:** Picos semanales de tráfico y picos masivos imprevistos ante contingencias operativas (cancelaciones, clima).
* **Meta de Rendimiento:** Respuesta web `< 800 ms` y renderizado mobile (FCP) `< 1.4 s`.

---

## Drivers Arquitectónicos Clave

| ID | Tipo | Descripción |
|---|---|---|
| **CRN-01** | Preocupación | Definición de la estructura macro inicial del sistema (*greenfield*). |
| **QA-01** | Performance | Respuestas `< 800 ms` y sincronización en tiempo cercano al real. |
| **QA-02** | Disponibilidad | Operación global continua 24/7 y tolerancia a fallas en servicios externos. |
| **QA-03** | Escalabilidad | Soporte para 15M de usuarios y absorción de picos disruptivos. |
| **QA-04** | Interoperabilidad | Integración transparente con APIs de agencias externas y servicios de correo. |
| **QA-05** | Seguridad | Autenticación y autorización centralizada mediante **OAuth2 / JWT**. |
| **QA-06** | Modificabilidad | Capacidad de incorporar nuevos proveedores sin alterar el núcleo. |
| **QA-07** | Usabilidad | Experiencia optimizada para clientes web y móviles con funciones nativas. |
| **CON-01** | Restricción | Arquitectura *stateless* orientada a microservicios/servicios distribuidos. |
| **CON-02** | Restricción | Despliegue obligatorio contenedorizado con Docker. |
| **Req-Adv** | Funcional | Módulo de Recomendaciones con curación de expertos (*Human-in-the-Loop*). |

---

## Arquitectura e Iteraciones (ADD 3.0)
La arquitectura fue diseñada de forma incremental utilizando la metodología **Attribute-Driven Design (ADD 3.0)** a lo largo de 4 iteraciones:

* **[Iteración 1: Estructura Macro Inicial y Lectura Rápida (CQRS)](./docs/iteration-1.md)**
Definición del estilo **Cliente-Servidor Multi-Tier** con **API Gateway**. Implementación del patrón **CQRS** para separar las lecturas de alta velocidad en caché en memoria (**Redis - ELTP**) de las transacciones relacionales (**PostgreSQL - OLTP**) y la analítica pesada (**ClickHouse - OLAP**).

* **[Iteración 2: Integración de Agencias e Ingesta Asincrónica](./docs/iteration-2.md)**
Uso del patrón **Adapter** (`IAgenciaAdapter`) para desacoplar el núcleo de las APIs externas (Booking, Despegar) y arquitectura orientada a eventos (**Publisher-Subscriber** con RabbitMQ) para la ingesta asincrónica y no bloqueante de correos.

* **[Iteración 3: Seguridad y Resiliencia](./docs/iteration-3.md)**
Protección centralizada de endpoints en el **API Gateway** mediante **OAuth2 / JWT** y aplicación del patrón **Circuit Breaker** (con Resilience4j) sobre la capa de adaptadores para aislar caídas de servicios externos.

* **[Iteración 4: Requerimiento Avanzado — Motor de Recomendaciones con Human-in-the-Loop](./docs/iteration-4.md)**
Diseño del **Módulo de Recomendaciones** (Opción A) con desacoplamiento asincrónico para la sugerencia de itinerarios y un tablero de curación experta (*Human-in-the-Loop*) antes de notificar al usuario.

---

## Decisiones de Diseño (ADRs)
Las decisiones de diseño clave están registradas bajo la especificación **MADR** en la carpeta [`/ADRs`](./ADRs/):

* **[ADR-0001]** Adopción del estilo Cliente-Servidor Multi-Tier con API Gateway como punto único de entrada.
* **[ADR-0002]** Estrategia de almacenamiento especializado (CQRS + Redis ELTP + Postgres OLTP + ClickHouse OLAP).
* **[ADR-0003]** Patrón Adapter (Puertos y Adaptadores) para desacoplar la integración con agencias de viajes externas.
* **[ADR-0004]** Procesamiento asincrónico de correos de reserva mediante Event Bus (Pub/Sub con RabbitMQ).
* **[ADR-0005]** Autenticación y autorización *stateless* centralizada mediante OAuth2 y tokens JWT en el API Gateway.
* **[ADR-0006]** Tolerancia a fallas y resiliencia en llamadas externas utilizando Circuit Breaker y Timeouts (Resilience4j).
* **[ADR-0007]** Módulo de recomendaciones proactivas con arquitectura de aprobación experta (*Human-in-the-Loop*).
* **[ADR-0008]** Estrategia de despliegue en contenedores aislados y orquestación con Docker Compose.

---

## Estructura del Repositorio

```text
Trotamundos-Grupo23/

    ├── docs/                                   # Documentación ADD, escenarios y vistas
    │
    │   ├── iteration-1.md                      # Paso a paso Iteración 1
    │
    │   ├── iteration-2.md                      # Paso a paso Iteración 2
    │
    │   ├── iteration-3.md                      # Paso a paso Iteración 3
    │
    │   ├── iteration-4.md                      # Paso a paso Iteración 4
    │
    │   └── views/                              # Diagramas de C&C y Módulos (Mermaid)
    │
    ├── ADRs/                                   # Architecture Decision Records (MADR)
    │
    │   ├── 0001-multi-tier-and-api-gateway.md
    │
    │   ├── 0002-cqrs-and-specialized-databases.md
    │
    │   ├── 0003-adapter-pattern-for-agencies.md
    │
    │   ├── 0004-event-driven-email-ingestion.md
    │
    │   ├── 0005-oauth2-jwt-security.md
    │
    │   ├── 0006-circuit-breaker-resilience.md
    │
    │   ├── 0007-human-in-the-loop-recommendations.md
    │
    │   └── 0008-docker-compose-deployment.md
    │
    ├── src/                                    # Código fuente del prototipo backend
    │
    ├── docker-compose.yml                      # Orquestación de infraestructura local
    │
    └── README.md                               # Portada y guía general del proyecto

