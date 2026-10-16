# W0 · Inicio de sesión

Esta API permite que un usuario con una cuenta creada durante el onboarding inicie sesión y consulte el estado de su wallet. Es un contrato propuesto: la HU W1 no define credenciales ni autenticación.

## Flujo de inicio de sesión

1. Envía `POST /auth/login` con el tipo y número de documento ficticio registrados y la contraseña configurada para la cuenta.
2. Guarda el `access_token` y el `expires_in` de la respuesta. No guardes la contraseña.
3. Usa el estado de wallet devuelto para mostrar si el usuario está activo, pendiente de revisión o rechazado.

## Qué debes comprobar

- Unas credenciales válidas devuelven `200` y un token de acceso, incluso si la wallet está `PENDING` o `REJECTED`. El estado no debe ocultarse: permite explicar al usuario qué debe hacer antes de pagar.
- Unas credenciales inválidas devuelven `401 INVALID_CREDENTIALS`, sin distinguir si el documento existe o si la contraseña es incorrecta.
- La autenticación no activa una wallet ni cambia su estado. Los pagos siguen sujetos al estado de wallet definido por W1.
- La respuesta y los errores nunca incluyen la contraseña.

## APIs de esta historia

### `POST /auth/login`

Autentica una cuenta creada previamente y devuelve un token de acceso. Para esta propuesta, el documento `TEST` identifica la cuenta y la contraseña debe haberse configurado durante el registro. La HU W1 no define ese paso, por lo que debe acordarse antes de implementar el flujo completo.

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

- La cuenta debe tener una contraseña asociada al registrarse. W1 no define cómo se crea, recupera ni cambia esa contraseña.
- El uso de documento como identificador se limita a datos ficticios `TEST-`; no enviar documentos personales reales.
- La política de longitud, complejidad, almacenamiento y recuperación de contraseñas debe definirse antes de producción.
- Debe confirmarse si las APIs de pagos y wallet exigirán `Authorization: Bearer <access_token>`. W1 no especifica autenticación para sus endpoints.
- Deben confirmarse la expiración, renovación y revocación del token. El `expires_in` de ejemplo no es una decisión de producto.

## Material relacionado

[Leer la historia W1: Registro y activación](../HU/W1_hu.md)
