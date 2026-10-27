# Iteración 2: Refinamiento de la Lógica Core y las Integraciones

## Paso 1: Revisión de entradas

Se revisan las entradas disponibles al iniciar esta segunda iteración:

*   **Diseño existente (Resultado de la Iteración 1):** Arquitectura base en 5 capas lógicas desplegada sobre un modelo físico Cliente-Servidor Multi-Tier, con segregación de datos OLTP/OLAP y la introducción del patrón de desacoplamiento asincrónico.
*   **Estado del Backlog de Drivers:**
    *   **Completamente Abordados:**
        *   `CRN-01` (Estructura general greenfield).
        *   `CON-01` (Soporte multiplataforma web/móvil).
    *   **Parcialmente Abordados:**
        *   `UC-01` y `UC-02` (Estructura de alto nivel definida; falta la lógica interna y contratos de API).
        *   `QA-01a` / `CRN-02` (Estructura desacoplada definida; falta especificar el broker de mensajes, reintentos y workers).
        *   `QA-03a, b` (Capa de integración definida; falta estructurar adaptadores y parsers específicos).
        *   `QA-05a, b` (Aislamiento conceptual definido; falta el mecanismo de extensión mediante Anti-Corruption Layer).
        *   `CRN-03` / `UC-03` (Segregación OLTP/OLAP definida; falta el mecanismo de sincronización ETL).
        *   `QA-01b, c` (Falta definir componentes concretos de red y optimizaciones de frontend).
        *   `QA-02` y `QA-07` (Estructura Multi-Tier lista; falta la topología de redundancia y auto-escalado).
    *   **No Tratados:**
        *   `QA-04a, b, c, d` (Seguridad y privacidad).
        *   `QA-06` (Usabilidad y Módulo Internacionalización).

## Paso 2: Establecer el objetivo de la iteración seleccionando los drivers

**Objetivo de la iteración:** Diseñar la estructura interna de la **Capa de Lógica de Negocio** y de la **Capa de Integración Externa**, detallando la arquitectura del broker de mensajes, los adaptadores mediante el patrón *Anti-Corruption Layer (ACL)* y los submódulos de dominio necesarios para soportar los casos de uso principales (`UC-01` y `UC-02`) y permitir el desarrollo guiado por especificaciones (*Spec-Driven Development*).

**Drivers seleccionados para abordar en esta iteración:**
*   **UC-01 — Unificación e Integración Automática de Reservas:** Ingesta y escaneo asincrónico de correos de usuarios.
*   **UC-02 — Gestión Manual y Ciclo de Vida del Viaje:** Creación, edición, eliminación y agrupación manual de reservas por itinerario.
*   **QA-01a — Performance Asincrónica:** Garantizar que las actualizaciones de correos se procesen y reflejen en el itinerario en menos de 5 minutos.
*   **QA-03a/b — Interoperabilidad:** Conexión con servidores de correo (OAuth2/IMAP) y APIs de proveedores (aerolíneas, hoteles).
*   **QA-05a/b — Evolucionabilidad y Mantenibilidad:** Aislar los cambios en formatos de respuesta o políticas de proveedores externos dentro de adaptadores dedicados.
*   **CON-02 — Protocolos de Correo:** Respetar OAuth2 e IMAP para el escaneo de e-mails.
*   **CON-03 — Spec-Driven Development:** Definir contratos claros entre componentes que permitan especificar las APIs antes de la codificación.

## Paso 3: Elegir uno o más elementos del sistema a refinar

De las 5 capas lógicas instanciadas en la Iteración 1, se seleccionan dos capas para realizar un refinamiento interno (*zoom-in*):

1.  **Capa de Lógica de Negocio:** Se abre el "orquestador central" para definir los servicios sincrónicos de itinerario, la cola de mensajes y los componentes consumidores (*Workers*).
2.  **Capa de Integración Externa:** Se abren los adaptadores para precisar cómo se traducen e ingresan los datos de terceros hacia el modelo de dominio intern

## Paso 4: Elegir los conceptos de diseño que satisfacen los drivers seleccionados

Para dar soporte a la lógica core y a las integraciones del sistema (resolviendo los *drivers* priorizados para esta iteración), se evalúan y seleccionan patrones arquitectónicos y tácticas específicas de atributos de calidad basados en el catálogo de Bass et al.

A continuación, se detallan los dos conceptos de diseño principales seleccionados, las alternativas descartadas, sus pros/contras y los *drivers* que abordan.

### 1. Patrón: Anti-Corruption Layer (ACL) / Adaptadores (Wrappers)
**Táctica Asociada:** *Tailor Interface / Encapsulate* (Empaquetar / Aislar Cambios).

* **Por qué elegimos esta opción:** 
  Las APIs de proveedores externos (aerolíneas, hoteles, Gmail, Outlook) tienen modelos de datos heterogéneos y políticas que cambian con frecuencia. Necesitamos una capa traductora mediadora que envase esta complejidad en un "wrapper" (adaptador) y convierta las respuestas a un modelo de dominio interno canonizado (*TravelReservationDTO*). Esto aísla completamente el núcleo del backend, limitando la "onda de choque" de cualquier cambio externo a un único componente aislado.
* **Drivers que aborda:** 
  * **QA-05a / QA-05b** (Evolucionabilidad y Mantenibilidad)[cite: 8].
  * **QA-03a / QA-03b** (Interoperabilidad con proveedores y correos)[cite: 8].

| Opción Evaluada | Pros | Contras | Decisión |
| :--- | :--- | :--- | :--- |
| **Opción A: Anti-Corruption Layer (ACL) y Adaptadores** | - Aísla al Core del sistema de cambios externos.<br>- Permite resolver actualizaciones de terceros en menos de 2 días-persona (**QA-05b**)[cite: 8].<br>- Facilita agregar nuevos transportes sin tocar el código central (**QA-05a**)[cite: 8]. | - Introduce un ligero *overhead* de procesamiento por la traducción de datos.<br>- Requiere mayor esfuerzo inicial para definir los DTOs neutros y mapeadores. | **Seleccionada.** |
| **Opción B: Integración Directa (Punto a Punto)** | - Desarrollo inicial más rápido.<br>- Menor cantidad de clases y abstracciones en el código. | - Alto acoplamiento. Cualquier cambio en la API de Iberia o Gmail rompe la lógica de negocio core.<br>- Imposibilita cumplir con la mantenibilidad requerida (**QA-05**)[cite: 8]. | *Descartada.* |

---

### 2. Patrón: Publish-Subscribe / Broker de Mensajes (Cola Asincrónica)
**Táctica Asociada:** *Asynchronous Interaction / Manage Queue Size* (Manejo de Respuestas Asincrónicas).

* **Por qué elegimos esta opción:** 
  El escaneo y *parsing* de correos es un proceso pesado. Si se hiciera de forma sincrónica, bloquearía los hilos HTTP del servidor. Al usar un patrón orientado a eventos (*Event-Driven*) con un *Broker* de mensajes, los emisores publican eventos ("nuevo correo detectado") en una cola sin conocer a los receptores. Los *workers* consumen estos eventos de forma totalmente desacoplada, nivelando la carga (*load leveling*) para garantizar que los itinerarios se reflejen en menos de 5 minutos sin degradar la latencia de navegación de los usuarios web/móvil.
* **Drivers que aborda:** 
  * **QA-01a** (Performance - Sincronización asincrónica en menos de 5 minutos)[cite: 8].
  * **CRN-02** (Desacoplamiento de procesamiento asincrónico)[cite: 8].
  * **QA-07a** (Escalabilidad - Amortiguación de picos extremos)[cite: 7, 8].

| Opción Evaluada | Pros | Contras | Decisión |
| :--- | :--- | :--- | :--- |
| **Opción A: Publish-Subscribe mediante Broker de Mensajes** | - Desacopla totalmente la recepción del procesamiento pesado.<br>- Amortigua picos de tráfico (Backpressure) mediante consumidores competitivos[cite: 7, 8].<br>- Garantiza que los hilos HTTP del usuario no se bloqueen. | - Añade complejidad de infraestructura (hay que desplegar y mantener un Broker como RabbitMQ o Kafka).<br>- La depuración (debugging) de errores asincrónicos es más compleja. | **Seleccionada.** |
| **Opción B: Procesamiento Sincrónico Directo o Hilos Locales (In-Memory)** | - Arquitectura mucho más simple (sin infraestructura extra).<br>- Trazabilidad y debugging directo en el mismo hilo de ejecución. | - Ante un pico de correos, los hilos de memoria se agotan y el servidor colapsa (**QA-07a**)[cite: 8].<br>- Si el servidor se reinicia, se pierden las tareas en memoria (falta de durabilidad). | *Descartada.* |

---

## Paso 5: Instanciar elementos arquitectónicos y asignar responsabilidades

A partir de los patrones y tácticas seleccionados en el Paso 4 (*Anti-Corruption Layer*, *Publish-Subscribe*, *Domain Model* y *Service Application Reference Architecture*), procedemos a hacer "zoom-in" e instanciar los componentes internos. Nos concentraremos principalmente en la Capa de Lógica de Negocio y la Capa de Integración Externa, explicando cómo estas decisiones impactan en el resto de la arquitectura.

### 1. Capa de Presentación
*   **Influencia de los Patrones:** Gracias a la *Service Application Reference Architecture*, esta capa permanece totalmente aislada de la complejidad del backend y de las reglas de negocio.
*   **Elementos y Responsabilidades:** Instancia las interfaces de usuario (Web SPA y Mobile). Se comunica única y exclusivamente enviando y recibiendo **DTOs (Data Transfer Objects) planos** a través de contratos estándar (REST/JSON), ignorando por completo cómo se procesan o guardan los datos.

### 2. Capa de Servicios y API (API Gateway)
*   **Influencia de los Patrones:** Mantiene su rol de único punto de entrada estandarizado para proteger las interfaces.
*   **Elementos y Responsabilidades:** Enruta las peticiones HTTP entrantes desde la Capa de Presentación directamente hacia los *Controllers* correspondientes en la Capa de Lógica de Negocio, manejando en el futuro la seguridad y limitación de tasa (*rate limiting*).

### 3. Capa de Lógica de Negocio (Backend Core / Orquestador Central)
Aquí se instancian los patrones *Domain Model* y *Publish-Subscribe*, desglosando el núcleo del sistema en componentes altamente cohesivos:
*   **Controllers (API REST Layer):** Exponen los endpoints. Reciben los DTOs desde el Gateway, realizan validaciones sintácticas básicas y delegan la ejecución a la capa de servicios.
*   **Itinerary Domain Service (Orquestador Sincrónico):** Gestiona los flujos de la aplicación (`UC-02`). No implementa reglas de negocio complejas directamente, sino que coordina la recuperación de entidades, invoca sus métodos y delega la persistencia.
*   **Domain Model (Entidades Ricas - DDD):** Es el corazón del sistema. Entidades como `Itinerary`, `FlightReservation` o `HotelReservation` agrupan de forma cohesiva los atributos y las reglas estrictas del negocio (ej. validación de fechas, cálculo de solapamientos). Son totalmente agnósticas a la base de datos o la interfaz.
*   **Message Broker (Cola Asincrónica - Pub/Sub):** Infraestructura de mensajería (ej. RabbitMQ o Kafka) que absorbe la carga pesada (`QA-01a`). Gestiona colas específicas como `email-scan-tasks` (órdenes de sondeo) y `raw-email-events` (correos descargados pendientes de procesamiento).
*   **Workers Asincrónicos (Email Ingestion & Parsing Worker):** Consumidores competitivos que procesan eventos de la cola en segundo plano (`UC-01`). Al finalizar el *parsing*, invocan al *Itinerary Domain Service* para consolidar la reserva, re-utilizando así exactamente la misma lógica de dominio que el flujo sincrónico.

### 4. Capa de Integración Externa
*   **Influencia de los Patrones:** Se materializa directamente el patrón *Anti-Corruption Layer (ACL)* y la táctica *Tailor Interface*.
*   **Elementos y Responsabilidades:** Actúa como mediadora y traductora estricta. Se instancian:
    *   **Mail Provider Adapters (OAuth2/IMAP):** Encapsulan la complejidad de conexión técnica con Gmail o Outlook.
    *   **Travel API Adapters:** Wrappers para absorber los cambios de aerolíneas y hoteles (`QA-05`).
    *   **ACL Engine:** Toma los datos crudos y heterogéneos (XML, JSON externo o correos MIME) y los traduce al DTO interno canonizado (`TravelReservationDTO`).
    *   *Restricción ratificada:* Como establece la arquitectura base (*Layer Bridging*), **ningún componente de esta capa accede a la base de datos**; todo se retorna a la Capa de Negocio.

### 5. Capa de Datos (Persistencia)
*   **Influencia de los Patrones:** Da soporte directo a la persistencia del *Domain Model* sin contaminarlo con lógica SQL.
*   **Elementos y Responsabilidades:** El acceso a la Base de Datos Operacional (OLTP) se realiza mediante **Repositorios (Data Access Layer)**. Estos repositorios actúan como mapeadores (Data Mappers / ORM), encargándose de transformar las filas relacionales de las tablas en instancias vivas de las entidades del modelo de dominio, aislando al núcleo del sistema de los detalles del motor de base de datos.

## Paso 6: Bosquejar vistas y registrar decisiones de diseño

En este paso se generan las representaciones visuales de las estructuras creadas (como bocetos o *sketches* preliminares) para asegurar su preservación y facilitar la comunicación con los *stakeholders*. Además, se formaliza el registro de las decisiones de diseño, sus justificaciones (*rationale*) y las alternativas que fueron descartadas.

### 1. Bosquejo de Vistas Arquitectónicas

Dado que las tácticas aplicadas involucran fuertemente el comportamiento del sistema en tiempo de ejecución (como el procesamiento asincrónico), se prioriza la **Vista de Componentes y Conectores (C&C)** para ilustrar el interior de la Capa de Lógica de Negocio y su interacción con la Capa de Integración Externa.

**Vista 3: Diagrama de Componentes y Conectores (Zoom-in: Runtime de Negocio e Integración)**

```mermaid
flowchart TD
    %% Estilos de la Leyenda y Componentes
    classDef apiComp fill:#d1f2eb,stroke:#1abc9c,stroke-width:2px,color:#000;
    classDef logicComp fill:#aed6f1,stroke:#2980b9,stroke-width:2px,color:#000;
    classDef brokerComp fill:#e8daef,stroke:#8e44ad,stroke-width:2px,color:#000;
    classDef workerComp fill:#f9e79f,stroke:#f39c12,stroke-width:2px,color:#000;
    classDef aclComp fill:#fcf3cf,stroke:#f1c40f,stroke-width:2px,color:#000;
    classDef dataComp fill:#fadbd8,stroke:#c0392b,stroke-width:2px,color:#000;
    classDef keyBox fill:#ffffff,stroke:#333333,stroke-width:1px,stroke-dasharray: 5 5,color:#000;

    subgraph CapaNegocio ["3. Capa de Lógica de Negocio (Runtime Components)"]
        direction TB
        
        %% Service App Architecture Components
        Ctrl[API Controllers\nREST Endpoints]:::apiComp
        ItinSvc[Itinerary Domain Service\nOrquestador]:::logicComp
        Domain[Domain Model Entities\nReglas Core]:::logicComp
        Repo[Data Repositories\nData Mappers]:::logicComp
        
        %% Publish-Subscribe Components
        Broker[[Message Broker\nRabbitMQ / Kafka]]:::brokerComp
        WorkerIngest[Ingestion Worker\nSondeo de Emails]:::workerComp
        WorkerParse[Parsing Worker\nProcesamiento de Textos]:::workerComp
        
        %% Relaciones internas Sincrónicas
        Ctrl -->|Llamada Síncrona / Pasa DTO| ItinSvc
        ItinSvc -->|Invoca Métodos de Negocio| Domain
        ItinSvc -->|Lectura / Guardado| Repo
        
        %% Relaciones Asincrónicas (Pub/Sub)
        ItinSvc -.->|Publica Comando| Broker
        WorkerIngest -.->|Publica Evento 'RawEmail'| Broker
        Broker == "Consume Evento (Push)" ==> WorkerParse
        Broker == "Consume Tarea (Push)" ==> WorkerIngest
        
        %% El Worker reutiliza la lógica sincrónica
        WorkerParse -->|Pasa DTO Canonizado| ItinSvc
    end

    subgraph CapaIntegracion ["4. Capa de Integración Externa"]
        MailACL[Mail Provider ACL\nIMAP/OAuth2 Adapter]:::aclComp
        TravelACL[Travel APIs ACL\nIberia, Booking Adapter]:::aclComp
    end

    subgraph CapaDatos ["5. Capa de Datos"]
        DB[(OLTP Database)]:::dataComp
    end

    %% Conexiones con capas inferiores
    WorkerIngest -->|Petición de Descarga| MailACL
    ItinSvc -->|Consulta de Estado| TravelACL
    Repo -->|Consultas SQL| DB

    %% LEYENDA (Obligatoria para vistas C&C de Bass et al.)
    subgraph Leyenda ["LEYENDA / KEY (C&C View Symbols)"]
        direction LR
        L_Api[Controllers]:::apiComp
        L_Logic[Domain & Services]:::logicComp
        L_Broker[[Message Broker]]:::brokerComp
        L_Worker[Async Workers]:::workerComp
        L_ACL[ACL Adapters]:::aclComp
        L_Conn1[--> Llamada a Método Síncrona / Invocation]
        L_Conn2[-.-> Publicación Asincrónica a Cola]
        L_Conn3[==> Consumo de Mensaje / Suscripción]
    end
    class Leyenda keyBox;
