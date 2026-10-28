# ADR-007: Estrategia de Caché de Dos Niveles (CDN Edge + Redis In-Memory) mediante Patrón Cache-Aside

### Contexto
Para garantizar una experiencia fluida en la navegación de itinerarios consolidados y cumplir con los tiempos de respuesta exigidos (`QA-01b, c`), el sistema debe minimizar la latencia de red y reducir la contención de lecturas sobre la base de datos relacional operativa (`PostgreSQL OLTP Primary`). La ejecución constante de consultas sobre el almacenamiento persistente ante usuarios recurrentes ralentiza la aplicación y desperdicia recursos de cómputo.

### Decisión
Adoptamos un patrón de **Almacenamiento en Caché de Dos Niveles (Two-Level Caching)** estructurado mediante:
1. **Capa Edge (CDN):** Servidores en el borde para el almacenamiento y distribución de activos estáticos del frontend y paquetes JSON de localización (`i18n`).
2. **Capa In-Memory Cache (Redis):** Servidor de memoria intermedia ubicado entre el servicio de aplicación (`ViajeService`) y la base de datos PostgreSQL, gestionado bajo el patrón **Cache-Aside**.

Ante una consulta de itinerario, el servicio buscará la clave en Redis (*Cache Hit*); si no existe (*Cache Miss*), leerá de PostgreSQL, responderá al cliente y escribirá el resultado en Redis con un Tiempo de Vida (*TTL*) determinado. Cualquier modificación manual o ingesta asincrónica de reservas invalidará explícitamente la clave correspondiente en Redis.

### Alternativas Consideradas
* **Consultas Directas sobre la BD Operacional con Índices (Descartada):** Mantener PostgreSQL como único punto de lectura simplifica la arquitectura y evita problemas de invalidación de caché, pero genera latencias superiores en picos de demanda y contención de recursos en la base de datos.

### Consecuencias
* **Positivas:** Tiempos de respuesta sub-100ms en lecturas de itinerarios frecuentes (*Cache Hit*) y reducción drástica de la carga sobre la base de datos relacional. Desacopla la entrega de archivos estáticos del servidor de aplicaciones mediante la CDN.
* **Negativas:** Requiere diseñar y mantener la lógica de invalidación y expiración de claves para evitar inconsistencias de datos entre Redis y PostgreSQL. Agrega un componente de infraestructura adicional (clúster de Redis) a monitorear.
