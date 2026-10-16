# Proposal

## Why

Cuando un pago falla, queda pendiente o ya fue ejecutado, el usuario y soporte necesitan distinguir esos resultados antes de recomendar un reintento, investigación o disputa. La HU W5 define esa necesidad, mientras que la API existente advierte que un timeout no prueba que el pago haya fallado; hacer explícitas las rutas evita duplicar cobros y permite dar seguimiento consistente.

## What Changes

- Clasificar resultados confirmados de pago fallido o expirado con un código de motivo legible por máquina.
- Hacer visible para soporte la acción elegible —reintento, investigación o derivación a disputa— de acuerdo con el resultado confirmado.
- Diferenciar la guía para una falla técnica de la guía para una transferencia ya ejecutada.
- Registrar las acciones de soporte con referencia de transacción y estado de resolución.
- Referencia de Issue: no disponible. GitHub Issues está deshabilitado en este repositorio y no se proporcionó un identificador. Referencias funcionales disponibles: [W5_hu.md](../../../docs/HU/W5_hu.md) y [W5_api.md](../../../docs/APIs/W5_api.md).
- Las categorías concretas de disputa y los niveles de escalamiento/SLA permanecen pendientes de definición; esta propuesta no introduce un catálogo ni valores de SLA.

## Capabilities

### New Capabilities

- `payment-support-routing`: clasificación de resultados de pago y orientación/seguimiento de acciones de soporte.

### Modified Capabilities

- Ninguna. El repositorio no tiene specs existentes.

## Impact

- Afecta la información de apoyo al usuario y la vista/seguimiento de casos para soporte.
- Se relaciona con la resolución de resultados inciertos mediante `POST /payments/{id}/resolve`, los casos consultables mediante `GET /support/cases` y la consulta de reversos en la API W5.
- No altera el contrato de W4 de idempotencia ni el contrato financiero de pagos, callbacks y reversos existente.

## Comportamiento que debe preservarse

- Un timeout o error de comunicación no se considera prueba de que el pago falló ni de que no fue ejecutado.
- La resolución consulta el pago existente y no crea otro cobro; un resultado todavía pendiente puede abrir o mantener un caso de soporte.
- Los reversos siguen siendo explícitos, completos y sujetos a la confirmación documentada; una aprobación tardía después de un reverso completado no debe generar un nuevo cargo ni cambiar el estado final.
- Los casos existentes conservan sus referencias de recurso, motivo y estado OPEN/RESOLVED, y su consulta no envía notificaciones externas ni habilita edición directa.

## Alcance

- Definir clasificación y guía observable para fallas técnicas, resultados fallidos/expirados confirmados, resultados inciertos, pagos ejecutados y reversos pendientes o completados.
- Hacer explícitas las acciones de soporte y su estado de resolución vinculados a una referencia de transacción.
- Mantener genérica la derivación a disputa hasta que producto apruebe categorías para el MVP.

## Fuera de alcance

- Definir categorías concretas de disputa, SLA o niveles de escalamiento.
- Cancelar unilateralmente transferencias ejecutadas o cambiar las reglas financieras de reverso.
- Cambiar los contratos de idempotencia, conciliación, callbacks o resolución de W4/W6.
- Enviar notificaciones externas, habilitar edición directa de casos o incorporar integraciones productivas con proveedores.
- Diseñar arquitectura o detalles técnicos de implementación.
