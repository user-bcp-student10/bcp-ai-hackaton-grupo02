# Proposal

## Why

La HU W2 busca que el pagador pueda confiar en el resultado de una transferencia de bajo monto, pero deja por precisar cómo se presentan los límites y los estados durante una confirmación asíncrona. Aclarar ese contrato es importante para reducir la caída en checkout del 30 % al 8 % durante el trimestre posterior al lanzamiento y evitar que un reintento o una respuesta tardía confunda al usuario o duplique un cobro.

## What Changes

- Definir el comportamiento observable del pago de bajo monto desde la revisión del destinatario y el monto hasta el resultado terminal.
- Exigir comunicación clara del estado pendiente y de un único resultado terminal —exitoso, fallido o expirado—, con una siguiente acción cuando corresponda.
- Precisar la visibilidad de la referencia y el historial para pagos exitosos, y la emisión del evento de activación del pagador.
- Definir la validación visible de los límites aplicables antes del envío y la medición del funnel de checkout. Los valores iniciales por proveedor/canal quedan pendientes de definición antes de implementar.
- Referencia de Issue: no disponible. GitHub Issues está deshabilitado en este repositorio y no se proporcionó un identificador; la fuente funcional disponible es [W2_hu.md](../../../docs/HU/W2_hu.md).

## Capabilities

### New Capabilities

- `low-value-payments`: contrato observable para revisar, enviar y confirmar pagos de bajo monto, consultar su resultado e instrumentar la activación del pagador.

### Modified Capabilities

- Ninguna. No hay specs existentes en el repositorio.

## Impact

- Afecta el flujo de pago de W2 y la comunicación de sus resultados al pagador.
- Se relaciona con el contrato documentado para `POST /payments`, consulta de estado, historial y comprobante en [W2.api.md](../../../docs/APIs/W2.api.md).
- Debe mantener consistencia con idempotencia de reintentos y estados no exitosos descritos por W4 y W5; no reemplaza esas historias.
- No se localizaron fuentes de implementación ni pruebas de pago en el proyecto inspeccionado; el contrato actual identificable está documentado en W2 API.

## Comportamiento que debe preservarse

- El destinatario y el monto se presentan antes de confirmar el pago.
- Un pago pendiente no se comunica como exitoso hasta que se conozca su resultado; las transiciones asíncronas deben reflejarse claramente.
- Se conserva el contrato de idempotencia documentado: una repetición con la misma clave y contenido devuelve el pago existente, y reutilizarla con contenido distinto produce un conflicto.
- Los pagos exitosos conservan su referencia, consulta de comprobante e inclusión en el historial; las operaciones no exitosas no se presentan como pagos completados.
- Los límites disponibles pueden ser inferiores al máximo regulatorio y deben validarse antes del envío. El límite inicial concreto para cada proveedor/canal sigue pendiente de una decisión de producto.

## Fuera de alcance

- Definir en esta propuesta los importes concretos de los límites por proveedor o canal.
- Cambiar la idempotencia, conciliación, reversos, disputas o los contratos de proveedores cubiertos por otras historias.
- Añadir pagos mediante alias, ampliar proveedores, exponer APIs abiertas o lanzar a otros países.
- Diseñar arquitectura, componentes, persistencia o detalles técnicos de implementación.
