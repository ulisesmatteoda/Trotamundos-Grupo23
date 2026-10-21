## Iteración 2: Refinamiento de la Lógica Core y las Integraciones

### Paso 1: Revisar las entradas (Inputs)
* **Requerimientos a satisfacer:** El objetivo ahora es habilitar la implementación técnica de los casos de uso principales: la gestión de viajes (`UC-02`) y la ingesta asincrónica de correos (`UC-01` / `QA-01a`).
* **Restricciones:** Mantener la separación de responsabilidades dictada por el patrón de Capas (`ADR-001`).

### Paso 2: Establecer el objetivo de la iteración
El objetivo de esta iteración es diseñar la estructura interna de las capas responsables de procesar la información del negocio y de comunicarse con el mundo exterior, definiendo los módulos de software necesarios para que los desarrolladores puedan comenzar a especificar las APIs (Spec-driven).

### Paso 3: Elegir los elementos a refinar
De las 5 capas definidas en la Iteración 1, se seleccionan dos para hacer *zoom-in* debido a su complejidad e impacto en los atributos de calidad:

* **La Capa de Lógica de Negocio:** Porque concentra las reglas de dominio y el procesamiento en segundo plano (*Workers*).
* **La Capa de Integración Externa:** Porque es la responsable de absorber la volatilidad técnica de las APIs de terceros y los servidores de correo, garantizando la Evolucionabilidad (`QA-05a`) y Mantenibilidad (`QA-05b`).
