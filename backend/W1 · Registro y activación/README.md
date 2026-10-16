# Backend W1 · Registro y activación

API local para simular la verificación KYC, la creación de wallets y la revisión manual. Usa los mocks JSON compartidos en `db/` como datos iniciales y no depende del servicio remoto del grupo 2.

## Requisitos

- Node.js `v26.9.0`.
- No requiere dependencias npm externas ni el comando global `express`.

## Ejecutar

Desde esta carpeta:

```powershell
npm start
```

Por defecto escucha en `http://localhost:3000`. Se puede configurar el host y el puerto con:

```powershell
$env:PORT = "3000"
$env:HOST = "0.0.0.0"
npm start
```

## Datos locales

Al iniciar el servicio, los fixtures de [db/](../../db/README.md) cargan las verificaciones de ejemplo, la wallet demo y los casos de soporte iniciales. Los registros creados y los cambios de estado se conservan en memoria mientras el proceso siga activo; se reinician al detenerlo. Los archivos JSON de `db/` no se modifican, y las contraseñas enviadas para crear una wallet no se almacenan.

El servicio admite únicamente datos ficticios: `documentType` debe ser `TEST` y `document` debe tener el prefijo `TEST-`.

## Rutas

- `GET /health`: estado local del servicio.
- `POST /kyc/verifications`: crea verificación y wallet con el escenario solicitado.
- `GET /kyc/verifications/{id}`: consulta la verificación.
- `POST /kyc/verifications/{id}/decision`: resuelve una verificación pendiente.
- `GET /wallets/{id}`: consulta estado y saldos.
- `GET /support/cases`: lista los casos iniciales y los generados por revisiones manuales.

`APPROVED` crea una wallet activa con saldo cero; `REJECTED` crea una wallet rechazada; `MANUAL_REVIEW` deja la wallet pendiente y abre un caso de soporte; `UNAVAILABLE` responde `503 KYC_UNAVAILABLE` sin crear registros. Las decisiones finales repetidas se aceptan si coinciden con el estado actual; una decisión distinta responde `409 DECISION_CONFLICT`.

## Pruebas

```powershell
npm test
```

Las pruebas usan los fixtures locales y no crean registros en un servicio compartido.
