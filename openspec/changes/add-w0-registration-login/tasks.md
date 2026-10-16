# Tasks: add-w0-registration-login

## Alcance

GitHub Issues está deshabilitado en este repositorio y el cambio no tiene un identificador de Issue consultable. Por autorización del usuario, el alcance se basa en los artefactos aprobados `proposal.md`, `specs/user-auth/spec.md` y `design.md`, con los contratos de referencia W0; W1 solo se toca para la asociación interna cuenta-wallet y sus pruebas de regresión.

## Checklist de implementación

### 1. Caracterización previa al cambio funcional

- [ ] Identificar la implementación de servicio y el runner de pruebas disponibles; ejecutar y registrar la línea base de los contratos W1 que se conservarán. No cambiar comportamiento funcional durante esta tarea.
- [ ] Añadir pruebas de contrato para solicitudes válidas e inválidas de signup y login: campos obligatorios y tipos, `documentType=TEST`, prefijo `TEST-`, formato de correo en signup, códigos `400 VALIDATION_ERROR` y formas de respuesta aprobadas.
- [ ] Añadir pruebas de caracterización de signup que comprueben `201` con `account_id` y `REGISTERED`, sin token ni wallet; cubrir duplicidad de documento y de correo, incluidas altas concurrentes.
- [ ] Añadir pruebas de contrato de login para credenciales incorrectas (mismo `401 INVALID_CREDENTIALS` para documento inexistente y contraseña incorrecta) y comprobar que ninguna respuesta ni error exponga la contraseña.
- [ ] Caracterizar la integración W1 y añadir pruebas que verifiquen la asociación inequívoca `account_id`–`wallet_id`, la lectura de la wallet correcta y los estados `ACTIVE`, `PENDING` y `REJECTED`; comprobar que login no cambie el estado ni los permisos de pago.
- [ ] Añadir pruebas para `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED` y `503 AUTH_UNAVAILABLE` en signup y login, usando los límites configurados sin inventar umbrales.

### 2. Implementación incremental

- [ ] Implementar validación y signup: guardar credenciales con el mecanismo seguro de hash soportado por el runtime, hacer cumplir unicidad en persistencia y devolver `201` con `account_id` y `REGISTERED`, sin iniciar sesión ni crear wallet.
- [ ] Integrar la persistencia de la asociación cuenta-wallet en el onboarding W1 sin cambiar sus contratos públicos; asegurar consistencia/reintentos y verificar que altas repetidas no creen asociaciones ambiguas ni wallets duplicadas. Si W1 no permite pasar el contexto de cuenta sin cambiar su contrato, detener esta tarea y actualizar la spec/API antes de continuar.
- [ ] Implementar login para cuentas con wallet asociada: verificar credenciales, emitir `Bearer` con `expires_in` y devolver el `wallet_id` asociado y el estado W1 actual, sin mutar la wallet. Usar las capacidades existentes del runtime para token y expiración; no inventar una respuesta para login previo al onboarding.
- [ ] Conectar los límites de tamaño e intentos y la traducción de indisponibilidad para signup y login; devolver los códigos y errores contractuales, empleando políticas aprobadas/configuradas y dejando sin resolver cualquier umbral ausente antes de producción.

### 3. Verificación de integración y regresión

- [ ] Ejecutar las pruebas de contrato e integración de signup, onboarding W1 y login; verificar todos los casos de error, estados de wallet, protección de contraseña y ausencia de cambios en pagos.
- [ ] Ejecutar la suite de regresión W1 y validar que sus solicitudes/respuestas públicas y transiciones de wallet existentes no hayan cambiado.
