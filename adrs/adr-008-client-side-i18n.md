# ADR-008: Desacoplamiento de la Internacionalización (i18n) en Cliente mediante Backend Neutro en UTC

### Contexto
El sistema Trotamundos requiere brindar una experiencia de usuario localizada y accesible en múltiples idiomas, formatos regionales (monedas, números) y husos horarios heterogéneos para los viajes y vuelos de los usuarios (`QA-06`). Formatear textos, fechas y divisas directamente en el servidor (backend) invalida la reutilización de respuestas en la capa de caché distribuida (Redis/CDN) para usuarios con distintas preferencias regionales y acopla la lógica de negocio a la representación visual.

### Decisión
Adoptamos la estrategia de **Internacionalización y Localización en la Capa de Presentación (Client-Side i18n)** combinada con un **Backend Neutro en Estándar UTC (ISO-8601)**. Toda la información persistida y transmitida por la API REST/BFF mantendrá representaciones agnósticas de idioma y marcas de tiempo unificadas en UTC. La Capa de Presentación (Frontend Web/Móvil) incorporará un módulo core de i18n (`I18nProvider`, `DateTimeFormatter`, `CurrencyFormatter`) que cargará bajo demanda paquetes JSON de traducción (`es.json`, `en.json`) y formateará las fechas y monedas según la región (locale) del usuario.

Para cumplir `QA-06d`, los horarios se expresan en la **zona horaria del lugar de cada reserva**, no en la del dispositivo del usuario: un vuelo Buenos Aires → Madrid muestra la salida en hora de Buenos Aires y la llegada en hora de Madrid. Para eso, cada reserva transporta, junto a sus instantes UTC, el identificador de zona IANA de sus lugares (ej. `America/Argentina/Buenos_Aires`, `Europe/Madrid`): la zona del origen para el inicio y, cuando el lugar de finalización es otro (vuelos, trenes, autobuses), la zona del destino para el fin. El `DateTimeFormatter` convierte cada instante UTC a la zona del lugar correspondiente. El identificador de zona es un dato neutro (no depende del idioma ni del usuario), por lo que la respuesta del backend sigue siendo cacheable.

### Alternativas Consideradas
* **Internacionalización y Formateo en el Server-Side / Backend (Descartada):** Procesar y traducir las respuestas HTTP en el servidor según el encabezado `Accept-Language` simplifica el cómputo en el cliente. Sin embargo, invalida el almacenamiento en caché distribuido de respuestas JSON comunes, satura la memoria del backend y acopla el dominio a preocupaciones puramente cosméticas.

### Consecuencias
* **Positivas:** Permite la reutilización total de las respuestas del backend en la capa de caché (Redis), optimizando el rendimiento. Facilita la incorporación de nuevos idiomas mediante la adición de archivos JSON sin necesidad de re-desplegar ni recompilar el servidor.
* **Negativas:** Incrementa ligeramente la carga de cómputo en el dispositivo del usuario final y requiere la gestión de carga diferida (*lazy loading*) de los paquetes de idioma en el cliente. Exige que cada fuente de reservas (correo, agencias, carga manual) informe la zona horaria de los lugares; *Mitigación:* los adaptadores del ACL (ADR-002) completan la zona a partir de los datos del proveedor (ej. aeropuerto o ciudad).
