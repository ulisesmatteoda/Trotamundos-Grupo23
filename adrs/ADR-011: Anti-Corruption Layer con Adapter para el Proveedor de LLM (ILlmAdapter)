# ADR-011: Anti-Corruption Layer con Adapter para el Proveedor de LLM (`ILlmAdapter`)

### Contexto
El asistente virtual (`UC-04`) necesita un modelo de lenguaje provisto por un tercero (`CON-05`). Los proveedores de LLM exponen APIs, formatos de herramientas y mecanismos de autenticación distintos, y evolucionan rápidamente. Cambiar de proveedor o de modelo debe poder hacerse sin reescribir el núcleo (`QA-05c`), igual que un cambio en la API de una agencia o una red social se localiza en un único adaptador (`QA-05b`, ADR-002, ADR-009). Además, todo dato que sale hacia el proveedor debe pasar por un único punto controlable (`QA-04f`) y el equipo necesita poder probar y demostrar el asistente sin conexión ni costo de inferencia.

### Decisión
Extendemos el **Anti-Corruption Layer (ACL)** con un nuevo contrato, **`ILlmAdapter`**, cuya operación `completar(entrada, timeoutMs)` recibe las instrucciones del sistema, el historial de mensajes y las definiciones de herramientas como **DTOs neutros**, y devuelve una `RespuestaLlm` con texto final o llamadas a herramientas. El `AsistenteService` depende únicamente de este contrato. Se implementan **`ClaudeAdapter`** (proveedor real; traduce los DTOs al formato del proveedor, toma la clave de API de la configuración y se comunica por un canal cifrado) y **`MockLlmAdapter`** (simulación determinística con modos normal, lento y caído). La implementación activa se selecciona en la raíz de composición mediante configuración, como los demás adaptadores. Ningún adaptador accede a la base de datos. El contrato `ILlmAdapter` es independiente de `IAgenciaAdapter`, `IRedSocialAdapter` e `IAgenciaSoporteAdapter`.

### Alternativas Consideradas
* **Usar el SDK del proveedor directamente desde `AsistenteService` (Descartada):** Requiere menos código inicial, pero acopla el núcleo a un proveedor, obliga a reescribir el servicio para cambiarlo (`QA-05c`) y dificulta las pruebas sin red.
* **Adoptar un framework de orquestación de agentes de terceros (Descartada):** Ofrece abstracciones listas, pero oculta el flujo de control, agrega una dependencia pesada y debilita la trazabilidad entre ADR, contrato y código que exige el enfoque Spec-driven (`CON-03`).

### Consecuencias
* **Positivas:** El cambio de proveedor o de modelo se localiza en un único módulo. Las pruebas y la demostración son determinísticas y no dependen de la red. Todo el tráfico hacia el proveedor pasa por un único punto, donde se concentran el cifrado en tránsito y la resiliencia (ADR-014).
* **Negativas:** Los DTOs neutros cubren solo el mínimo común entre proveedores, por lo que capacidades específicas de uno no se aprovechan. Aumenta en uno la cantidad de contratos del ACL a mantener. *Mitigación:* el contrato se limita a texto y llamadas a herramientas, y se documenta como contrato (Spec-driven).
