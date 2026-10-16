# Spec Delta

## Purpose

Esta capacidad permite registrar credenciales e iniciar sesión con documentos ficticios `TEST`, `DNI` o `CE`, devolviendo un token y el identificador de cuenta sin mezclar autenticación con onboarding de wallet.

## ADDED Requirements

### Requirement: Validar datos de registro e inicio de sesión

El sistema SHALL aceptar cada solicitud únicamente cuando sus campos obligatorios sean del tipo esperado, `documentType` sea `TEST`, `DNI` o `CE`, y el documento respete el formato correspondiente: prefijo `TEST-` para `TEST`, exactamente 8 dígitos para `DNI` y exactamente 9 dígitos para `CE`. El registro también requiere un correo válido. Los documentos DNI/CE usados por esta capacidad SHALL ser ficticios. Ante datos inválidos, SHALL responder `400 VALIDATION_ERROR`.

#### Scenario: Registro con datos obligatorios ausentes o inválidos

- **WHEN** el usuario envía el registro sin un campo obligatorio, con un tipo incorrecto, un correo inválido, un `documentType` distinto de `TEST`, `DNI` o `CE`, o un documento que no respeta el formato de su tipo
- **THEN** el sistema responde `400` con el error `VALIDATION_ERROR` y no crea la cuenta

#### Scenario: Inicio de sesión con datos obligatorios ausentes o inválidos

- **WHEN** el usuario inicia sesión sin un campo obligatorio, con un tipo incorrecto, un `documentType` distinto de `TEST`, `DNI` o `CE`, o un documento que no respeta el formato de su tipo
- **THEN** el sistema responde `400 VALIDATION_ERROR` sin autenticar la cuenta

### Requirement: Registrar una cuenta sin iniciar sesión ni crear wallet

El sistema SHALL registrar credenciales válidas para cualquiera de los tres tipos de documento admitidos y responder `201` con `account_id` y estado `REGISTERED`, sin iniciar sesión ni crear una wallet. SHALL guardar las nuevas cuentas en el almacén existente sin eliminar ni alterar registros previos; las contraseñas de las cuentas nuevas SHALL almacenarse de forma segura, nunca en texto claro.

#### Scenario: Registro válido

- **WHEN** el usuario envía `POST /auth/signup` con un documento ficticio válido de tipo `TEST`, `DNI` o `CE`, una contraseña y un correo válido que no estén asociados a otra cuenta
- **THEN** el sistema responde `201` con `account_id` y estado `REGISTERED`, sin token de acceso ni wallet creada

### Requirement: Rechazar credenciales de cuenta duplicadas

El sistema SHALL rechazar el registro cuando el documento o el correo ya estén asociados a una cuenta.

#### Scenario: Documento o correo ya registrado

- **WHEN** el usuario intenta registrar un documento o correo asociado a una cuenta existente
- **THEN** el sistema responde `409 ACCOUNT_ALREADY_EXISTS` y no crea otra cuenta

### Requirement: Autenticar y devolver el identificador de cuenta

El sistema SHALL autenticar credenciales válidas de cuentas registradas con tipo `TEST`, `DNI` o `CE`, sin consultar ni validar una wallet. Para credenciales válidas, SHALL responder `200` con `access_token`, `token_type` `Bearer`, `expires_in` y `account_id`. Puede autenticar registros DNI/CE heredados del almacén existente sin modificarlos.

#### Scenario: Inicio de sesión válido

- **WHEN** una cuenta registrada tiene credenciales válidas e inicia sesión, independientemente de si cuenta con una wallet W1
- **THEN** el sistema responde `200` con `access_token`, `token_type` `Bearer`, `expires_in` y el `account_id` de la cuenta

### Requirement: No revelar qué credencial de inicio de sesión es incorrecta

El sistema SHALL responder con el mismo error genérico para documentos inexistentes y contraseñas incorrectas, sin indicar cuál credencial falló.

#### Scenario: Credenciales incorrectas

- **WHEN** el usuario inicia sesión con un documento inexistente o una contraseña incorrecta
- **THEN** el sistema responde `401 INVALID_CREDENTIALS` sin distinguir cuál dato falló

Un documento DNI/CE con formato válido pero que no está registrado SHALL tratarse como inexistente.

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

El sistema SHALL omitir la contraseña de todas las respuestas, errores y registros, y el registro o inicio de sesión SHALL NOT activar ni modificar una wallet; la disponibilidad de pagos permanece regida por W1. W0 no consulta ni devuelve datos de wallet durante login. La verificación de contraseñas heredadas existentes SHALL NOT alterar esos registros.

#### Scenario: Contraseña no expuesta en respuestas ni errores

- **WHEN** el sistema responde a una solicitud de registro o inicio de sesión, ya sea exitosa o fallida
- **THEN** ninguna respuesta ni error incluye la contraseña enviada

#### Scenario: Inicio de sesión no activa ni cambia la wallet

- **WHEN** el usuario inicia sesión con credenciales válidas para una wallet `ACTIVE`, `PENDING` o `REJECTED`
- **THEN** el sistema conserva el estado previo de la wallet y no amplía la disponibilidad de pagos definida por W1
