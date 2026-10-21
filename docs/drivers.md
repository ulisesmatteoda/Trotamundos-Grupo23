# Architectural Drivers - Sistema "Trotamundos"

## 1. Proposito del Diseño (Design Purpose)

* **DP-01**: Diseñar la arquitectura de software inicial (**greenfield**) para una startup emergente que busca crear una aplicacio con el principal objetivo de unificar distintas aplicaciones de viajes en una a traves de APIs estandar.

- - -

## 2 Funcionalidad Primaria (Primary Functionality)

* **UC-01 — Unificación e Integración Automática de Reservas**: 
Sondear y escanear correos electrónicos de usuarios e integrarse con APIs de terceros (aerolíneas, hoteles, rentadoras) para agregar automáticamente reservas al itinerario. 
* **UC-02 — Gestión Manual y Ciclo de Vida del Viaje**: 
Permitir al usuario crear, modificar o eliminar reservas manualmente, agrupándolas por viaje y archivándolas/eliminándolas automáticamente al completarse el viaje. 
* **UC-03 — Analítica de Datos y Monetización**: 
Recopilar y procesar tendencias y datos de viajes para la ejecución de consultas analíticas pesadas por parte del equipo de datos. 

- - -

## 3. Escenarios de Atributos de Calidad (Quality Attribute Scenarios)

### Resumen y Priorización de Escenarios
| ID | Atributo de Calidad | Descripción Corta | UC Asociado | Prioridad Negocio | Impacto Arquitectónico | |---|---|---|---|---|---| 

| **QA-01** | Performance (Latencia) | La latencia debe ser mínima tanto en la web/móvil como en la sincronización | UC-01, UC-02 | Alta | Alta | 

| **QA-02** | Disponibilidad | El sistema es de uso global y debe ser accesible en todo momento (24/7) | Todos los UC | Alta | Alta | 

| **QA-03** | Interoperabilidad | Conexión vía APIs estándar con aerolíneas, hoteles, agencias y proveedores de correo | UC-01 | Alta | Media |

| **QA-04** | Seguridad | Asegurar la privacidad de los itinerarios y evitar accesos no autorizados | Todos los UC | Alta | Media | 

| **QA-05** | Evolucionabilidad y Mantenibilidad | Prever la integración futura de nuevos medios de transporte y servicios | UC-01 | Alta | Alta | 

| **QA-06** | Usabilidad | Interfaz rica y preparada para operar en el mercado internacional (multirregión) | UC-01, UC-02 | Alta | Media |

| **QA-07** | Escalabilidad | Soportar 15M de cuentas, 2M de activos/semana y picos masivos disruptivos | Todos los UC | Alta | Alta |

- - -

### Detalle de Escenarios (Template de 6 Partes)

#### **QA-01a: Performance - Sincronización Asincrónica de Fuentes Externas**
* **Fuente del Estímulo**: Sistema externo (aerolínea, hotel, proveedor de correo)
* **Estímulo**: Generación de una actualización o modificación de viaje
* **Artefacto**: Módulo de Integración y Sincronización de Trotamundos
* **Ambiente**: Normal
* **Respuesta**: El sistema procesa e integra la actualización en el itinerario del usuario
* **Medida de Respuesta**: La actualización se refleja en la plataforma en menos de 5 minutos desde su generación

#### **QA-01b: Performance - Latencia de Interacción Web**
* **Fuente del Estímulo**: Usuario final desde el navegador web
* **Estímulo**: El usuario realiza una consulta o interacción desde el navegador web.
* **Artefacto**: Aplicación Web / API REST de Trotamundos.
* **Ambiente**: Normal
* **Respuesta**: El sistema procesa la solicitud y renderiza la interfaz gráfica.
* **Medida de Respuesta**: Tiempo de respuesta menor a 800 ms

#### **QA-01c: Performance - Rendimiento de Carga Inicial Mobile**
* **Fuente del Estímulo**: Usuario final desde la app mobile
* **Estímulo**: El usuario abre la aplicación móvil en su dispositivo.
* **Artefacto**: Aplicacion Mobile
* **Ambiente**: Normal
* **Respuesta**: El sistema procesa la solicitud y renderiza la interfaz gráfica.
* **Medida de Respuesta**: First Contentful Paint (FCP) completado en menos de 1.4 segundos

#### **QA-02: Disponibilidad - Uso global y accesible**
* **Fuente del Estimulo**: Falla de infraestructura interna (ej. caída de un servidor/base de datos) o interrupción en un proveedor de la nube.
* **Estimulo**: Ocurre una falla crítica no planificada en uno de los nodos o servicios del backend mientras hay usuarios activos.
* **Artefacto**: Plataforma Backend / Servicios Core de Trotamundos.
* **Ambiente**: Operación normal o pico de tráfico (24/7 global).
* **Respuesta**:El sistema detecta automáticamente la falla, conmuta el tráfico a nodos redundantes de respaldo y recupera el servicio de forma transparente para el usuario.
* **Medida de Respuesta**:El tiempo total acumulado de inactividad no planificada no supera los 5 minutos por mes.

#### **QA-03a: Interoperabilidad - APIs de Proveedores de Viajes (Aerolíneas, Hoteles, Rentadoras)**
* **Fuente del Estímulo:** Sistema externo de viajes (API de aerolínea, hotel o arrendadora).
* **Estímulo:** Envío de detalles de las reservas, actualizaciones o cancelaciones de un viaje a través de APIs estándar.
* **Artefacto:** Módulo de Integración y Adaptadores (External Provider Integration Service).
* **Ambiente:** Funcionamiento normal del sistema.
* **Respuesta:** El sistema se conecta de manera fluida con las APIs estándar externas, recibe la información enviada por las agencias o aerolíneas y actualiza las reservas en el panel.
* **Medida de Respuesta:** El 99% de los detalles, cambios y cancelaciones provenientes de las APIs externas se reflejan correctamente en el itinerario en menos de 30 segundos tras ser emitidos.

#### **QA-03b: Interoperabilidad - Servidores de Correo Electrónico (Escaneo e Ingesta de E-mails)**
* **Fuente del Estímulo:** Servidor de e-mail del usuario.
* **Estímulo:** Llegada de un correo electrónico de viajes enviado por un remitente seguro (incluido en la whitelist).
* **Artefacto:** Módulo de Escaneo y Procesamiento de Correo.
* **Ambiente:** Operación normal en segundo plano.
* **Respuesta:** El sistema lee el mensaje, aplica la lista de remitentes seguros (whitelist), extrae la información del viaje y agrega la reserva automáticamente al itinerario.
* **Medida de Respuesta:** Se leen y agregan automáticamente al itinerario al menos el 95% de los correos de reservas válidos de la whitelist, ignorando los correos no relacionados sin generar errores.

#### **QA-03c: Interoperabilidad - Redes Sociales**
* **Fuente del Estímulo:** Usuario final desde la aplicación Web o Mobile.
* **Estímulo:** El usuario solicita compartir su itinerario activo en sus redes sociales.
* **Artefacto:** Módulo de Conexión con Redes Sociales.
* **Ambiente:** Funcionamiento normal del sistema.
* **Respuesta:** El sistema toma los datos del viaje, los adapta al formato que pide la red social y envía la información.
* **Medida de Respuesta:** La publicación en redes sociales se realiza con éxito en menos de 2 segundos en el 99% de las solicitudes.

#### **QA-03d: Interoperabilidad - Agencia Preferida (Resolución de Problemas)**
* **Fuente del Estímulo:** El usuario desde el panel de control.
* **Estímulo:** El usuario solicita asistencia para resolver un problema o imprevisto con una reserva.
* **Artefacto:** Módulo de Conexión con Agencia Preferida.
* **Ambiente:** Funcionamiento normal del sistema.
* **Respuesta:** El sistema envía los datos del itinerario afectado a la agencia preferida del usuario para facilitar una rápida resolución.
* **Medida de Respuesta:** La información se transfiere a la agencia con éxito en menos de 2 segundos.

#### **QA-04a: Seguridad - Acceso no autorizado a correos de usuarios**
* **Fuente del Estímulo:** Atacante externo (sin credenciales válidas del usuario).
* **Estímulo:** Intenta acceder a los correos de un usuario, o a los tokens de acceso a su proveedor de correo, a través de la API o del módulo de procesamiento.
* **Artefacto:** Módulo de Procesamiento de Correo y almacén de credenciales/tokens de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** El sistema deniega el acceso, registra el intento y genera una alerta al equipo de seguridad.
* **Medida de Respuesta:** El 100% de los intentos no autorizados es bloqueado; el intento queda registrado y la alerta se emite en menos de 1 minuto.

#### **QA-04b: Seguridad - Visualización de itinerarios compartidos**
* **Fuente del Estímulo:** Usuario no designado por el dueño del itinerario.
* **Estímulo:** Intenta visualizar un itinerario compartido (por enlace o desde una red social).
* **Artefacto:** Módulo de Gestión de Itinerarios y control de acceso de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** El sistema verifica la autorización, deniega la visualización y registra el intento.
* **Medida de Respuesta:** 0 accesos a itinerarios por parte de personas no designadas; la denegación se produce en menos de 800 ms.

#### **QA-04c: Seguridad - Revocación de acceso al correo**
* **Fuente del Estímulo:** Usuario titular de la cuenta.
* **Estímulo:** Revoca el permiso de acceso a su correo (o elimina su cuenta).
* **Artefacto:** Módulo de Procesamiento de Correo y almacén de credenciales de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** El sistema detiene el escaneo de ese correo, invalida y elimina los tokens almacenados, y deja de procesar nuevos mensajes.
* **Medida de Respuesta:** No se lee ningún correo del usuario después de la revocación; los tokens quedan inválidos en menos de 1 minuto.

#### **QA-04d: Seguridad - Protección de datos personales ante acceso a la infraestructura**
* **Fuente del Estímulo:** Atacante con acceso al almacenamiento o a la red interna.
* **Estímulo:** Intenta leer datos personales de usuarios (reservas, correos procesados) desde el almacenamiento o interceptando tráfico entre componentes.
* **Artefacto:** Capa de persistencia y comunicaciones entre componentes de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** Los datos personales permanecen ilegibles para el atacante.
* **Medida de Respuesta:** El 100% de los datos personales está cifrado en reposo y en tránsito; ningún dato personal se recupera en texto plano.

#### **QA-05a: Evolucionabilidad - Integración de Nuevo Medio de Transporte**
* **Fuente del Estímulo:** Equipo de desarrollo.
* **Estímulo:** El negocio solicita agregar un nuevo tipo de transporte (ej. trenes o micros) al sistema de itinerarios.
* **Artefacto:** Capa de Integración y Capa de Lógica de Negocio.
* **Ambiente:** Tiempo de diseño y desarrollo.
* **Respuesta:** El equipo extiende el modelo de datos base y crea un nuevo adaptador para el proveedor de trenes, reutilizando la arquitectura existente sin alterar ni reescribir el código que procesa los vuelos y hoteles.
* **Medida de Respuesta:** La nueva funcionalidad se integra en menos de 2 sprints (o 4 semanas) de trabajo, con 0 (cero) modificaciones en el código central (Core) ya existente.

#### **QA-05b: Mantenibilidad - Actualización de API de Proveedor**
* **Fuente del Estímulo:** Equipo de mantenimiento / desarrollo.
* **Estímulo:** Un proveedor de correo o aerolínea (ej. Gmail o Iberia) cambia sus políticas de seguridad o formato de respuesta, requiriendo una actualización en el sistema.
* **Artefacto:** Módulo de Adaptadores (Capa de Integración).
* **Ambiente:** Tiempo de mantenimiento.
* **Respuesta:** El desarrollador aísla el error y modifica únicamente el adaptador específico de ese proveedor, mientras el resto del sistema y los demás conectores siguen funcionando intactos.
* **Medida de Respuesta:** El cambio se localiza en un único archivo/módulo y se implementa con éxito en menos de 2 días-persona de esfuerzo, superando el 100% de las pruebas de regresión.

#### **QA-06a: Usabilidad - Uso de capacidades nativas del móvil (GPS)**
* **Fuente del Estímulo:** Viajero usuario de la aplicación móvil.
* **Estímulo:** Consulta cómo llegar a una reserva de su viaje en curso (hotel, terminal, rentadora) estando en el destino.
* **Artefacto:** Aplicación móvil de Trotamundos (capa de presentación).
* **Ambiente:** Normal, con permiso de ubicación concedido.
* **Respuesta:** El sistema obtiene la ubicación del dispositivo y muestra la posición de la reserva y la ruta para llegar.
* **Medida de Respuesta:** El usuario llega a la información de ruta en un máximo de 2 toques desde el panel del viaje, y la ruta se muestra en menos de 3 segundos.

#### **QA-06b: Usabilidad - Alta manual de una reserva**
* **Fuente del Estímulo:** Usuario que usa la plataforma por primera vez.
* **Estímulo:** Agrega manualmente una reserva a un viaje.
* **Artefacto:** Interfaz de gestión de reservas de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** El sistema guía el alta, valida los datos ingresados y asocia la reserva al viaje correspondiente.
* **Medida de Respuesta:** El 90% de los usuarios nuevos completa el alta sin ayuda externa en menos de 2 minutos.

#### **QA-06c: Usabilidad - Resolución de problemas durante una disrupción**
* **Fuente del Estímulo:** Viajero afectado por una disrupción (vuelo cancelado, demora importante).
* **Estímulo:** Necesita contactar a su agencia de viajes preferida para resolver el problema.
* **Artefacto:** Interfaz del itinerario y módulo de integración con la agencia de viajes de Trotamundos.
* **Ambiente:** Pico de tráfico por disrupción masiva.
* **Respuesta:** El sistema identifica la reserva afectada y deriva al usuario a su agencia con el contexto del problema ya cargado.
* **Medida de Respuesta:** El contacto con la agencia se inicia en un máximo de **3 toques** desde el panel del viaje afectado, transfiriendo el **100% de los datos de la reserva** sin reingreso manual, y con un tiempo de carga de la interfaz menor a **3 segundos** durante el pico de tráfico.

#### **QA-06d: Usabilidad (Internacionalización) - Uso desde otra región**
* **Fuente del Estímulo:** Usuario ubicado en otro país o región.
* **Estímulo:** Accede a la plataforma con un idioma, moneda, formato de fecha y zona horaria distintos a los de origen.
* **Artefacto:** Capa de presentación y servicios regionales de Trotamundos.
* **Ambiente:** Normal.
* **Respuesta:** El sistema presenta la interfaz en el idioma del usuario, con formatos locales y horarios expresados en la zona horaria del lugar de cada reserva.
* **Medida de Respuesta:** El 100% de los textos y formatos de las regiones soportadas está localizado, sin cambios en el código de la lógica de negocio para cada región, y el tiempo de respuesta web se mantiene en 800 ms.

#### **QA-07a: Escalabilidad - Picos Extremos por Disrupciones Masivas de Viaje**
* **Fuente del Estímulo:** Usuarios activos (viajeros afectados).
* **Estímulo:** Aumento repentino del 500 % en el volumen de consultas simultáneas debido a una interrupción masiva de viajes (ej. disrupciones climáticas o cancelación masiva de vuelos).
* **Artefacto:** Plataforma Trotamundos (API Gateway y Servicios de Consulta de Itinerarios).
* **Ambiente:** Operación durante evento de crisis/disrupción.
* **Respuesta:** El sistema escala horizontalmente sus instancias de consulta de forma automática para absorber el pico de tráfico sin rechazar solicitudes.
* **Medida de Respuesta:** El 99 % de las peticiones web mantienen un tiempo de respuesta menor a 800 ms (y menor a 1.4 s de *First Contentful Paint* en móviles), con 0 % de errores por sobrecarga.

#### **QA-07b: Escalabilidad - Carga Sostenida de Usuarios Activos y Picos Semanales**
* **Fuente del Estímulo:** Base global de clientes (hasta 15 millones de cuentas registradas).
* **Estímulo:** Tráfico recurrente de 2 millones de usuarios activos semanales, concentrando picos de uso entre domingo-lunes y jueves-viernes.
* **Artefacto:** Módulo de Gestión de Reservas y Almacenamiento de Datos.
* **Ambiente:** Operación normal en días de pico semanal proyectado.
* **Respuesta:** El sistema redistribuye las consultas hacia réplicas de lectura y balancea la carga de la base de datos.
* **Medida de Respuesta:** La latencia promedio del sistema no se degrada más de un 10 % respecto a la operación en días de tráfico bajo.

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
