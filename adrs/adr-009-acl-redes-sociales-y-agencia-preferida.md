# ADR-009: Extensión del Anti-Corruption Layer para Redes Sociales y Agencia Preferida con Timeout y Reintento Asincrónico

### Contexto
El sistema debe interoperar con redes sociales para compartir itinerarios (`QA-03c`) y con la agencia de viajes preferida del usuario para resolver problemas con una reserva (`QA-03d`), incluso durante picos de tráfico causados por disrupciones masivas (`QA-06c`). Ambos son sistemas externos con APIs heterogéneas y cambiantes, igual que los proveedores de reservas tratados en el ADR-002. Además, durante una disrupción las agencias suelen estar saturadas, y una falla en la derivación no debe hacer que el usuario pierda su solicitud (`QA-02`).

### Decisión
Extendemos el **Anti-Corruption Layer (ACL)** del ADR-002 con **interfaces segregadas por responsabilidad**: `IRedSocialAdapter` (`publicar`), implementada por `FacebookAdapter` y `XAdapter`, e `IAgenciaSoporteAdapter` (`derivarCaso`), implementada por `DespegarSoporteAdapter`. El contrato `IAgenciaAdapter` no se modifica. Los nuevos servicios de dominio (`CompartirService`, `SoporteService`) dependen solo de estos contratos y ningún adaptador accede a la base de datos.

Para la derivación a la agencia, el `SoporteService` aplica un **timeout de 2 segundos** sobre la llamada sincrónica. Si la agencia falla o no responde a tiempo, publica un `CasoSoportePendienteEvent` en el **Event Bus existente** (ADR-003) y un `SoporteRetryConsumer`, desplegado en el Worker Auto-Scaling Group (ADR-006), reintenta la derivación usando el `casoId` como clave de idempotencia.

### Alternativas Consideradas
* **Ampliar `IAgenciaAdapter` con operaciones de publicación y soporte (Descartada):** Reduce la cantidad de interfaces, pero obliga a adaptadores que no soportan esas operaciones a implementarlas vacías, mezcla responsabilidades y amplía el impacto de los cambios externos, en contra de `QA-05b`.
* **Derivación sincrónica pura sin reintento (Descartada):** Es más simple, pero ante una agencia caída o saturada durante una disrupción el usuario recibe un error y debe reintentar manualmente, lo que incumple `QA-06c`.

### Consecuencias
* **Positivas:** Un cambio en la API de una red social o agencia se localiza en un único adaptador. El caso de soporte nunca se pierde y en operación normal se confirma en menos de 2 segundos. Reutiliza el broker y los workers existentes, sin infraestructura nueva.
* **Negativas:** Aumenta la cantidad de interfaces y adaptadores a mantener. Durante una caída de la agencia la confirmación al usuario es diferida, y los reintentos pueden duplicar casos si la agencia no maneja idempotencia. *Mitigación:* clave de idempotencia `casoId` y estado visible del caso (pendiente / derivado) en la interfaz.
