# ADR-005: Autenticación Perimetral mediante JWT y Cifrado de Tokens con Envelope Encryption (KMS)

### Contexto
Para garantizar la seguridad, privacidad y acceso a los correos de los usuarios (QA-04a,b,c,d / CON-02), el sistema debe autenticar solicitudes entrantes y almacenar de forma segura las credenciales y tokens OAuth2 obtenidos de proveedores externos (Google, Microsoft). Es crítico evitar la filtración o exposición en texto plano de llaves de acceso a casillas privadas.

### Decisión
Adoptamos **Autenticación Basada en Tokens (JWT)** validada centralizadamente en el API Gateway y el patrón **Envelope Encryption (Cifrado en Envoltorio) con KMS/Crypto Vault**. Toda petición HTTP/REST validará un JWT firmado. Al capturar tokens de correo OAuth2, el sistema los cifrará mediante algoritmos simétricos (AES-256) administrados por un Key Management Service (KMS) antes de persistirlos en la base de datos.

### Alternativas Consideradas
* **Almacenamiento de Tokens en Texto Plano / Cifrado Simple en Aplicación (Descartado):** Aunque simplifica la implementación inicial, almacenar tokens sin cifrar o con claves quemadas en el código fuente vulnera los requerimientos de seguridad y privacidad ante eventuales filtraciones de la base de datos.

### Consecuencias
* **Positivas:** Ofrece seguridad de nivel empresarial, aislamiento perimetral de la autenticación y cumplimiento de normativas de privacidad. Permite la rotación periódica de claves de cifrado en el KMS sin alterar la lógica de negocio ni el modelo de datos.
* **Negativas:** Suma latencia mínima por las operaciones criptográficas e incrementa la complejidad operativa al requerir la gestión y custodia de un servicio de claves (KMS).
