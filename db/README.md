# Índice de mocks JSON por endpoint

Los archivos de response mock usan un contenedor `success`/`error`. `success.status` es el status de éxito documentado y `success.return` contiene el body de éxito. El objeto `error` con status `500` es genérico y no necesariamente está declarado por el contrato.

## Mocks asociados a endpoints

| Método | Endpoint | Archivo JSON |
| --- | --- | --- |
| `POST` | `/auth/signup` | [singup.json](./singup.json) |
| `POST` | `/auth/login` | [sign-in.json](./sign-in.json) |
| `POST` | `/kyc/verifications` | [create-wallet-with-simulated-kyc.json](./create-wallet-with-simulated-kyc.json) |
| `GET` | `/kyc/verifications/{id}` | [get-kyc-verification.json](./get-kyc-verification.json) |
| `POST` | `/kyc/verifications/{id}/decision` | [resolve-human-review.json](./resolve-human-review.json) |
| `GET` | `/wallets/{id}` | [wallet-balances.json](./wallet-balances.json) |
| `POST` | `/payments` | [create-contact-or-merchant-payment.json](./create-contact-or-merchant-payment.json) |
| `GET` | `/payments` | [payment-history-by-wallet-id.json](./payment-history-by-wallet-id.json) |
| `GET` | `/payments/{id}` | [get-payment.json](./get-payment.json) |
| `GET` | `/payments/{id}/receipt` | [successful-or-reversed-payment-receipt.json](./successful-or-reversed-payment-receipt.json) |
| `GET` | `/provider/payments/{id}` | [get-provider-payment.json](./get-provider-payment.json) |
| `GET` | `/reversals/{id}` | [get-reversal.json](./get-reversal.json) |
| `POST` | `/payments/{id}/resolve` | [resolve-or-escalate-payment.json](./resolve-or-escalate-payment.json) |
| `POST` | `/payments/{id}/reversals` | [full-payment-reversal.json](./full-payment-reversal.json) |
| `POST` | `/qrs` | [generate-test-qr-payload.json](./generate-test-qr-payload.json) |
| `POST` | `/qrs/resolve` | [resolve-local-qr-payload.json](./resolve-local-qr-payload.json) |
| `POST` | `/callbacks/payments` | [consume-known-local-provider-event.json](./consume-known-local-provider-event.json) |
| `GET` | `/ledger` | [double-entry-ledger-entries.json](./double-entry-ledger-entries.json) |
| `GET` | `/support/cases` | [open-and-resolved-support-cases.json](./open-and-resolved-support-cases.json) |
| `GET` | `/settlements` | [full-simulated-settlement-report.json](./full-simulated-settlement-report.json) |
| `GET` | `/reconciliations/incidents` | [reconciliation-incident-history.json](./reconciliation-incident-history.json) |
| `POST` | `/reconciliations` | [compare-sources-and-update-incidents.json](./compare-sources-and-update-incidents.json) |

## Archivos heredados o sin asociación confirmada

| Archivo JSON | Observación |
| --- | --- |
| [login.json](./login.json) | Contiene un status `REGISTERED`, pero no incluye un código HTTP ni un body de response completo. No se puede asociar de forma fiable a una operación; para el login usa [sign-in.json](./sign-in.json). |
| [users.json](./users.json) | Contiene datos de usuarios con tipos documentales distintos de `TEST`, por lo que no corresponde al contrato actual de `/auth/signup`. Se conserva como archivo heredado, no como mock contractual vigente. |

## Endpoints de OpenAPI sin archivo mock asociado

Las siguientes operaciones no tienen un response mock identificado en este directorio:

| Método | Endpoint |
| --- | --- |
| `GET` | `/health` |
| `GET` | `/scenarios` |
| `GET` | `/openapi.json` |
| `GET` | `/control/events` |
| `POST` | `/control/events/{id}/deliver` |
| `POST` | `/control/provider/{id}/complete` |
| `POST` | `/control/settlements` |
| `POST` | `/control/reset` |
| `GET` | `/groups` |

