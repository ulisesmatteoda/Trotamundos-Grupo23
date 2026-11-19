# ADR-013: Confirmación Humana de las Acciones de Escritura del Asistente (`AccionPendiente`)

### Contexto
El asistente debe poder gestionar reprogramaciones (`UC-04`), lo que implica modificar datos del usuario. Sin embargo, el modelo puede ser inducido a error o manipulado mediante instrucciones incrustadas en mensajes o en datos de origen externo, y una modificación no deseada sobre un itinerario es difícil de detectar para el usuario (`QA-04e`: 0 modificaciones sin confirmación explícita del dueño). Además, las reservas importadas desde correos o agencias (`EMAIL`, `AGENCIA`) existen en el proveedor: modificarlas solo en Trotamundos generaría una inconsistencia con la reserva real.

### Decisión
Ninguna modificación la ejecuta el modelo. La herramienta de escritura (`proponer_reprogramacion`) solo crea una **`AccionPendiente`**: identificador no adivinable, usuario dueño, tipo de acción, parámetros ya validados, versión de la reserva sobre la que se propone, estado (`PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `EXPIRADA`) y una expiración corta (inicialmente 10 minutos). El asistente presenta la propuesta y la interfaz muestra una tarjeta con *Confirmar* y *Cancelar*. La confirmación se realiza mediante un **endpoint propio del API, no a través del texto de la conversación**: el `AsistenteService` verifica que la acción pertenezca al usuario de la sesión, siga pendiente, no haya expirado y que la reserva no haya cambiado desde la propuesta, y recién entonces invoca a `ViajeService`; la operación es idempotente. Los intentos inválidos se deniegan y se registran en `AuditoriaSeguridad`. En esta versión, el asistente aplica la reprogramación únicamente sobre reservas de origen `MANUAL`; para reservas de proveedor, escala a la agencia (ADR-014) con la nueva fecha deseada en la descripción del caso.

### Alternativas Consideradas
* **El modelo ejecuta la acción cuando el usuario responde "sí" en el chat (Descartada):** Es más fluido y simple, pero un "sí" en texto es ambiguo y manipulable, e incumple `QA-04e`.
* **El asistente nunca modifica datos y solo informa o deriva (Descartada):** Elimina el riesgo de escritura, pero no cumple con gestionar reprogramaciones como primer nivel de soporte y desvía casos simples a la agencia.

### Consecuencias
* **Positivas:** 0 modificaciones sin confirmación explícita del dueño; la confirmación es auditable, vence y detecta cambios entre la propuesta y la confirmación. Como no pasa por el LLM, responde en menos de 800 ms. Evita inconsistencias con las reservas gestionadas por proveedores.
* **Negativas:** Agrega un paso al flujo de reprogramación, y las reservas de proveedor no pueden reprogramarse de forma autónoma. *Mitigación:* la tarjeta resume el cambio y requiere un solo toque; reprogramar directamente ante el proveedor podrá incorporarse con un contrato adicional en el ACL, sin modificar esta decisión.

