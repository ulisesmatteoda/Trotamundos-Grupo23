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
