# Backend W0: registro e inicio de sesión

Servicio Node.js y Express para `POST /auth/signup` y `POST /auth/login`, conforme al contrato W0. No implementa frontend ni crea wallets.

## Requisitos

- Node.js 22.13 o posterior; usa `node:sqlite` y `node:crypto` del runtime.
- Instalar dependencias con `npm install`.
- Configurar `AUTH_MAX_PAYLOAD_BYTES`, `AUTH_RATE_LIMIT_MAX` y `AUTH_RATE_LIMIT_WINDOW_MS` antes de iniciar el servidor. No hay umbrales aprobados en el repositorio, por lo que el servicio no inventa valores predeterminados.

`db/users.json` es la persistencia de cuentas para W0. Signup agrega allí usuarios `TEST`, `DNI` o `CE`, con `account_id` y hash/salt de contraseña, sin incluir el campo `password`; login valida el documento y verifica la contraseña contra el mismo archivo. Los registros heredados se conservan sin modificación; cuando uno no tenga `account_id`, W0 genera un identificador estable derivado del tipo y documento sin escribirlo en el archivo.

`AUTH_TOKEN_DATABASE_PATH` configura la base local separada para hashes de tokens (predeterminado `data/auth-tokens.sqlite`); no contiene cuentas ni credenciales.

Login no consulta W1 ni valida una wallet. Responde `200` con `access_token`, `token_type`, `expires_in` y `account_id`; no devuelve `wallet_id` ni `wallet_status`. W0 no crea ni cambia wallets.

## Ejecución

```powershell
$env:AUTH_MAX_PAYLOAD_BYTES = "<límite aprobado en bytes>"
$env:AUTH_RATE_LIMIT_MAX = "<intentos aprobados por ventana>"
$env:AUTH_RATE_LIMIT_WINDOW_MS = "<ventana aprobada en milisegundos>"
$env:AUTH_USERS_FILE = "<ruta a db/users.json (opcional; ese es el valor predeterminado)>"
$env:AUTH_TOKEN_DATABASE_PATH = "<ruta a la base de tokens (opcional)>"
npm start
```

Opcional: `PORT` (predeterminado `3000`). El token es opaco, aleatorio, se almacena solo como hash y vence a los 3600 segundos.

## Pruebas

```powershell
npm test
```

Las pruebas usan SQLite en memoria. No equivalen a una regresión del servicio W1, que no está implementado en este repositorio.
