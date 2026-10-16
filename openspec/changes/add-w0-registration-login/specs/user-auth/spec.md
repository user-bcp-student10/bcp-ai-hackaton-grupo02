# Spec Delta

## Purpose

Esta capacidad permite registrar credenciales e iniciar sesión con documentos ficticios, exponiendo el estado de wallet asociado sin mezclar autenticación con onboarding o activación.

## ADDED Requirements

### Requirement: Validar datos de registro e inicio de sesión

El sistema SHALL aceptar cada solicitud únicamente cuando sus campos obligatorios sean del tipo esperado y el documento use `documentType` `TEST` y prefijo `TEST-`; el registro también requiere un correo válido. Ante datos inválidos, SHALL responder `400 VALIDATION_ERROR`.

#### Scenario: Registro con datos obligatorios ausentes o inválidos

- **WHEN** el usuario envía el registro sin un campo obligatorio, con un tipo incorrecto, un correo inválido, un `documentType` distinto de `TEST` o un documento sin prefijo `TEST-`
- **THEN** el sistema responde `400` con el error `VALIDATION_ERROR` y no crea la cuenta

#### Scenario: Inicio de sesión con datos obligatorios ausentes o inválidos

- **WHEN** el usuario inicia sesión sin un campo obligatorio, con un tipo incorrecto, un `documentType` distinto de `TEST` o un documento sin prefijo `TEST-`
- **THEN** el sistema responde `400 VALIDATION_ERROR` sin autenticar la cuenta

### Requirement: Registrar una cuenta sin iniciar sesión ni crear wallet

El sistema SHALL registrar credenciales válidas y responder `201` con `account_id` y estado `REGISTERED`, sin iniciar sesión ni crear una wallet.

#### Scenario: Registro válido

- **WHEN** el usuario envía `POST /auth/signup` con `documentType` `TEST`, un documento `TEST-`, una contraseña y un correo válido que no estén asociados a otra cuenta
- **THEN** el sistema responde `201` con `account_id` y estado `REGISTERED`, sin token de acceso ni wallet creada

### Requirement: Rechazar credenciales de cuenta duplicadas

El sistema SHALL rechazar el registro cuando el documento o el correo ya estén asociados a una cuenta.

#### Scenario: Documento o correo ya registrado

- **WHEN** el usuario intenta registrar un documento o correo asociado a una cuenta existente
- **THEN** el sistema responde `409 ACCOUNT_ALREADY_EXISTS` y no crea otra cuenta

### Requirement: Autenticar y devolver el estado de wallet

El sistema SHALL autenticar las credenciales válidas de una cuenta registrada y, una vez completado el onboarding asociado de W1, responder `200` con `access_token`, `token_type` `Bearer`, `expires_in`, `wallet_id` y `wallet_status`.

#### Scenario: Inicio de sesión con wallet activa

- **WHEN** una cuenta con credenciales válidas tiene una wallet W1 en estado `ACTIVE` e inicia sesión
- **THEN** el sistema responde `200` con los campos del token, el identificador de esa wallet y `wallet_status` `ACTIVE`

#### Scenario: Inicio de sesión con wallet pendiente

- **WHEN** una cuenta con credenciales válidas tiene una wallet W1 en estado `PENDING` e inicia sesión
- **THEN** el sistema responde `200` con los campos del token, el identificador de esa wallet y `wallet_status` `PENDING`

#### Scenario: Inicio de sesión con wallet rechazada

- **WHEN** una cuenta con credenciales válidas tiene una wallet W1 en estado `REJECTED` e inicia sesión
- **THEN** el sistema responde `200` con los campos del token, el identificador de esa wallet y `wallet_status` `REJECTED`

### Requirement: No revelar qué credencial de inicio de sesión es incorrecta

El sistema SHALL responder con el mismo error genérico para documentos inexistentes y contraseñas incorrectas, sin indicar cuál credencial falló.

#### Scenario: Credenciales incorrectas

- **WHEN** el usuario inicia sesión con un documento inexistente o una contraseña incorrecta
- **THEN** el sistema responde `401 INVALID_CREDENTIALS` sin distinguir cuál dato falló

### Requirement: Rechazar solicitudes excesivas o cuando autenticación no está disponible

El sistema SHALL responder `413 PAYLOAD_TOO_LARGE` si una solicitud excede el tamaño permitido, `429 RATE_LIMITED` si se supera el límite de intentos y `503 AUTH_UNAVAILABLE` si el servicio de autenticación no está disponible.

#### Scenario: Solicitud por encima del tamaño permitido

- **WHEN** una solicitud de registro o inicio de sesión excede el tamaño permitido
- **THEN** el sistema responde `413 PAYLOAD_TOO_LARGE`

#### Scenario: Límite de intentos excedido

- **WHEN** el usuario supera el límite de intentos de registro o inicio de sesión
- **THEN** el sistema responde `429 RATE_LIMITED`

#### Scenario: Servicio de autenticación no disponible

- **WHEN** el servicio de autenticación no puede atender una solicitud
- **THEN** el sistema responde `503 AUTH_UNAVAILABLE`

### Requirement: Proteger la contraseña y preservar el estado de wallet

El sistema SHALL omitir la contraseña de todas las respuestas y errores, y el registro o inicio de sesión SHALL NOT activar ni modificar el estado de una wallet; la disponibilidad de pagos permanece regida por W1.

#### Scenario: Contraseña no expuesta en respuestas ni errores

- **WHEN** el sistema responde a una solicitud de registro o inicio de sesión, ya sea exitosa o fallida
- **THEN** ninguna respuesta ni error incluye la contraseña enviada

#### Scenario: Inicio de sesión no activa ni cambia la wallet

- **WHEN** el usuario inicia sesión con credenciales válidas para una wallet `ACTIVE`, `PENDING` o `REJECTED`
- **THEN** el sistema conserva el estado previo de la wallet y no amplía la disponibilidad de pagos definida por W1
