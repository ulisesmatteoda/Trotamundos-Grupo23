# ADR-006: Topología de Despliegue con Auto-Escalado Horizontal y Cluster Balanceado

### Contexto
Trotamundos debe asegurar alta disponibilidad 24/7 (QA-02) y absorber picos extremos e impredecibles de correos y peticiones (QA-07) sin caídas ni lentitud. Los *workers* asincrónicos de ingesta (`ItinerarioEmailConsumer`) definidos previamente deben poder responder dinámicamente ante volúmenes masivos de trabajo.

### Decisión
Adoptamos el patrón **Statutory Auto-Scaling & Load-Balanced Cluster en la Nube**. Toda la infraestructura se despliega en una VPC privada detrás de un **Application Load Balancer (ALB)** que distribuye el tráfico HTTPS (TLS 1.3). El clúster de *workers* asincrónicos se gestiona en un **Auto-Scaling Group (ASG)** monitoreado dinámicamente por la métrica de mensajes acumulados en la cola del Message Broker (`EventBus`).

### Alternativas Consideradas
* **Servidores de Tamaño Fijo / Escalado Vertical (Descartado):** Provisionar infraestructura estática con capacidad máxima resulta económicamente inviable (costos fijos altísimos durante horas valle) y no garantiza absorber picos imprevistos que superen el límite físico de una sola máquina.

### Consecuencias
* **Positivas:** Permite una elasticidad casi infinita para absorber picos masivos de procesamiento de correos en menos de 5 minutos. Garantiza tolerancia a fallos y alta disponibilidad mediante balanceo y réplicas en standby. Optimiza costos operativos (solo se paga por el cómputo encendido).
* **Negativas:** Mayor complejidad en la topología de red en la nube, monitoreo y políticas de orquestación. Los nodos deben ser completamente apátridas (*stateless*) para levantarse y destruirse sin perder información.
