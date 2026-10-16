# Registro e inicio de sesión

Como usuario de la wallet,
quiero registrar una cuenta con mis credenciales e iniciar sesión,
para consultar el estado de mi wallet y acceder a las funciones disponibles para mi cuenta.

## Criterios de aceptación

1. El usuario puede registrarse proporcionando `documentType`, `document`, `password` y `email`.
2. Si falta un dato obligatorio, un dato tiene tipo o formato incorrecto, el correo no tiene un formato válido, `documentType` no es `TEST` o el documento no tiene el prefijo `TEST-`, el registro se rechaza con `400 VALIDATION_ERROR`.
3. Si el documento o el correo ya está asociado a una cuenta, el registro se rechaza con `409 ACCOUNT_ALREADY_EXISTS`.
4. Si el registro es válido, el sistema responde `201` con `account_id` y estado `REGISTERED`. El registro no inicia sesión ni crea una wallet.
5. El usuario puede iniciar sesión con el tipo y número de documento registrados y su contraseña. Si las credenciales son válidas, el sistema responde `200` con un token de acceso, el identificador de la wallet y su estado, que puede ser `ACTIVE`, `PENDING` o `REJECTED`.
6. Si las credenciales no son válidas, el sistema responde `401 INVALID_CREDENTIALS` sin indicar si falló el documento o la contraseña.
7. El inicio de sesión no activa la wallet ni modifica su estado. La disponibilidad de pagos sigue sujeta al estado de la wallet definido en W1.
8. Las respuestas y los errores no incluyen la contraseña. Las solicitudes que exceden el tamaño permitido se rechazan con `413`; los límites de intentos se informan con `429`; si el servicio de autenticación no está disponible, se responde `503`.

## Contexto

- Épica: [MVP de wallet en Perú](../epic/peru-wallet-mvp.sp.md).
- Esta historia define el registro de credenciales y el inicio de sesión que no están especificados en el flujo de onboarding W1.
- Contrato propuesto: [API W0 · Registro e inicio de sesión](../APIs/W0_API.md).
- La creación y verificación de la wallet corresponden a [W1 · Registro y activación](./W1_hu.md); registrarse en W0 no crea una wallet.

## Supuestos

- El MVP usa exclusivamente documentos ficticios: `documentType` debe ser `TEST` y `document` debe tener el prefijo `TEST-`.
- El correo debe tener un formato válido, y no se permite reutilizar el documento ni el correo de otra cuenta.
- El registro y el inicio de sesión usan el contrato de respuesta descrito en W0_API; los formatos propuestos de `account_id`, `status` y token deben confirmarse al implementar.

## Preguntas abiertas

- ¿Cómo se vinculan la cuenta creada en W0 y la wallet creada mediante el flujo W1?
- ¿Qué reglas de longitud y complejidad tendrá la contraseña y cómo se almacenará de forma segura?
- ¿Se requiere verificar el correo antes de habilitar el inicio de sesión?
- ¿Cómo se gestionan la recuperación y el cambio de contraseña?
- ¿Cuáles serán la expiración, renovación y revocación del token de acceso?
