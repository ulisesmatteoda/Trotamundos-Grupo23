## Iteracion 1 

## Paso 1: Revision de entradas
  Al no tener entradas previas (Greenfield), este paso es salteado.

- - -

## Paso 2: Establecer el objetivo de la iteración seleccionando los drivers
Para asegurar que la base del diseño soporte las necesidades más críticas, se seleccionan los siguientes drivers arquitectónicos:
- **CRN-01 (Estructura General Greenfield):** Necesidad de definir el esqueleto principal que conecte a los usuarios con el backend.
- **CON-01 (Soporte Multiplataforma):** Obligación de soportar clientes Web y Móviles de forma estandarizada.
- **QA-07 (Escalabilidad):** El sistema base debe estar preparado físicamente para escalar y soportar 15 millones de cuentas y picos masivos.
- **QA-02 (Disponibilidad):** Operación global 24/7, lo que impide concentrar todo el sistema en un único punto de fallo.
- **CRN-02 / QA-01a (Desacoplamiento Asincrónico):** Necesidad de aislar el escaneo de correos del flujo principal de navegación del usuario.

- - - 

## Paso 3: Elegir uno o más elementos del sistema a refinar

Dado que el proyecto "Trotamundos" es un desarrollo *greenfield* (creado desde cero, según CRN-01) y esta es la primera iteración de diseño, no existe una estructura o arquitectura previa. 

Por lo tanto, el elemento seleccionado para refinar es el **Sistema Trotamundos en su totalidad**. En este punto, el sistema se considera como una "caja negra" que debe ser abierta para comenzar a particionarlo y definir sus responsabilidades lógicas y físicas iniciales.

- - -

## Paso 4: Elegir los conceptos de diseño que satisfacen los drivers seleccionados

Para esta primera iteración, la decisión arquitectónica principal es adoptar un estilo híbrido: Arquitectura Lógica de Capas (Layers) desplegada sobre un modelo físico Cliente-Servidor Multi-Tier (N-Tier). Esta selección permite establecer una estructura general robusta para el sistema greenfield.

**Justificación de la decisión:**

- **Soporte funcional y modularidad (CRN-01 y CON-03)**: El patrón de Layers organiza el código separando estrictamente la interfaz de usuario, la lógica de negocio, la integración de APIs externas y el acceso a datos. Esto permite un desarrollo guiado por especificaciones ordenado y facilita la construcción del prototipo por etapas.
- **Soporte multiplataforma (CON-01)**: El modelo Cliente-Servidor aísla completamente las aplicaciones cliente (Web y Móvil) de la infraestructura central, comunicándose únicamente a través de APIs estándar.
- **Escalabilidad y Disponibilidad (QA-07 y QA-02)**: El patrón Multi-Tier permite que cada capa lógica se despliegue en clústeres de servidores físicos independientes. Ante picos masivos de tráfico, la capa de Lógica de Negocio (Backend) puede escalar horizontalmente sin afectar a los clientes ni a los servidores de bases de datos.
- **Desacoplamiento asincrónico (CRN-02 y QA-01a)**: Dentro de la capa de lógica de negocio, se aislará el procesamiento de correos mediante sub-módulos de Workers Asincrónicos (procesamiento en segundo plano), garantizando que los hilos de respuesta web no se bloqueen.
