# Design

## Context

El cambio define dos operaciones W0: `POST /auth/signup` para crear credenciales y `POST /auth/login` para autenticarlas y devolver el token junto al estado de una wallet asociada. El contrato de referencia está en `../../../docs/APIs/W0_API.md`; la creación y evolución de la wallet siguen en `../../../docs/APIs/W1_api.md`. La spec de este cambio protege los comportamientos observables; este diseño no los amplía.

En el repositorio inspeccionado hay documentación y artefactos OpenSpec, pero no se encontró una aplicación ni una estructura de persistencia en la raíz. Por ello, los componentes descritos abajo son límites lógicos, no rutas o frameworks asumidos. La cuenta W0 y la wallet W1 son entidades distintas. Para que login pueda devolver una wallet sin acoplar contratos públicos, el onboarding W1 deberá registrar una asociación interna explícita `account_id`–`wallet_id`.

## Goals / Non-Goals

**Goals:**
- Aislar autenticación de la creación, activación y disponibilidad de pagos de la wallet.
- Mantener la asociación cuenta-wallet inequívoca y consultar su estado actual desde W1 al iniciar sesión.
- Hacer verificables los contratos W0 antes de alterar o introducir comportamiento ejecutable.

**Non-Goals:**
- Cambiar los contratos HTTP de W0 o W1, diseñar el resto de la aplicación o implementar pagos/onboarding.
- Definir recuperación de contraseña, verificación de correo, reglas de complejidad no especificadas, ni un formato concreto del token.
- Usar documentos personales reales: el alcance permanece restringido a documentos ficticios `TEST`.

## Protected Contracts

- Signup valida `documentType=TEST`, prefijo `TEST-`, campos requeridos y correo válido; produce `201` con `account_id` y `REGISTERED`, sin token ni wallet. Documento o correo duplicado produce `409 ACCOUNT_ALREADY_EXISTS`.
- Login exitoso posterior al onboarding devuelve `access_token`, `token_type=Bearer`, `expires_in`, `wallet_id` y `wallet_status`; conserva los estados W1 `ACTIVE`, `PENDING` y `REJECTED`. No activa ni modifica la wallet.
- Credenciales incorrectas producen el mismo `401 INVALID_CREDENTIALS`, sin revelar si falló documento o contraseña. Ninguna respuesta ni error contiene la contraseña.
- Se preservan `400 VALIDATION_ERROR`, `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED` y `503 AUTH_UNAVAILABLE` en sus condiciones contractuales.
- Los contratos, identificadores y responsabilidades de W1 no cambian; autenticarse tampoco habilita pagos que W1 no permita.

## Components Affected

- Adaptadores HTTP de signup/login y validación de sus cuerpos/respuestas.
- Servicio de cuentas y persistencia de identificadores TEST y credenciales; restricciones únicas para documento y correo.
- Verificación de credenciales y emisión de token, con secretos nunca serializados en respuestas o errores.
- Integración interna con onboarding W1 para persistir la asociación explícita entre cuenta y wallet; login lee el estado vigente de W1, no mantiene una copia autoritativa.
- Límites compartidos de tamaño de solicitud, limitación de intentos y traducción de errores, reutilizando mecanismos existentes si los hay.
- Pruebas de contrato, integración y regresión para los límites anteriores.

Las ubicaciones concretas y los mecanismos se determinarán al implementar, una vez identificada la tecnología real del servicio; no se presupone una arquitectura nueva.

## Decisions

1. **Mantener separadas cuenta y wallet.** Signup crea solo la cuenta; onboarding sigue siendo dueño de la wallet y su estado. Alternativa considerada: crear wallet al registrar credenciales; se descarta porque contradice W0 y mezcla W1 con autenticación.
2. **Asociación interna explícita en onboarding W1.** La integración registra `account_id`–`wallet_id` cuando W1 crea la wallet, sin añadir campos ni endpoints públicos. Alternativa: buscar la wallet por documento en cada login; se descarta porque W1 no garantiza unicidad de onboarding y una búsqueda podría producir una asociación ambigua. No se derivará `wallet_id` de `account_id` ni del documento.
3. **Proteger secretos y hacer cumplir unicidad en persistencia.** La contraseña no se almacena en claro ni se devuelve; las altas concurrentes deben respetar unicidad en el almacenamiento, además de validar en la aplicación. Se reutilizará el mecanismo de hash seguro soportado por el runtime existente, en vez de introducir un esquema criptográfico propio. Algoritmo y parámetros concretos se fijarán al conocer ese runtime.
4. **Usar la wallet como fuente de verdad para su estado.** Login solo informa el estado W1 actual y no lo transiciona. Alternativa: duplicar el estado en el registro de autenticación; se descarta por riesgo de divergencia.
5. **No inventar umbrales ni semántica de token.** Los límites de payload/intentos y el ciclo de vida del token se configurarán conforme a capacidades y decisiones de producto existentes; `3600` es un ejemplo documental, no una decisión. Si falta una política necesaria, se resolverá antes del despliegue, sin cambiar silenciosamente las respuestas contractuales.

## Incremental Strategy

1. Añadir primero pruebas de caracterización/contrato descritas abajo y confirmar el comportamiento actual de W1 y de cualquier servicio existente.
2. Implementar validación y alta de cuenta con unicidad, sin crear wallet ni iniciar sesión.
3. Integrar la asociación explícita durante el onboarding W1, preservando sus solicitudes y respuestas públicas.
4. Implementar login para cuentas con wallet asociada; emitir token y leer el estado W1 sin mutarlo.
5. Conectar límites y errores compartidos; verificar los contratos y estados con pruebas de integración antes de habilitar el flujo.

No se desplegará login exitoso con `wallet_id` inventado o una relación ambigua. El comportamiento de login antes de completar onboarding no queda ampliado por esta propuesta; se mantendrá la secuencia documentada de signup, onboarding W1 y luego login.

## Characterization Tests

Antes de cambiar comportamiento crítico, fijar pruebas observables para: payloads y códigos de signup/login; ausencia de wallet/token al registrarse; rechazo duplicado de documento/correo incluso con solicitudes concurrentes; asociación generada por W1 y lectura del `wallet_id` correcto; respuestas de login para cada estado `ACTIVE`, `PENDING` y `REJECTED`; invariancia del estado y permisos de pago después de login; error idéntico para documento inexistente y contraseña incorrecta; ausencia de contraseña en cuerpos de éxito/error; y respuestas de tamaño excedido, límite de intentos e indisponibilidad.

Como el repositorio revisado no contiene código ejecutable visible para caracterizar, estas pruebas primero servirán como pruebas de contrato sobre el comportamiento aprobado y como línea base al incorporar el servicio. Si ya existe implementación fuera de la raíz observada, registrar su comportamiento antes de sustituirlo y resolver diferencias contra la spec, no contra supuestos.

## Risks / Trade-offs

- [La integración W1 no tiene contexto de cuenta disponible] → Pasar el contexto mediante la integración interna existente; si no es posible sin alterar el contrato W1, detener implementación y acordar un delta de spec/API en vez de correlacionar de forma heurística.
- [La creación de wallet y la asociación pueden quedar parcialmente aplicadas] → Definir una operación consistente/reintentable y probar fallos entre ambas escrituras; no duplicar wallets al reintentar.
- [Altas concurrentes eluden una comprobación previa de duplicados] → Respaldar la validación con restricciones únicas y mapear el conflicto al `409` contractual.
- [El error genérico aún permite inferencia por diferencias de tiempo] → Usar caminos de verificación comparables y evitar mensajes/códigos diferenciados; medirlo en pruebas de seguridad sin prometer igualdad temporal absoluta.
- [Políticas de rate limit, tamaño o expiración no están cuantificadas] → No inventar valores; acordarlos y configurarlos antes de producción, con pruebas de límites.
- [La ausencia de aplicación visible puede ocultar restricciones del stack real] → Confirmar runtime, almacenamiento e integración existentes antes de escoger librerías o ubicaciones; evitar dependencias nuevas hasta esa revisión.

## Rollback

Si una versión rompe el contrato o la asociación, retirar/deshabilitar las rutas nuevas mediante el mecanismo de despliegue existente y volver a la versión anterior; no intentar revertir cambios de estado de wallets ni borrar cuentas ya creadas. Mantener la asociación añadida de forma compatible durante el rollback. Cualquier migración de persistencia deberá ser aditiva y no destructiva; una reversión de esquema solo se considerará tras comprobar que no hay datos en uso. No se presupone una feature flag que el repositorio no documenta.

## Open Questions

- ¿Qué algoritmo/parámetros de hash y qué política de rotación/expiración de token soporta el runtime elegido? Resolver antes de producción, manteniendo el contrato `Bearer` y `expires_in`.
- ¿Qué límites cuantitativos de payload y de intentos se configurarán? Definirlos antes de producción; los códigos HTTP ya están fijados.
- ¿Qué respuesta debe darse si se intenta login antes de que W1 haya asociado una wallet? El flujo documentado realiza onboarding antes de login; si se requiere permitir el orden contrario, actualizar primero la spec y su contrato de error.
