# W0 · Registro e inicio de sesión

Esta API permite registrar una cuenta con credenciales e iniciar sesión para consultar el estado de su wallet. Es un contrato propuesto: la HU W1 define el onboarding y la creación de la wallet, pero no las credenciales ni la autenticación.

## Flujo de registro e inicio de sesión

1. Envía `POST /auth/signup` con tipo y número de documento ficticios, correo electrónico y contraseña.
2. Completa el onboarding de wallet mediante `POST /kyc/verifications`, descrito en W1.
3. Envía `POST /auth/login` con el tipo y número de documento registrados y la contraseña.
4. Guarda el `access_token` y el `expires_in` de la respuesta. No guardes la contraseña.
5. Usa el estado de wallet devuelto para mostrar si el usuario está activo, pendiente de revisión o rechazado.

## Qué debes comprobar

- Unas credenciales válidas devuelven `200` y un token de acceso, incluso si la wallet está `PENDING` o `REJECTED`. El estado no debe ocultarse: permite explicar al usuario qué debe hacer antes de pagar.
- Unas credenciales inválidas devuelven `401 INVALID_CREDENTIALS`, sin distinguir si el documento existe o si la contraseña es incorrecta.
- La autenticación no activa una wallet ni cambia su estado. Los pagos siguen sujetos al estado de wallet definido por W1.
- La respuesta y los errores nunca incluyen la contraseña.
- El registro valida el formato del correo y rechaza un documento o correo ya asociado a otra cuenta.

## APIs de esta historia

### `POST /auth/signup`

Registra una cuenta con documento ficticio, correo y contraseña. No inicia sesión ni crea una wallet; el onboarding y la creación de wallet se realizan mediante la API de W1.

Campos del cuerpo JSON:

- `documentType`: string, obligatorio. Solo `TEST`; no enviar documentos reales.
- `document`: string, obligatorio. Documento ficticio con prefijo `TEST-`.
- `password`: string, obligatorio. Contraseña para iniciar sesión. No se devuelve en ninguna respuesta.
- `email`: string, obligatorio. Correo electrónico con formato válido.

Ejemplo:

```json
{
  "documentType": "TEST",
  "document": "TEST-001",
  "password": "test-password",
  "email": "usuario@example.test"
}
```

Respuestas HTTP: `201`, `400`, `409`, `413`, `429`, `503`.

Respuesta `201`:

```json
{
  "account_id": "account-001",
  "status": "REGISTERED"
}
```

Errores:

- `400 VALIDATION_ERROR`: falta un campo, un campo tiene tipo o formato incorrecto, o `documentType` no es `TEST`.
- `409 ACCOUNT_ALREADY_EXISTS`: el documento o el correo ya está asociado a una cuenta.
- `413 PAYLOAD_TOO_LARGE`: cuerpo de la petición demasiado grande.
- `429 RATE_LIMITED`: se superó el límite de intentos de registro.
- `503 AUTH_UNAVAILABLE`: el servicio de autenticación no está disponible.

### `POST /auth/login`

Autentica una cuenta creada previamente mediante `POST /auth/signup` y devuelve un token de acceso. Para esta propuesta, el documento `TEST` identifica la cuenta.

Campos del cuerpo JSON:

- `documentType`: string, obligatorio. Solo `TEST`; no enviar documentos reales.
- `document`: string, obligatorio. Documento ficticio registrado, con prefijo `TEST-`.
- `password`: string, obligatorio. Contraseña configurada para la cuenta. No se devuelve en ninguna respuesta.

Ejemplo:

```json
{
  "documentType": "TEST",
  "document": "TEST-001",
  "password": "test-password"
}
```

Respuestas HTTP: `200`, `400`, `401`, `413`, `429`, `503`.

Respuesta `200`:

```json
{
  "access_token": "<token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "wallet_id": "wallet-001",
  "wallet_status": "ACTIVE"
}
```

`wallet_status` puede ser `ACTIVE`, `PENDING` o `REJECTED`, según el resultado del onboarding W1. `expires_in` expresa la duración del token en segundos. El valor de ejemplo y el formato concreto del token deben confirmarse al implementar.

Errores:

- `400 VALIDATION_ERROR`: falta un campo, un campo tiene tipo incorrecto o `documentType` no es `TEST`.
- `401 INVALID_CREDENTIALS`: documento o contraseña incorrectos. El mensaje no revela cuál dato falló.
- `413 PAYLOAD_TOO_LARGE`: cuerpo de la petición demasiado grande.
- `429 RATE_LIMITED`: se superó el límite de intentos de inicio de sesión.
- `503 AUTH_UNAVAILABLE`: el servicio de autenticación no está disponible.

## Supuestos y preguntas abiertas

- El registro de autenticación y la creación de wallet son pasos separados; debe confirmarse cómo se relacionan sus identificadores.
- La política de longitud y complejidad de contraseña, verificación de correo, y recuperación/cambio de contraseña debe definirse antes de producción.
- Debe confirmarse si la respuesta `201` devuelve `account_id` y `status` con el formato propuesto.
- El uso de documento como identificador se limita a datos ficticios `TEST-`; no enviar documentos personales reales.
- Debe confirmarse si las APIs de pagos y wallet exigirán `Authorization: Bearer <access_token>`. W1 no especifica autenticación para sus endpoints.
- Deben confirmarse la expiración, renovación y revocación del token. El `expires_in` de ejemplo no es una decisión de producto.

## Material relacionado

[Leer la historia W0: Registro e inicio de sesión](../HU/W0_hu.md)

[Leer la historia W1: Registro y activación](../HU/W1_hu.md)
