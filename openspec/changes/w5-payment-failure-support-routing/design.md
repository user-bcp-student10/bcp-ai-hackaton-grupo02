# Design

## Context

Ver la motivación en `proposal.md` y los comportamientos verificables en `specs/payment-support-routing/spec.md`. La API documentada de W5 permite resolver un pago incierto mediante `POST /payments/{id}/resolve`, consultar pagos y reversos, y listar casos mediante `GET /support/cases`.

Los contratos actuales distinguen un timeout con `paymentId` de un error de proveedor previo al procesamiento: `/resolve` consulta el pago existente sin crear otro; un pago todavía `PENDING` responde `202` y abre un caso; `PROVIDER_ERROR` puede fallar antes de crear operación o reserva. La lectura de casos expone casos `OPEN` y `RESOLVED` con recurso, motivo y estado, y no ofrece edición directa ni notificaciones externas. Los reversos son completos, únicos por pago y requieren confirmación.

La inspección de este repositorio encontró documentación de API, pero no fuentes TypeScript/JavaScript, manifiestos `package.json` ni pruebas de W5. Por tanto, no se puede confirmar la ubicación de componentes ni la persistencia actualmente disponible; habrá que localizar esos elementos antes de implementar, sin asumir una arquitectura ausente de la evidencia.

## Goals / Non-Goals

**Goals:**

- Derivar la guía a partir del estado confirmado del pago y distinguirla de fallas de transporte.
- Mantener intactas las operaciones financieras; el registro y la clasificación de soporte no cambian el estado ni el saldo del pago.
- Registrar cada acción de soporte como traza auditable asociada a la referencia y al caso, sin convertir la consulta de casos existente en una operación de edición.
- Mantener genérica la elegibilidad de disputa hasta que producto apruebe las categorías del MVP.

**Non-Goals:**

- Definir las categorías de disputa, los SLA o niveles de escalamiento que permanecen abiertos en HU W5.
- Implementar decisiones financieras, reversos automáticos, cancelaciones unilaterales o reintentos automáticos.
- Añadir notificaciones externas, integraciones productivas o cambios a los contratos de idempotencia/conciliación.
- Prescribir un framework, almacén de datos o estructura de módulos no observados en el repositorio.

## Contratos protegidos

- Un timeout, incluido `504` con `paymentId`, no prueba por sí solo que el pago haya fallado ni que no se haya ejecutado.
- `POST /payments/{id}/resolve` conserva su función de consultar y actualizar el resultado del pago existente; no debe crear un segundo pago. Si el resultado sigue `PENDING`, la respuesta continúa siendo `202` y el caso asociado permanece abierto sin duplicarse en llamadas repetidas.
- Un error `PROVIDER_ERROR` que ocurre antes de procesar no se comunica como una transferencia ejecutada ni como un pago pendiente ya creado.
- `GET /support/cases` sigue siendo una consulta de casos `OPEN`/`RESOLVED`; el registro de una acción de soporte no modifica directamente el recurso financiero ni requiere convertir esta consulta en un endpoint de edición.
- `POST /payments/{id}/reversals` conserva la elegibilidad solo para pagos `SUCCEEDED`, el reverso completo y único, y la espera de confirmación antes de devolver saldo. Una aprobación tardía después de un reverso completado no crea cargos ni cambia el estado final.
- El contrato de idempotencia de W4, callbacks y ledger no cambia.

## Componentes afectados

- **Clasificación/orientación de soporte:** traduce el estado confirmado y el motivo disponible a las acciones elegibles, sin atribuir un resultado no confirmado.
- **Seguimiento de casos:** relaciona el pago/caso con la acción y el estado de resolución consultables por soporte.
- **Registro de acciones:** traza auditable, aditiva y ligada a la referencia de transacción; no altera el caso financiero ni dispara por sí sola un movimiento de fondos.
- **Mensajes al usuario:** diferencia falla técnica, resultado pendiente/incierto, fallo confirmado y transferencia ejecutada.
- **Integración con pagos W5:** utiliza resolución, consulta de pago, reversos y casos según los contratos documentados.

Las ubicaciones concretas de estos componentes no son visibles en el estado actual del repositorio y deben confirmarse antes de cualquier edición funcional.

## Decisions

### Usar el estado local confirmado y la resolución existente como fuente de orientación

La guía solo podrá afirmar fallo, ejecución o reverso completado después de consultar el estado local actualizado. Para un timeout con identificador se mantiene una condición incierta y se usa `/resolve` sobre ese mismo pago; para `PROVIDER_ERROR` previo a la creación se comunica una falla técnica sin afirmar que existe una transacción.

**Alternativa considerada:** clasificar por el código HTTP original o tratar timeout como rechazo. Se descarta porque W5 documenta que el proveedor puede haber procesado el pago antes del `504`.

### Registrar acciones aparte de la consulta y del estado financiero del caso

La acción de soporte se registra como una traza auditable vinculada por referencia de pago y caso, con tipo de acción y estado de resolución. La consulta documentada de casos se mantiene de solo lectura; las acciones no mutan saldo, pago ni reverso. Se reutilizará la persistencia y autorización que se encuentren en el proyecto si existen; si no, la necesidad de un contrato aditivo debe revisarse antes de implementar, sin inventar una ubicación o endpoint en este diseño.

**Alternativa considerada:** sobrescribir el motivo o estado del caso para representar cada acción. Se descarta porque perdería la distinción entre estado del caso y acciones realizadas y entraría en conflicto con el contrato de consulta existente.

### Mantener acciones de disputa genéricas, sin catálogo

La presentación puede indicar que una disputa es una ruta elegible cuando corresponda, pero no solicitar ni persistir una categoría concreta hasta que producto defina el catálogo. No se automatiza el inicio de una disputa.

**Alternativa considerada:** crear categorías provisionales en el sistema. Se descarta porque la HU deja explícitamente esa decisión abierta y las categorías afectarían el comportamiento observable.

### Separar la elegibilidad de reintento de la creación del pago

El sistema informa la elegibilidad y deja que el usuario/soporte decida la acción; no crea pagos automáticamente. Un reintento que se refiera a la misma solicitud debe respetar la clave y el contenido originales conforme a W4.

**Alternativa considerada:** reintentar automáticamente ante fallas técnicas o de comunicación. Se descarta para evitar pagos duplicados en estados inciertos.

## Estrategia incremental

1. Localizar las fuentes y pruebas de W5 en el repositorio destino y ejecutar una línea base antes de editar. Confirmar endpoints, persistencia y autorización existentes en lugar de asumirlos a partir de la documentación.
2. Añadir pruebas de caracterización de timeout con `paymentId`, `PROVIDER_ERROR`, resolución de pago pendiente, idempotencia, apertura/resolución de casos y ciclo de reverso.
3. Introducir clasificación/orientación basada en el estado confirmado; probar que no confunda timeout con rechazo ni pago ejecutado con fallo técnico.
4. Añadir registro auditable de acciones asociado a referencia y caso, sin efectos financieros y sin alterar el contrato de `GET /support/cases`; validar persistencia y consulta con las capacidades existentes.
5. Presentar la guía diferenciada a usuario/soporte y verificar elegibilidad de reintento, investigación y derivación genérica a disputa sin catálogo.
6. Ejecutar pruebas de integración del recorrido incierto → resolución, del caso pendiente y del reverso confirmado; verificar que W4, W5 y W6 mantienen sus invariantes.

## Pruebas de caracterización previas

Antes de cambiar comportamiento, cubrir y registrar los resultados actuales de:

- `TIMEOUT_AFTER_PROCESSING`: respuesta `504` con `paymentId`, estado de proveedor posiblemente procesado y recuperación mediante `/resolve` del mismo pago.
- `PROVIDER_ERROR`: respuesta previa al procesamiento sin operación ni reserva.
- Resolución de un pago que sigue `PENDING`: respuesta `202`, un caso abierto asociado y resultado estable al repetir la resolución.
- Resolución de un pago terminado: estado local actualizado y sin crear un pago nuevo.
- Reverso completo: pago inicial `SUCCEEDED`, solicitud única, reverso pendiente hasta evento, saldo devuelto solo al confirmarlo y tratamiento de aprobación tardía.
- Consulta de casos: lista y campos `resource`, `reason`, `status` para estados `OPEN`/`RESOLVED`, sin edición directa ni notificación externa.
- Reintentos de creación de pago y entrega duplicada de eventos según los contratos de W4.

## Risks / Trade-offs

- **[Riesgo]** Una respuesta técnica puede ocultar procesamiento efectivo → **Mitigación:** no inferir fallo desde timeout; resolver por el identificador existente antes de sugerir otra operación.
- **[Riesgo]** El modelo actual de casos puede no soportar trazas de acciones → **Mitigación:** localizar persistencia real primero; si requiere ampliar un contrato, revisarlo explícitamente antes de implementarlo y mantener la lectura actual compatible.
- **[Riesgo]** Sin categorías de disputa aprobadas, soporte solo puede derivar de forma genérica → **Mitigación:** dejar el catálogo fuera del alcance y no mostrar opciones de categoría inventadas.
- **[Trade-off]** Una traza de acciones separada preserva el historial, pero requiere asociar referencias de pago y caso consistentemente → **Mitigación:** validar asociación y estado de resolución con pruebas de integración.
- **[Riesgo]** La documentación disponible puede diferir de código que no está presente en el checkout → **Mitigación:** caracterizar la implementación real antes de alterar contratos y detenerse si contradice la spec aprobada.

## Rollback

El cambio debe ser aditivo y no modificar transacciones, saldos ni reglas de reverso. Si la clasificación o la guía causa regresiones, revertir el despliegue de la experiencia nueva; conservar pagos, casos y trazas de soporte creados, sin borrarlos como parte del rollback. Las lecturas existentes de casos y pagos deben continuar funcionando. No introducir un mecanismo general de feature flags solo para este cambio; si ya existe uno, puede deshabilitar la nueva superficie de guía/registro sin cambiar la lógica financiera.
