# Proposal

## Why

W0 necesita un contrato verificable para que los usuarios puedan crear credenciales y luego consultar el estado de su wallet sin confundir el registro de cuenta con el onboarding de W1. No se pudo identificar el Issue solicitado: GitHub Issues está deshabilitado en este repositorio y no se proporcionó un identificador; la historia de usuario disponible como contexto es [W0_hu.md](../../../docs/HU/W0_hu.md).

## What Changes

- Definir el comportamiento observable de registro e inicio de sesión para cuentas con documentos ficticios de tipo `DNI` o `CE`.
- Mantener el registro separado del inicio de sesión y de la creación de wallet de W1.
- Especificar los resultados de validación, duplicidad, credenciales incorrectas, límites de solicitud y falta de disponibilidad descritos por el contrato W0.
- Preservar el acceso para wallets `ACTIVE`, `PENDING` y `REJECTED`, sin que la autenticación active o cambie el estado de una wallet.

## Capabilities

### New Capabilities

- `user-auth`: registro de credenciales e inicio de sesión conforme al contrato W0.

### Modified Capabilities

- Ninguna.

## Impact

Define requisitos para `POST /auth/signup` y `POST /auth/login`, así como sus respuestas y errores. El contrato de referencia es [W0_API.md](../../../docs/APIs/W0_API.md); el estado y la creación de la wallet permanecen bajo el comportamiento de W1. No se modifica código funcional ni se prescribe una implementación técnica.
