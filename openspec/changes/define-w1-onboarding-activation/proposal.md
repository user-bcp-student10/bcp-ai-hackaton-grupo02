# Proposal

## Why

La HU W1 busca reducir el abandono y el tiempo de registro de la wallet, haciendo visible el progreso y permitiendo medir la activación y la adquisición. La API W1 ya fija los resultados posibles de KYC y wallet; esta propuesta añade requisitos observables para el flujo y su analítica sin cambiar ese contrato.

Referencia de Issue: no hay un identificador disponible; el repositorio tiene los Issues deshabilitados y se confirmó que no existe una referencia que citar. Fuentes disponibles: [W1_hu.md](../../../docs/HU/W1_hu.md) y [W1_api.md](../../../docs/APIs/W1_api.md).

## What Changes

- Especificar un flujo guiado que expone los pasos requeridos, el paso actual y mensajes accionables para datos obligatorios ausentes o inválidos.
- Especificar la activación y los estados visibles según los resultados de KYC establecidos por el contrato W1.
- Definir la medición de duración desde que se presenta el primer paso hasta que la wallet pasa a `ACTIVE` tras `APPROVED`; el reporte permitirá evaluar la mediana objetivo de 3 minutos dentro de los tres meses posteriores al lanzamiento.
- Especificar eventos de inicio, finalización de cada paso y cierre del flujo, además de un reporte mensual que permita verificar nuevos usuarios activos, MAU y CAC para los primeros tres meses.
- Mantener el contrato existente de KYC, decisiones manuales, wallets y pagos. Los escenarios de la spec no cambian sus estados, respuestas ni errores.

**Fuera de alcance**

- Cambiar rutas, campos, códigos HTTP o reglas del contrato de la API W1.
- Definir requisitos de KYC real, documentos reales, prevención de duplicados, autenticación o políticas de cumplimiento.
- Asegurar que se alcancen las metas comerciales; el cambio define la medición, no el resultado de negocio.
- Prescribir arquitectura, almacenamiento, proveedores analíticos o diseño visual.

## Capabilities

### New Capabilities

- `wallet-onboarding`: flujo guiado de onboarding, activación de wallet y medición de eventos y resultados de adquisición.

### Modified Capabilities

- Ninguna. No hay specs existentes en el repositorio; el contrato de referencia está documentado en la API W1.

## Impact

La capacidad nueva define comportamiento observable del onboarding y de sus salidas analíticas. Se relaciona con `POST /kyc/verifications`, `GET /kyc/verifications/{id}`, `POST /kyc/verifications/{id}/decision`, `GET /wallets/{id}` y las respuestas de pagos descritas en [W1_api.md](../../../docs/APIs/W1_api.md), sin alterar su contrato. La definición de duración usa el primer paso presentado como inicio y el estado `ACTIVE` después de KYC `APPROVED` como fin. MAU se refiere a usuarios únicos con al menos una actividad de producto en el mes.
