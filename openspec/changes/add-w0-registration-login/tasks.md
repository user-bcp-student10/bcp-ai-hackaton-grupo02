# Tasks: add-w0-registration-login

## Alcance

GitHub Issues está deshabilitado en este repositorio y el cambio no tiene un identificador de Issue consultable. Por autorización del usuario, el alcance se basa en los artefactos `proposal.md`, `specs/user-auth/spec.md` y `design.md`; incluye compatibilidad de documentos ficticios `TEST`, `DNI` y `CE`, preservación de `db/users.json` y login independiente de W1, con token y `account_id`.

## Regresión W1 pendiente

El repositorio contiene documentación W1, pero no una implementación ejecutable ni una suite de regresión W1. W0 login ya no depende de W1 y no modifica su contrato; las pruebas específicas de regresión W1 permanecen pendientes hasta disponer de una implementación.

## Checklist de implementación

### 1. Caracterización previa al cambio funcional

- [ ] Ejecutar y registrar la línea base de los contratos W1 que se conservarán. El repositorio no incluye runtime ni suite W1; esta tarea queda pendiente hasta que estén disponibles.
- [x] Añadir pruebas de contrato para solicitudes válidas e inválidas de signup y login: campos obligatorios y tipos, `documentType=TEST`, prefijo `TEST-`, formato de correo en signup, códigos `400 VALIDATION_ERROR` y formas de respuesta aprobadas.
- [x] Añadir pruebas de caracterización de signup que comprueben `201` con `account_id` y `REGISTERED`, sin token ni wallet; cubrir duplicidad de documento y de correo, incluidas altas concurrentes.
- [x] Añadir pruebas de contrato de login para credenciales incorrectas (mismo `401 INVALID_CREDENTIALS` para documento inexistente y contraseña incorrecta) y comprobar que ninguna respuesta ni error exponga la contraseña.
- [x] Añadir pruebas para signup/login con `documentType` `DNI` y `CE`, formatos de 8/9 dígitos, autenticación de registros heredados, preservación íntegra de filas existentes y login exitoso sin consulta W1.
- [x] Añadir pruebas de login exitoso sin adaptador W1: `200` con token y `account_id`, sin campos de wallet ni llamadas a W1.
- [x] Añadir pruebas para `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED` y `503 AUTH_UNAVAILABLE` en signup y login, usando los límites configurados sin inventar umbrales.

### 2. Implementación incremental

- [x] Implementar validación y signup: guardar credenciales con el mecanismo seguro de hash soportado por el runtime, hacer cumplir unicidad en persistencia y devolver `201` con `account_id` y `REGISTERED`, sin iniciar sesión ni crear wallet.
- [x] Mantener login independiente de W1: verificar credenciales, emitir `Bearer` con `expires_in` y devolver el `account_id` sin consultar ni validar wallet.
- [x] Ampliar signup/login para `DNI` y `CE` ficticios; guardar nuevas contraseñas con hash, autenticar las filas heredadas sin modificarlas y derivar un `account_id` estable en memoria si una fila heredada no lo contiene.
- [x] Conectar los límites de tamaño e intentos y la traducción de indisponibilidad para signup y login; devolver los códigos y errores contractuales, empleando políticas aprobadas/configuradas y dejando sin resolver cualquier umbral ausente antes de producción.

### 3. Verificación de integración y regresión

- [x] Alinear `docs/APIs/W0_API.md` y el contrato OpenAPI con los formatos admitidos y la respuesta de login con `access_token`, `token_type`, `expires_in` y `account_id`, sin datos de wallet.
- [x] Ejecutar las pruebas de contrato de signup/login y verificar validaciones, credenciales, token, preservación de usuarios y protección de contraseña.
- [ ] Ejecutar la suite de regresión W1 y validar que sus solicitudes/respuestas públicas y transiciones de wallet existentes no hayan cambiado cuando el runtime W1 esté disponible.
