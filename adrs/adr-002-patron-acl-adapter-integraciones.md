# ADR-002: Implementación de Anti-Corruption Layer (ACL) y Patrón Adapter para Integraciones Externas

### Contexto
El sistema necesita conectarse con APIs de agencias externas (como Booking, Despegar o Airbnb) para la interoperabilidad de las reservas (QA-03a/b). Sin embargo, estas agencias poseen modelos de datos heterogéneos y políticas que cambian con frecuencia. Es crítico proteger la lógica de negocio core del sistema para garantizar la evolucionabilidad y mantenibilidad (QA-05a/b).

### Decisión
Adoptamos el patrón **Anti-Corruption Layer (ACL) junto con el patrón Adapter (Wrappers)**. Se implementará una capa traductora mediadora compuesta por una interfaz unificada (`IAgenciaAdapter`) y adaptadores concretos (`BookingAdapter`, `DespegarAdapter`). Esta capa envolverá la comunicación HTTP/REST, mapeará los formatos propietarios (JSON/XML) y los traducirá al modelo interno canonizado del dominio, aislando completamente al módulo central (`ViajeService`).

### Alternativas Consideradas
* **Integración Directa Punto a Punto (Descartada):** Aunque ofrece un desarrollo inicial más rápido y menor cantidad de abstracciones, genera un alto acoplamiento. Cualquier cambio en la API de una agencia externa rompería directamente la lógica de negocio core, imposibilitando cumplir con los requerimientos de mantenibilidad.

### Consecuencias
* **Positivas:** Aísla al Core del sistema de los cambios externos. Permite resolver actualizaciones de las APIs de terceros de forma contenida (en menos de 2 días-persona) y facilita agregar nuevas agencias sin tocar el código central.
* **Negativas:** Introduce un ligero *overhead* de procesamiento debido a la constante traducción y mapeo de datos. Requiere un mayor esfuerzo inicial para definir las interfaces abstractas y los DTOs neutros.
