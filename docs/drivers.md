# Architectural Drivers - Sistema "Trotamundos"

## 1. Proposito del Diseño (Design Purpose)

* **DP-01**: Diseñar la arquitectura de software inicial (**greenfield**) para una startup emergente que busca crear una aplicacio con el principal objetivo de unificar distintas aplicaciones de viajes en una a traves de APIs estandar.

- - -

##2 Funcionalidad Primaria (Primary Functionality)

\* \*\*UC-01 — Unificación e Integración Automática de Reservas\*\*: 
Sondear y escanear correos electrónicos de usuarios e integrarse con APIs de terceros (aerolíneas, hoteles, rentadoras) para agregar automáticamente reservas al itinerario. 
\* \*\*UC-02 — Gestión Manual y Ciclo de Vida del Viaje\*\*: 
Permitir al usuario crear, modificar o eliminar reservas manualmente, agrupándolas por viaje y archivándolas/eliminándolas automáticamente al completarse el viaje. 
\* \*\*UC-03 — Analítica de Datos y Monetización\*\*: 
Recopilar y procesar tendencias y datos de viajes para la ejecución de consultas analíticas pesadas por parte del equipo de datos. 

- - -


## 3\. Escenarios de Atributos de Calidad (Quality Attribute Scenarios) ### Resumen y Priorización de Escenarios 
| ID | Atributo de Calidad | Descripción Corta | Prioridad Negocio | Impacto Arquitectónico | |---|---|---|---|---| | 
\*\*QA-01\*\* | Performance (Latencia) | La latencia debe ser minima  | Alta | Alta | 
 \*\*QA-02\*\* | Disponibilidad | El sistema es de uso global y debe ser accesible en todo momento | Alta | Alta | |
 \*\*QA-03\*\* | Interoperabilidad| El sistema debe poder conectarse via APIs estandar y poder comunicarse bien con otros sistemas | Alta | Media | | 
\*\*QA-04\*\* | Seguridad | Se debe asegurar que no se pueda acceder a datos de cualquier usuario || Alta | Media | 
\*\*QA-05\*\* | Evolucionabilidad y Mantenibilidad |Debe prever integracion futura de otros transportes  | Alta | Alta | 
\*\QA-06\*\* | Usabilidad | El sistema debe proveer una interfaz rica y preparado [ara operar en el mercado internacional | Alta | Media |
\*\QA-07\*\* | Escalabilidad | Soportar 15M de cuentas, 2M activos/semana y picos disruptivos | Alta | Alta | 

- - -

### Detalle de Escenarios (Template de 6 Partes)


#### 

- - -

## 4. Restricciones (Constraints) 
* **CON-01 — Soporte Multiplataforma (Web y Móvil)**:
 El sistema debe ofrecer interfaz gráfica accesible tanto desde navegadores web como desde dispositivos móviles nativos o híbridos. 
* **CON-02 — Integración con Protocolos/APIs de Correo**:
 La lectura de correos debe realizarse respetando las interfaces y mecanismos de autorización (ej. OAuth2, IMAP) de los proveedores de correo de los usuarios. 
* **CON-03 — Desarrollo Guiado por Especificaciones (Spec-Driven Development)**:
 La arquitectura debe construirse siguiendo especificaciones contractuales estrictas y garantizar trazabilidad mediante registros ADR y un prototipo ejecutable.
 * **CON-04 — Operación Multirregión e Internacional**: 
La plataforma debe diseñarse para operar comercial y técnicamente en el mercado internacional.

- - -

## 5. Preocupaciones Arquitectónicas (Architectural Concerns) 
* **CRN-01 — Estructura General Greenfield**: 
Definir la estructura general inicial del sistema que conecte las aplicaciones cliente (Web/Móvil) con los servicios backend. 
* **CRN-02 — Desacoplamiento de Procesamiento Asincrónico**:
 Diseñar un mecanismo no bloqueante para el escaneo periódico de correos e integración con APIs de terceros sin impactar la experiencia del usuario. 
* **CRN-03 — Separación de Cargas OLTP vs. OLAP**:
 Aislar el procesamiento de transacciones en tiempo real (consultas de itinerario por usuarios) de la ejecución de consultas analíticas pesadas (monetización de datos). * **CRN-04 — Seguridad e Identidad para Compartir Contenido**: Definir el esquema de gestión de tokens de correo y reglas de autorización para el acceso a itinerarios compartidos.
