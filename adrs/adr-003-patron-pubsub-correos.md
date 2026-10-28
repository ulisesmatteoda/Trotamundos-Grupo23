# ADR-003: Adopción del Patrón Publish-Subscribe para el Procesamiento Asincrónico de Correos

### Contexto
El sistema debe realizar la ingesta y el *parsing* automático de los correos de reservas de los usuarios (UC-01). Este proceso es pesado y debe garantizar que las actualizaciones se reflejen en menos de 5 minutos (QA-01a) sin bloquear los hilos HTTP del servidor, amortiguando además posibles picos extremos de tráfico de correos (QA-07a).

### Decisión
Adoptamos el patrón **Publish-Subscribe mediante un Broker de Mensajes (Event Bus/Cola Asincrónica)**. El flujo se divide: un componente emisor (`EmailIngestionListener`) recibe el correo y publica un evento genérico de forma inmediata liberando el hilo; por otro lado, componentes *workers* en segundo plano (`ItinerarioEmailConsumer`) consumen estos eventos de la cola de forma totalmente desacoplada para procesar la información e interactuar con la lógica de negocio.

### Alternativas Consideradas
* **Procesamiento Sincrónico Directo In-Memory (Descartado):** Si bien presenta una arquitectura mucho más simple sin infraestructura adicional y facilita el *debugging*, ante un pico de recepción de correos los hilos del servidor se agotarían provocando un colapso general. Además, carece de durabilidad frente a reinicios del servidor.

### Consecuencias
* **Positivas:** Desacopla totalmente la ingesta (Listener) del procesamiento pesado (Consumer). Nivelará la carga (*load leveling*) amortiguando los picos de tráfico y garantizará que la latencia de navegación de los usuarios web/móvil no se degrade al no bloquearse los hilos HTTP.
* **Negativas:** Añade complejidad a la infraestructura del proyecto al requerir el despliegue y mantenimiento de un Bus/Broker de mensajes. Complica la trazabilidad y depuración (*debugging*) de los eventos asincrónicos.
