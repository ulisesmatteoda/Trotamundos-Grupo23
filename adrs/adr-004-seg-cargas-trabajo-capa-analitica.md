# ADR-004: Segregación de Cargas de Trabajo y Pipeline Batch ETL para la Capa Analítica

### Contexto
El sistema necesita procesar consultas analíticas pesadas, agregaciones y generación de reportes de viajes (UC-03 / CRN-03) sin degradar la latencia ni la performance de los usuarios en vivo que navegan o crean itinerarios en tiempo real (QA-01). La base de datos relacional operativa no puede asumir ambas cargas simultáneamente sin riesgo de bloqueos y saturación de recursos.

### Decisión
Adoptamos el patrón **Batch ETL asistido por Change Data Capture (CDC) y Réplica de Lectura (Read Replica)**. La base de datos relacional operativa (`PostgreSQL OLTP Primary`) mantendrá exclusivamente las transacciones de usuarios en vivo. Una réplica de lectura (`PostgreSQL Read Replica`) recibirá los cambios y servirá como fuente exclusiva para un proceso por lotes (`ETL Pipeline Worker`), el cual extraerá, transformará y cargará los datos limpios en un almacén optimizado (`Data Warehouse OLAP`).

### Alternativas Consideradas
* **Consultas Analíticas Directas sobre la DB Operacional (Descartada):** Ejecutar reportes pesados directamente sobre PostgreSQL OLTP evita infraestructura adicional y brinda datos analíticos en tiempo real. Sin embargo, provocaría bloqueos de tablas (*locks*), agotamiento de conexiones y una degradación crítica en la experiencia del usuario en tiempo real.

### Consecuencias
* **Positivas:** Elimina por completo la contención de recursos en el sistema transaccional, garantizando el rendimiento en vivo de los viajeros. Optimiza las consultas analíticas de BI al usar un modelo dimensional especializado en el Data Warehouse.
* **Negativas:** Introduce latencia de consistencia eventual en los reportes (los datos analíticos no se ven al segundo, sino tras la corrida del proceso Batch). Agrega infraestructura extra a gestionar (Réplica, Worker ETL y DW).
