# W0 · Registro e inicio de sesión

Esta API permite registrar una cuenta con credenciales e iniciar sesión para obtener un token de acceso y el identificador de cuenta. La consulta y el estado de la wallet pertenecen a W1 y no forman parte del login W0.

## Flujo de registro e inicio de sesión

1. Envía `POST /auth/signup` con tipo y número de documento ficticios, correo electrónico y contraseña. Se admiten `TEST`, `DNI` y `CE`.
2. Si corresponde, completa el onboarding de wallet por separado mediante `POST /kyc/verifications`, descrito en W1.
3. Envía `POST /auth/login` con el tipo y número de documento registrados y la contraseña.
4. Guarda el `access_token` y el `expires_in` de la respuesta. No guardes la contraseña.
5. Conserva `account_id` para identificar la cuenta autenticada. La respuesta de login no contiene datos de wallet.

## Qué debes comprobar

- Unas credenciales válidas devuelven `200`, un token de acceso y `account_id`; login no consulta ni valida una wallet.
- Unas credenciales inválidas devuelven `401 INVALID_CREDENTIALS`, sin distinguir si el documento existe o si la contraseña es incorrecta.
- La autenticación no activa una wallet ni cambia su estado. Los pagos siguen sujetos al estado de wallet definido por W1.
- La respuesta y los errores nunca incluyen la contraseña.
- El registro valida el formato del correo y rechaza un documento o correo ya asociado a otra cuenta.

## APIs de esta historia

### `POST /auth/signup`

Registra una cuenta con documento ficticio, correo y contraseña. No inicia sesión ni crea una wallet; el onboarding y la creación de wallet se realizan mediante la API de W1. Los documentos deben ser ficticios, incluso al usar los tipos `DNI` o `CE`.

Campos del cuerpo JSON:

- `documentType`: string, obligatorio. Valores: `TEST`, `DNI` o `CE`; no enviar documentos reales.
- `document`: string, obligatorio. Para `TEST`, debe comenzar con `TEST-`; para `DNI`, debe tener exactamente 8 dígitos; para `CE`, exactamente 9 dígitos.
- `password`: string, obligatorio. Contraseña para iniciar sesión. No se devuelve en ninguna respuesta.
- `email`: string, obligatorio. Correo electrónico con formato válido.

Ejemplos de formatos ficticios:

| `documentType` | `document` |
| --- | --- |
| `TEST` | `TEST-001` |
| `DNI` | `48391726` |
| `CE` | `104826371` |

Ejemplo:

```json
{
  "documentType": "DNI",
  "document": "00000000",
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

- `400 VALIDATION_ERROR`: falta un campo, un campo tiene tipo o formato incorrecto, el correo no es válido o el documento no respeta el formato del tipo (`TEST-`, 8 dígitos DNI o 9 dígitos CE).
- `409 ACCOUNT_ALREADY_EXISTS`: el documento o el correo ya está asociado a una cuenta.
- `413 PAYLOAD_TOO_LARGE`: cuerpo de la petición demasiado grande.
- `429 RATE_LIMITED`: se superó el límite de intentos de registro.
- `503 AUTH_UNAVAILABLE`: el servicio de autenticación no está disponible.

### `POST /auth/login`

Autentica una cuenta y devuelve un token de acceso más el `account_id` del registro. No consulta ni valida una wallet. Se admiten documentos ficticios `TEST`, `DNI` y `CE`, con los formatos indicados arriba. Las credenciales de registros DNI/CE heredados también se verifican sin modificar sus filas; si un registro heredado no contiene `account_id`, W0 genera un identificador estable derivado del tipo y documento sin escribirlo en el JSON.

Campos del cuerpo JSON:

- `documentType`: string, obligatorio. Valores: `TEST`, `DNI` o `CE`; no enviar documentos reales.
- `document`: string, obligatorio. Documento ficticio registrado: prefijo `TEST-`, exactamente 8 dígitos para `DNI` o exactamente 9 para `CE`.
- `password`: string, obligatorio. Contraseña configurada para la cuenta. No se devuelve en ninguna respuesta.

Ejemplo:

```json
{
  "documentType": "CE",
  "document": "00000001",
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
  "account_id": "account-001"
}
```

El backend W0 emite un token opaco `Bearer` con duración de 3600 segundos (`expires_in`). La respuesta no contiene datos de wallet; login no depende de que el onboarding W1 se haya completado.

Errores:

- `400 VALIDATION_ERROR`: falta un campo, un campo tiene tipo incorrecto o el documento no respeta el formato para `TEST`, `DNI` o `CE`.
- `401 INVALID_CREDENTIALS`: el documento no existe o la contraseña es incorrecta. La respuesta no revela cuál dato falló.
- `413 PAYLOAD_TOO_LARGE`: cuerpo de la petición demasiado grande.
- `429 RATE_LIMITED`: se superó el límite de intentos de inicio de sesión.
- `503 AUTH_UNAVAILABLE`: el servicio de autenticación o la persistencia/emisión del token no está disponible.

## Supuestos y preguntas abiertas

- El registro de autenticación y la creación/consulta de wallet son pasos separados. W0 no asocia, consulta ni valida wallets durante login.
- La política de longitud y complejidad de contraseña, verificación de correo, y recuperación/cambio de contraseña debe definirse antes de producción.
- Debe confirmarse si la respuesta `201` devuelve `account_id` y `status` con el formato propuesto.
- Los formatos aceptados son `TEST-`, DNI de 8 dígitos y CE de 9 dígitos, pero los datos usados deben ser ficticios; no enviar documentos personales reales.
- Debe confirmarse si las APIs de pagos y wallet exigirán `Authorization: Bearer <access_token>`. W1 no especifica autenticación para sus endpoints.
- Deben confirmarse la expiración, renovación y revocación del token. El `expires_in` de ejemplo no es una decisión de producto.

## Material relacionado

[Leer la historia W0: Registro e inicio de sesión](../HU/W0_hu.md)

[Leer la historia W1: Registro y activación](../HU/W1_hu.md)
