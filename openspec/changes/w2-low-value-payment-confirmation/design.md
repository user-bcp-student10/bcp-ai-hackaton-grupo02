# Design

## Context

Ver la motivación en `proposal.md` y el contrato observable en `specs/low-value-payments/spec.md`. La documentación W2 describe `POST /payments`, consulta de estado, historial y comprobante. Los contratos relacionados de W4 y W5 especifican idempotencia y recuperación de resultados inciertos.

La API puede devolver `504` con `paymentId` después de que el proveedor haya procesado el pago. Por ello, un timeout de transporte no equivale a rechazo ni a expiración. W5 documenta `POST /payments/{id}/resolve` para consultar el resultado sin crear otro pago. La documentación disponible no identifica módulos de implementación, framework de interfaz ni pruebas existentes; esos detalles deben confirmarse en el repositorio antes de modificar comportamiento.

## Goals / Non-Goals

**Goals:**

- Mantener una sola fuente de verdad para el resultado: el estado confirmado del pago, no la respuesta de transporte aislada ni un temporizador de interfaz.
- Separar los estados en proceso, terminales y de resultado incierto, y asegurar que el usuario pueda continuar sin generar un segundo cobro.
- Reutilizar los contratos W2, W4 y W5 existentes para envío, reintentos, consultas, comprobantes y recuperación.
- Validar el monto contra el límite aplicable antes del envío. Los valores por proveedor/canal son una condición previa de producto para implementar esta validación.
- Instrumentar la medición de W2 según las convenciones analíticas existentes, sin cambiar la definición de la métrica durante la implementación.

**Non-Goals:**

- Añadir estados de pago o modificar los contratos API de W2, W4 o W5.
- Interpretar un timeout o un retraso local como resultado terminal expirado.
- Cambiar conciliación, reversos, disputas, contratos de partners o la arquitectura global de pagos.
- Introducir proveedores, dependencias externas o migraciones de datos para este flujo.

## Contratos protegidos

- `POST /payments` conserva la clave de idempotencia, sus respuestas y sus errores documentados. La misma clave y el mismo contenido identifican la operación existente; contenido distinto con la misma clave sigue siendo conflicto.
- `PENDING` continúa siendo un resultado en proceso; el pago no se muestra como exitoso hasta que su estado local se confirme.
- El `504` que contiene `paymentId` representa un resultado todavía incierto para la interfaz. La recuperación consulta o resuelve ese pago existente mediante el contrato W5; no crea otra operación.
- `GET /payments/{id}`, el historial y `GET /payments/{id}/receipt` conservan sus contratos y disponibilidad según estado.
- Solo un estado del pago que confirme explícitamente expiración permite presentar el resultado terminal expirado. Un timeout, callback tardío o error de comunicación por sí solo no lo confirma.
- Los importes continúan expresándose en céntimos de PEN y la validación de fondos/saldo existente se mantiene independiente de los límites de producto por proveedor/canal.

## Componentes afectados

- **Experiencia del pagador:** revisión de destino e importe, envío, estados de espera, resultado terminal y acciones de recuperación.
- **Integración cliente con pagos:** conservación del identificador de pago, clave y contenido originales para consultar o resolver una operación incierta.
- **Configuración/validación de límites:** lectura del límite vigente para el proveedor y canal antes del envío. No se debe codificar un umbral supuesto.
- **Instrumentación del funnel y activación:** eventos de entrada, abandono y resultado de W2, además del evento de activación asociado a un pago exitoso.
- **Pruebas de contrato:** verificaciones del comportamiento existente de pagos, idempotencia, estados asíncronos, historial y comprobantes.

La inspección disponible encontró documentación de API, pero no fuentes ni pruebas de estos componentes; sus ubicaciones concretas deben localizarse en el repositorio antes de implementar.

## Decisions

### Usar el estado del pago como autoridad y distinguirlo del resultado de transporte

Tras un envío aceptado, el flujo conserva el ID de pago y representa `PENDING` como confirmación en proceso. Si ocurre un timeout con `paymentId`, muestra resultado incierto y ofrece resolver/consultar el mismo pago mediante W5. No crea una operación nueva como recuperación automática.

**Alternativa considerada:** tratar el timeout como rechazo o expiración y habilitar un pago nuevo. Se descarta porque W5 documenta que el proveedor puede haber procesado el pago antes del `504`, lo que puede duplicar el cobro.

### Reutilizar idempotencia existente para el mismo intento

Los reintentos de transporte del envío original conservan la misma clave y el mismo contenido. Una nueva intención de pago requiere una clave nueva solo después de que el usuario inicie explícitamente otra operación y el estado del intento previo no pueda producir un segundo cobro.

**Alternativa considerada:** generar una clave nueva en cada repetición. Se descarta porque W4 documenta que cada clave identifica una operación y una nueva clave puede crear un cobro duplicado.

### Tratar los límites como configuración de producto por proveedor/canal

La comprobación del límite se realiza antes de enviar y comunica una razón accionable al pagador. La implementación debe consumir los valores aprobados por producto, sin inferirlos del máximo regulatorio ni reutilizar el saldo como sustituto del límite.

**Alternativa considerada:** fijar un monto global provisional. Se descarta porque el límite inicial sigue pendiente y puede variar por proveedor/canal.

### Instrumentar con las convenciones analíticas del proyecto

Antes de añadir eventos, se caracterizan los eventos y reportes existentes. La instrumentación debe distinguir inicio, finalización exitosa y abandono del checkout, y emitir activación solo ante pago exitoso, sin introducir nombres o definiciones incompatibles con la analítica existente.

**Alternativa considerada:** añadir un sistema analítico o esquema paralelo específico para W2. Se descarta para evitar duplicidad y cambios fuera del alcance.

## Estrategia incremental

1. Localizar la experiencia, la integración de pagos y la analítica existentes; ejecutar y registrar pruebas de caracterización antes de modificar comportamiento crítico.
2. Añadir o completar primero las pruebas de contrato de consulta, estados pendientes, idempotencia, timeout con `paymentId`, resolución, historial y comprobante, preservando las respuestas W2/W4/W5.
3. Incorporar de forma incremental la revisión de destino/importe y la validación del límite aprobado, manteniendo separada la comprobación de saldo.
4. Añadir estados de espera, resultado incierto y resultados terminales basados en el estado confirmado; habilitar recuperación por el pago existente antes de ofrecer una nueva operación.
5. Incorporar la instrumentación del funnel y la activación de pago exitoso, y verificar los escenarios de la spec en pruebas automatizadas y de integración disponibles.
6. No habilitar la validación de límites para producción hasta que producto defina y apruebe los valores por proveedor/canal.

## Pruebas de caracterización previas

Antes de cualquier cambio de comportamiento crítico, verificar y preservar:

- Una solicitud válida crea una intención pendiente, reserva fondos según el contrato existente y conserva importes en céntimos.
- Repetir clave y contenido devuelve la misma operación; reutilizar la clave con contenido diferente produce conflicto; solicitudes simultáneas no crean pagos duplicados.
- `PENDING` permanece en proceso; los resultados `SUCCEEDED` y `REJECTED` se reflejan tras aplicar la confirmación correspondiente.
- `TIMEOUT_AFTER_PROCESSING` devuelve `504` con `paymentId`; resolver el mismo ID obtiene el estado confirmado sin crear otro pago.
- Historial, consulta de pago y comprobante mantienen su disponibilidad y respuestas según estado.
- El evento de activación no se emite para resultados no exitosos ni por un estado de transporte incierto.

## Risks / Trade-offs

- **[Riesgo]** El usuario puede abandonar mientras un pago sigue incierto → **Mitigación:** mostrar claramente que se está verificando y ofrecer resolver/consultar el mismo pago; no sugerir crear un pago nuevo.
- **[Riesgo]** No hay valores aprobados de límites por proveedor/canal → **Mitigación:** bloquear la habilitación de esa validación hasta contar con la decisión de producto; no usar valores supuestos.
- **[Riesgo]** No se encontraron fuentes ni pruebas de implementación durante la inspección documental → **Mitigación:** hacer una localización y caracterización acotadas antes de editar y no asumir nombres de componentes o herramientas.
- **[Trade-off]** La recuperación de una operación incierta puede requerir pasos adicionales frente a un reintento inmediato → **Mitigación:** priorizar la seguridad financiera y reutilizar la ruta de resolución documentada.
- **[Riesgo]** Eventos de checkout definidos de forma distinta podrían volver incomparables las métricas → **Mitigación:** reutilizar las definiciones analíticas existentes y validar denominador, cohorte y periodo antes de publicar el reporte.

## Rollback

El cambio debe limitarse a la experiencia y a la integración cliente, sin migraciones ni cambios de estado persistido. Si la nueva experiencia produce regresiones, volver a desplegar la versión anterior o deshabilitar el flujo nuevo mediante el mecanismo de activación existente, si lo hubiera. No eliminar ni reiniciar pagos creados; resolver los que estén inciertos mediante W5 y conservar las claves de idempotencia y referencias existentes. Si no existe un mecanismo de activación, el rollback requiere redeploy de la versión previa y no justifica introducir una plataforma de feature flags para este cambio.
