# ADR-010: Compartición de Itinerarios mediante Enlace a Recurso Controlado con Lista de Personas Designadas

### Contexto
Los usuarios deben poder compartir sus itinerarios, incluso desde redes sociales (`QA-03c`), garantizando que solo las personas designadas por el dueño puedan visualizarlos (`QA-04b`: 0 accesos de personas no designadas, denegación en menos de 800 ms y registro del intento). La Iteración 3 (ADR-005) estableció la autenticación mediante JWT, pero no modeló el permiso de visualización de un itinerario ajeno. Una publicación en una red social es visible para cualquier persona con acceso a ella, por lo que su contenido no puede incluir datos personales del viaje.

### Decisión
Adoptamos la **compartición mediante un enlace a un recurso `Compartido` controlado por Trotamundos**. El `Compartido` registra el viaje, su dueño, la lista de personas designadas, un identificador de enlace no adivinable y su estado (activo / revocado). A la red social solo se envía un texto y el enlace, nunca el contenido del itinerario. Al abrir el enlace, la persona debe autenticarse con JWT (ADR-005) y el `CompartirService` verifica si está designada; si no lo está, responde `403`, no devuelve datos y registra el intento en `acceso_denegado_log`. El dueño puede modificar la lista o revocar el `Compartido` en cualquier momento.

### Alternativas Consideradas
* **Publicar el contenido del itinerario o un enlace público sin autenticación (Descartada):** Ofrece una experiencia más directa y es más simple de implementar, pero cualquier persona con acceso a la publicación o al enlace vería los datos personales del viaje, incumpliendo `QA-04b`.

### Consecuencias
* **Positivas:** Garantiza que solo las personas designadas visualicen el itinerario y permite auditar los intentos denegados. La revocación no depende de borrar la publicación en la red social. La publicación es liviana (texto + enlace), lo que ayuda a cumplir los 2 segundos de `QA-03c`.
* **Negativas:** La persona designada necesita una cuenta en Trotamundos para ver el itinerario. Agrega una verificación de autorización en cada acceso. *Mitigación:* la verificación es una consulta por clave cacheable en Redis (ADR-007), y el alta de la cuenta invitada se ofrece desde el mismo enlace.
