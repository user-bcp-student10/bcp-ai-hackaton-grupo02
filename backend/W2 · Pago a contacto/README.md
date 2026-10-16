# Backend W2 · Pago a contacto

Servicio Node.js + Express para el flujo W2 de pagos de bajo monto.

## Requisitos

- Node.js 22.13 o posterior.
- npm.

## Instalación y ejecución

Desde esta carpeta:

```powershell
npm install
npm start
```

El servicio escucha en `http://localhost:3002`. Si el puerto está ocupado, el inicio falla con un error explícito; no se selecciona otro puerto automáticamente. `PORT` permite elegir un puerto de forma explícita.

## Persistencia de pagos

El historial se lee y actualiza en `../../../db/payment-history-by-wallet-id.json`, manteniendo el formato `success.return` de la fixture existente. Las escrituras reemplazan el archivo atómicamente. `PAYMENT_HISTORY_FILE` puede indicar otra ruta de historial cuando sea necesario. La wallet inicial se lee desde `../../../db/wallet-balances.json`; `PAYMENT_WALLETS_FILE` permite indicar una fixture alternativa.

Los tests crean archivos temporales para no modificar estas fixtures compartidas.

## Endpoints incluidos

- `GET /health`
- `GET /wallets/{id}`
- `POST /payments`
- `GET /payments?walletId=...`
- `GET /payments/{id}`
- `GET /payments/{id}/receipt`
- `GET /provider/payments/{id}`
- `POST /payments/{id}/resolve`
- `POST /callbacks/payments`
- `GET /control/events`
- `POST /control/events/{id}/deliver`
- `POST /control/provider/{id}/complete`

Los reintentos usan `Idempotency-Key`; una clave con contenido distinto produce `409`. Los timeouts con `paymentId` permanecen inciertos hasta resolver el mismo pago. Los importes se expresan en céntimos de PEN. El límite aprobado para W2 es global: PEN 2,000.00 (200,000 céntimos); un importe superior se rechaza antes de crear el pago.

Las convenciones del sistema analítico no están definidas en la fuente disponible, por lo que no se inventan ni se simulan en este servicio.

## Pruebas

```powershell
npm test
```
