# ADR-001: Selección del Estilo Arquitectónico General y Patrón de Despliegue

* **Estatus:** Aceptado
* **Decisores:** Grupo 23
* **Fecha:** [Insertar Fecha]
* **Iteración ADD:** Iteración 1 — Definición de la Estructura General (CRN-01)

## Contexto y Problema

El sistema Trotamundos es una plataforma *greenfield* (desarrollada desde cero) para la unificación automática de itinerarios de viaje y gestión de reservas. Se requiere definir la estructura general inicial del sistema (CRN-01) asegurando que la arquitectura pueda dar soporte a los casos de uso primarios (UC-01, UC-02, UC-03) y cumplir con estrictos requerimientos de escalabilidad masiva (15 millones de cuentas, 2 millones de usuarios activos semanales) y consultas analíticas pesadas sin degradar la experiencia en tiempo real.

## Criterios de Decisión (Drivers Arquitectónicos)

* **CRN-01:** Necesidad de establecer una arquitectura de referencia inicial para un sistema *greenfield*.
* **CRN-03:** Aislamiento entre el tráfico transaccional en tiempo real (OLTP) y la carga analítica pesada de datos (OLAP).
* **QA-07:** Escalabilidad masiva para responder a picos masivos de tráfico ante eventos disruptivos.
* **QA-02:** Alta disponibilidad operativa (24/7).
* **QA-05:** Modificabilidad, Mantenibilidad y facilidad de prueba (*Testability*).
* **CON-01 / CON-02:** Despliegue SaaS en la nube (*Cloud-native*) accesible por aplicaciones Web (SPA) y Móviles.

## Opciones Consideradas

1. Monolito Tradicional de 2 Capas (Cliente-Servidor 2-Tier).
2. Arquitectura Orientada a Microservicios Puros.
3. Cliente-Servidor Multi-Tier con Backend Desacoplado en Capas (N-Tier).

## Decisión Tomada

Se elige la **Opción 3: Cliente-Servidor Multi-Tier con Backend Desacoplado en Capas**, porque permite separar conceptualmente las responsabilidades del sistema en capas lógicas de alta cohesión (Presentación, API/Seguridad, Lógica de Negocio, Adaptadores de Integración y Persistencia) y distribuirlas físicamente en niveles (*tiers*) independientes en la nube.

### Justificación

* Aísla el canal de clientes (Móvil y Web) del backend central.
* Independiza las cargas de trabajo mediante trabajadores asincrónicos en segundo plano (*workers*) para el escaneo de correos (UC-01).
* Garantiza la separación entre la base operacional (OLTP) y el repositorio de tendencias analíticas (OLAP) demandado por CRN-03 y UC-03.

## Consecuencias

### Pros
* Satisface CRN-01 estableciendo un marco de trabajo modular, claro y mantenible (QA-05).
* Permite el escalado horizontal (*scale-out*) del backend detrás de un balanceador de carga o API Gateway para absorber picos masivos (QA-07).
* Facilita la aplicación del patrón *Adapter/Anti-Corruption Layer* en la Capa de Integración para conectar proveedores externos de correo y aerolíneas (QA-03).

### Contras (y Mitigaciones)
* Introduce una leve sobrecarga de latencia (*Indirección*) por el paso entre capas lógicas y balanceadores. *Mitigación: Se optimizarán los endpoints REST/JSON y se mantendrá una estricta gestión de asincronía.*

## Evaluación de Alternativas Descartadas

* **Opción 1: Monolito Tradicional de 2 Capas:**
  * *Bueno:* Extremadamente simple de implementar en etapas iniciales.
  * *Malo:* La base de datos centralizada se convierte en un punto único de falla (SPOF) y en un cuello de botella infranqueable ante los picos de tráfico (QA-07). Las consultas analíticas del equipo de datos (UC-03) degradarían directamente las respuestas a los viajeros en vivo.
* **Opción 2: Arquitectura Orientada a Microservicios Puros:**
  * *Bueno:* Permite el escalado independiente y autónomo de cada pequeño componente.
  * *Malo:* Complejidad operacional excesiva para la primera iteración de un sistema *greenfield*, aumentando el riesgo de fallas de red, latencia de indirección e inconsistencia de datos.

## Notas de Trazabilidad
* Esta decisión da soporte directo al Diagrama de Contenedores (C4 Nivel 2) presentado en el Paso 6 de la Iteración 1.
