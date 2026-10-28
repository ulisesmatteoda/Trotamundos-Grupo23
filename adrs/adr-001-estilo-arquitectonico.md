# ADR-001: Selección del Estilo Arquitectónico General y Patrón de Despliegue

### Contexto
Trotamundos es una plataforma *greenfield* para la unificación automática de itinerarios y gestión de reservas. Necesitamos definir una estructura general inicial que soporte los flujos transaccionales en tiempo real, el procesamiento asincrónico (escaneo de correos) y consultas analíticas pesadas del equipo de datos, todo bajo estrictos requerimientos de escalabilidad masiva (15M de cuentas, picos de tráfico extremos) y alta disponibilidad en la nube.

### Decisión
Adoptamos una **Arquitectura Cliente-Servidor Multi-Tier con Backend Desacoplado en Capas lógicas** (Presentación, API Gateway, Lógica de Negocio, Integración y Persistencia). Esta estructura permite separar físicamente el canal de clientes (web/móvil), delegar tareas pesadas a *workers* asincrónicos en segundo plano, y segregar las bases de datos operacionales (OLTP) de las analíticas (OLAP).

### Alternativas Consideradas
1. **Monolito Tradicional de 2 Capas (Descartado):** Aunque es simple de implementar al inicio, la base de datos unificada se convertiría en un cuello de botella infranqueable y un punto único de falla (SPOF). Las consultas analíticas degradarían directamente la experiencia de los usuarios en tiempo real.
2. **Microservicios Puros (Descartado):** Permite un escalado granular excelente, pero añade una complejidad operacional, riesgo de fallas de red e inconsistencia de datos excesiva para la primera iteración de un sistema desde cero (*greenfield*).

### Consecuencias
* **Positivas:** Establece un marco modular y mantenible. Permite el escalado horizontal (*scale-out*) del backend para absorber picos masivos y facilita el aislamiento de integraciones externas (agencias/correos) mediante adaptadores.
* **Negativas:** Introduce una leve sobrecarga de latencia por la indirección entre múltiples capas y balanceadores. *Mitigación:* Se optimizarán los endpoints REST y se utilizará una estricta gestión de tareas asincrónicas.
