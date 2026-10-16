# Design

## Context

El cambio define dos operaciones W0: `POST /auth/signup` para crear credenciales y `POST /auth/login` para autenticarlas y devolver un token más el `account_id`. Login no consulta ni valida una wallet. Se permiten documentos ficticios `TEST`, `DNI` y `CE`; los registros heredados DNI/CE existentes en `db/users.json` deben seguir siendo utilizables y mantenerse intactos. El contrato de referencia está en `../../../docs/APIs/W0_API.md`; la creación y evolución de la wallet siguen en `../../../docs/APIs/W1_api.md`. La spec de este cambio protege los comportamientos observables; este diseño no los amplía.

W0 y W1 son responsabilidades distintas. El login identifica la cuenta desde el almacén W0 y no requiere asociación `account_id`–`wallet_id`; cualquier consulta de wallet pertenece a un flujo aparte.

## Goals / Non-Goals

**Goals:**
- Aislar autenticación de la creación, activación y disponibilidad de pagos de la wallet.
- Autenticar y devolver el identificador de cuenta sin depender de disponibilidad o asociación de W1.
- Hacer verificables los contratos W0 antes de alterar o introducir comportamiento ejecutable.

**Non-Goals:**
- Cambiar los contratos HTTP de W0 o W1, diseñar el resto de la aplicación o implementar pagos/onboarding.
- Definir recuperación de contraseña, verificación de correo, reglas de complejidad no especificadas, ni un formato concreto del token.
- Usar documentos personales reales: los tipos admitidos son `TEST`, `DNI` y `CE`, pero todos los números de documento usados deben ser ficticios.

## Protected Contracts

- Signup valida `documentType` `TEST`, `DNI` o `CE`, el formato asociado, campos requeridos y correo válido; produce `201` con `account_id` y `REGISTERED`, sin token ni wallet. Documento o correo duplicado produce `409 ACCOUNT_ALREADY_EXISTS`.
- Login acepta esos mismos tipos y los formatos `TEST-`, DNI de 8 dígitos o CE de 9 dígitos. Con credenciales válidas devuelve `access_token`, `token_type=Bearer`, `expires_in` y `account_id`, sin consultar ni devolver datos de wallet.
- Los DNI/CE heredados pueden autenticarse sin modificar sus registros; si falta `account_id`, W0 deriva un identificador estable en memoria. Las nuevas contraseñas se almacenan con hash seguro.
- Credenciales incorrectas producen el mismo `401 INVALID_CREDENTIALS`, sin revelar si falló documento o contraseña. Ninguna respuesta ni error contiene la contraseña.
- Se preservan `400 VALIDATION_ERROR`, `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED` y `503 AUTH_UNAVAILABLE` en sus condiciones contractuales.
- Los contratos, identificadores y responsabilidades de W1 no cambian; autenticarse tampoco habilita pagos que W1 no permita.

## Components Affected

- Adaptadores HTTP de signup/login y validación de sus cuerpos/respuestas.
- Servicio de cuentas y persistencia de identificadores de documento ficticio y credenciales; restricciones únicas para documento y correo, preservando los registros existentes de `db/users.json`.
- Verificación de credenciales y emisión de token, con secretos nunca serializados en respuestas o errores.
- Ninguna integración con W1 es necesaria para signup/login; el servicio no crea, consulta ni cambia wallets.
- Límites compartidos de tamaño de solicitud, limitación de intentos y traducción de errores, reutilizando mecanismos existentes si los hay.
- Pruebas de contrato, integración y regresión para los límites anteriores.

Las ubicaciones concretas y los mecanismos se determinarán al implementar, una vez identificada la tecnología real del servicio; no se presupone una arquitectura nueva.

## Decisions

1. **Mantener separadas cuenta y wallet.** Signup crea solo la cuenta; onboarding sigue siendo dueño de la wallet y su estado. Alternativa considerada: crear wallet al registrar credenciales; se descarta porque contradice W0 y mezcla W1 con autenticación.
2. **Login independiente del onboarding W1.** La autenticación valida las credenciales almacenadas y devuelve `account_id`; no consulta wallet ni necesita una relación cuenta-wallet. La consulta de wallet queda para el flujo correspondiente de W1.
3. **Proteger secretos y hacer cumplir unicidad en persistencia.** Las contraseñas de cuentas nuevas se almacenan con hash seguro y nunca se devuelven ni registran; las altas concurrentes deben respetar unicidad en el almacenamiento. Los registros heredados de prueba contienen contraseñas en texto claro: su verificación se hará en memoria y no modificará esos registros dentro de este cambio. Esa compatibilidad se limita a datos ficticios de prueba y no constituye una práctica aceptable para credenciales de producción.
4. **No acoplar la respuesta de login a W1.** El login no devuelve estado de wallet ni intenta modificarlo.
5. **No inventar umbrales ni semántica de token.** Los límites de payload/intentos y el ciclo de vida del token se configurarán conforme a capacidades y decisiones de producto existentes; `3600` es un ejemplo documental, no una decisión. Si falta una política necesaria, se resolverá antes del despliegue, sin cambiar silenciosamente las respuestas contractuales.
6. **Admitir DNI/CE ficticios sin alterar la fuente existente.** Signup admite DNI de 8 dígitos y CE de 9 dígitos, además de `TEST-`; login puede verificar registros heredados de esos tipos tal como están guardados. Los nuevos registros se agregan sin eliminar ni reescribir usuarios existentes. No se aceptan documentos personales reales.

## Incremental Strategy

1. Añadir primero pruebas de caracterización/contrato descritas abajo y confirmar el comportamiento actual de W1 y de cualquier servicio existente.
2. Implementar validación y alta de cuenta para los tres tipos de documento, con unicidad y escritura no destructiva, sin crear wallet ni iniciar sesión.
3. Implementar login independiente de W1; verificar cuentas nuevas con hash y registros heredados sin alterarlos, emitir token y devolver `account_id`.
5. Conectar límites y errores compartidos; verificar los contratos y estados con pruebas de integración antes de habilitar el flujo.

Login puede ocurrir antes o después del onboarding; no devuelve ni inventa datos de wallet.

## Characterization Tests

Fijar pruebas observables para: payloads y códigos de signup/login; ausencia de token al registrarse; rechazo duplicado de documento/correo; login exitoso con token y `account_id` sin adaptador W1; identificador estable para registros heredados sin modificar el JSON; error idéntico para documento inexistente y contraseña incorrecta; ausencia de contraseña en cuerpos de éxito/error; y respuestas de tamaño excedido, límite e indisponibilidad.

Las pruebas deben cubrir payloads y códigos de signup/login para `TEST`, `DNI` y `CE`; formatos inválidos; ausencia de token al registrarse; preservación de registros existentes; rechazo duplicado; autenticación de hashes nuevos y credenciales heredadas; login exitoso sin wallet; error idéntico para documento inexistente y contraseña incorrecta; ausencia de contraseña en respuestas/logs; y respuestas de tamaño excedido, límite e indisponibilidad.

## Risks / Trade-offs

- [La respuesta de login ya no contiene wallet] → Los clientes que requieran `wallet_id` o estado consultan W1 por separado; no derivar esos datos desde `account_id`.
- [Altas concurrentes eluden una comprobación previa de duplicados] → Respaldar la validación con restricciones únicas y mapear el conflicto al `409` contractual.
- [El error genérico aún permite inferencia por diferencias de tiempo] → Usar caminos de verificación comparables y evitar mensajes/códigos diferenciados; medirlo en pruebas de seguridad sin prometer igualdad temporal absoluta.
- [Políticas de rate limit, tamaño o expiración no están cuantificadas] → No inventar valores; acordarlos y configurarlos antes de producción, con pruebas de límites.
- [Los registros heredados guardan contraseñas en claro] → Limitar esa compatibilidad a fixtures ficticios, no alterar sus filas en este cambio y no reutilizar ese formato para altas nuevas ni producción.
- [La ausencia de aplicación visible puede ocultar restricciones del stack real] → Confirmar runtime, almacenamiento e integración existentes antes de escoger librerías o ubicaciones; evitar dependencias nuevas hasta esa revisión.

## Rollback

Si una versión rompe el contrato, retirar/deshabilitar las rutas nuevas mediante el mecanismo de despliegue existente y volver a la versión anterior; no borrar cuentas ya creadas. Cualquier migración de persistencia deberá ser aditiva y no destructiva; una reversión de esquema solo se considerará tras comprobar que no hay datos en uso. No se presupone una feature flag que el repositorio no documenta.

## Open Questions

- ¿Qué algoritmo/parámetros de hash y qué política de rotación/expiración de token soporta el runtime elegido? Resolver antes de producción, manteniendo el contrato `Bearer` y `expires_in`.
- ¿Qué límites cuantitativos de payload y de intentos se configurarán? Definirlos antes de producción; los códigos HTTP ya están fijados.
- Login devuelve token y `account_id` sin depender de asociación con W1; la wallet y su estado se consultan fuera de este endpoint.
