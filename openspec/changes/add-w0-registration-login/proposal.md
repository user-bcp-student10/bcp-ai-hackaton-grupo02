# Proposal

## Why

W0 necesita un contrato verificable para que los usuarios puedan crear credenciales e iniciar sesión sin confundir el registro de cuenta con el onboarding de W1. Login devuelve el identificador de cuenta y un token; la consulta del estado de wallet queda fuera de ese endpoint. No se pudo identificar el Issue solicitado: GitHub Issues está deshabilitado en este repositorio y no se proporcionó un identificador; la historia de usuario disponible como contexto es [W0_hu.md](../../../docs/HU/W0_hu.md).

## What Changes

- Definir el comportamiento observable de registro e inicio de sesión para cuentas de prueba con `documentType` `TEST`, `DNI` o `CE`, usando únicamente documentos ficticios.
- Mantener compatibilidad de inicio de sesión con los registros DNI/CE ya existentes en `db/users.json`, sin alterar ni eliminar esos registros.
- Mantener el registro separado del inicio de sesión y de la creación de wallet de W1.
- Emitir un token y devolver `account_id` tras validar credenciales, sin consultar ni validar una wallet.
- Especificar los resultados de validación, duplicidad, credenciales incorrectas, límites de solicitud y falta de disponibilidad descritos por el contrato W0.

## Capabilities

### New Capabilities

- `user-auth`: registro de credenciales e inicio de sesión conforme al contrato W0.

### Modified Capabilities

- Ninguna.

## Impact

Define requisitos para `POST /auth/signup` y `POST /auth/login`, así como sus respuestas y errores. El login devuelve `access_token`, `token_type`, `expires_in` y `account_id`, sin consultar una wallet. Los contratos de referencia son [W0_API.md](../../../docs/APIs/W0_API.md) y OpenAPI; el estado y la creación de la wallet permanecen bajo W1. No se amplía el contrato público de W1.
