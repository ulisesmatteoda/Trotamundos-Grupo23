# ADR-008: Desacoplamiento de la Internacionalización (i18n) en Cliente mediante Backend Neutro en UTC

### Contexto
El sistema Trotamundos requiere brindar una experiencia de usuario localizada y accesible en múltiples idiomas, formatos regionales (monedas, números) y husos horarios heterogéneos para los viajes y vuelos de los usuarios (`QA-06`). Formatear textos, fechas y divisas directamente en el servidor (backend) invalida la reutilización de respuestas en la capa de caché distribuida (Redis/CDN) para usuarios con distintas preferencias regionales y acopla la lógica de negocio a la representación visual.

### Decisión
Adoptamos la estrategia de **Internacionalización y Localización en la Capa de Presentación (Client-Side i18n)** combinada con un **Backend Neutro en Estándar UTC (ISO-8601)**. Toda la información persistida y transmitida por la API REST/BFF mantendrá representaciones agnósticas de idioma y marcas de tiempo unificadas en UTC. La Capa de Presentación (Frontend Web/Móvil) incorporará un módulo core de i18n (`I18nProvider`, `DateTimeFormatter`, `CurrencyFormatter`) que cargará bajo demanda paquetes JSON de traducción (`es.json`, `en.json`) y transformará las fechas/monedas al huso horario y región local del usuario.

### Alternativas Consideradas
* **Internacionalización y Formateo en el Server-Side / Backend (Descartada):** Procesar y traducir las respuestas HTTP en el servidor según el encabezado `Accept-Language` simplifica el cómputo en el cliente. Sin embargo, invalida el almacenamiento en caché distribuido de respuestas JSON comunes, satura la memoria del backend y acopla el dominio a preocupaciones puramente cosméticas.

### Consecuencias
* **Positivas:** Permite la reutilización total de las respuestas del backend en la capa de caché (Redis), optimizando el rendimiento. Facilita la incorporación de nuevos idiomas mediante la adición de archivos JSON sin necesidad de re-desplegar ni recompilar el servidor.
* **Negativas:** Incrementa ligeramente la carga de cómputo en el dispositivo del usuario final y requiere la gestión de carga diferida (*lazy loading*) de los paquetes de idioma en el cliente.
