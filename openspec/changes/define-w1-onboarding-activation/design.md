# Design

## Context

El cambio añade comportamiento observable al onboarding W1: progreso y validación guiados, presentación de los resultados de KYC y activación, eventos del flujo, medición de duración y un reporte mensual de activación/adquisición. La definición funcional está en `specs/wallet-onboarding/spec.md`; el contrato existente está documentado en `../../../docs/APIs/W1_api.md` y el contexto de producto en `../../../docs/HU/W1_hu.md`.

W1 es una API simulada. `POST /kyc/verifications` acepta únicamente `documentType=TEST` y documentos con prefijo `TEST-`; sus escenarios determinan si la wallet queda `ACTIVE`, `PENDING`, `REJECTED` o no se crea por indisponibilidad. La decisión manual se realiza por una operación separada. Las consultas de KYC y wallet, sus identificadores distintos y los estados/saldos de wallet también forman parte del contrato. La actividad de pagos tiene su propia respuesta y reglas; este cambio solo habilita su punto de entrada cuando la wallet está `ACTIVE`.

En la raíz inspeccionada hay documentación y artefactos OpenSpec, pero no se encontró una aplicación ejecutable, suite de pruebas ni infraestructura de persistencia. Por tanto, los componentes de este diseño son límites lógicos, no nombres de módulos, frameworks, proveedores ni ubicaciones de código asumidos. El almacenamiento de eventos, las fuentes para atribución de adquisición y el mecanismo de generación del reporte se definirán al conocer la implementación y sus fuentes de datos, sin alterar las métricas observables aprobadas.

## Goals / Non-Goals

**Goals:**
- Ofrecer un flujo que exponga los pasos requeridos, el paso actual y correcciones accionables antes de avanzar.
- Reflejar fielmente los estados W1 de KYC y wallet; permitir entrar a pagos de bajo monto únicamente con wallet `ACTIVE`.
- Instrumentar inicio, finalización de cada paso y cierre; medir duración con las fronteras y población elegible definidas en la spec.
- Proporcionar los conteos mensuales, gasto atribuido y CAC requeridos para evaluar los objetivos del MVP en Perú durante sus tres primeros meses.
- Hacer verificable el cambio con pruebas de caracterización del contrato W1 antes de modificar comportamientos críticos.

**Non-Goals:**
- Cambiar rutas, cuerpos, respuestas, códigos HTTP, estados o reglas de KYC, decisiones manuales, wallets, saldos o pagos de W1.
- Introducir KYC real, documentos reales, autenticación, prevención de duplicados, requisitos regulatorios o nuevas políticas de cumplimiento.
- Elegir proveedor, arquitectura de analítica, almacenamiento, formato de eventos, diseño visual o infraestructura que no estén presentes en el repositorio.
- Garantizar las metas de negocio; el alcance produce mediciones para evaluarlas, no garantiza sus resultados.
- Rediseñar otras historias, flujos o componentes de la aplicación.

## Protected Contracts

- `POST /kyc/verifications`: acepta datos ficticios con `documentType=TEST` y `document` con prefijo `TEST-`; `scenario` es opcional y por defecto `APPROVED`. Conserva las respuestas `201`, `400`, `503 KYC_UNAVAILABLE`, `413` y `429` y sus efectos: `APPROVED` activa una wallet con saldo cero, `MANUAL_REVIEW` deja la wallet `PENDING` y abre un caso de soporte, `REJECTED` crea una wallet rechazada y `UNAVAILABLE` no crea cuenta ni wallet. No se añade prevención de registros repetidos.
- `GET /kyc/verifications/{id}` conserva el identificador KYC y `404 NOT_FOUND` para verificaciones inexistentes.
- `POST /kyc/verifications/{id}/decision` sigue aceptando `ACTIVE` o `REJECTED` para verificaciones pendientes; repetir la decisión final mantiene `200`, cambiarla produce `409 DECISION_CONFLICT` y una decisión inválida produce `400 INVALID_DECISION`. Se mantienen además `404`, `413` y `429` según el contrato.
- `GET /wallets/{id}` conserva el identificador de wallet, sus estados y los saldos en céntimos (`available = balance - reserved`); solo pagos `PENDING` reservan saldo y una wallet inexistente responde `404 NOT_FOUND`.
- Una wallet `REJECTED` no puede pagar (`409`); el flujo de onboarding no modifica respuestas ni reglas de pagos. La entrada de pagos de bajo monto se muestra/habilita solo para una wallet `ACTIVE`.
- Los eventos y reportes de esta capacidad son salidas adicionales del flujo. No añaden campos ni cambian respuestas HTTP W1, errores, decisiones KYC o estados existentes.
- La duración elegible comienza al presentar el primer paso y termina cuando la wallet pasa a `ACTIVE` tras KYC `APPROVED`. Los demás desenlaces no son finalizaciones elegibles. Se reporta la mediana junto a la referencia de 8 minutos y el objetivo de 3 minutos.
- El reporte de cada uno de los tres primeros meses posteriores al lanzamiento en Perú contiene nuevos usuarios activos, MAU (usuarios únicos con al menos una actividad de producto en el mes), gasto de adquisición atribuido en PEN y CAC como gasto atribuido dividido entre nuevos usuarios activos. Si el denominador es cero, CAC se indica como no calculable, no como cero.

## Components Affected

- **Presentación y control del onboarding:** secuencia de pasos, paso actual, validación local aplicable, bloqueo de avance y mensajes de corrección.
- **Integración W1 desde el flujo:** envío de solicitudes KYC y consulta de los resultados/verificación y wallet, conservando códigos, identificadores y errores existentes.
- **Presentación de activación y acceso a pagos:** traducción de `ACTIVE`, `PENDING`, `REJECTED` y `UNAVAILABLE` a estados visibles; acceso al punto de entrada de pagos solo en el caso permitido.
- **Instrumentación del ciclo de onboarding:** registro de inicio, pasos completados y cierre, con datos suficientes para correlacionar la duración sin asumir aquí un esquema o destino.
- **Salida de medición y reporte:** cálculo de mediana de duración y agregados mensuales de nuevos usuarios activos, MAU, gasto atribuido y CAC. Sus fuentes, retención, identidad/deduplicación y calendario de lanzamiento deben corresponder a mecanismos existentes o acordarse antes de implementarlos.
- **Pruebas de contrato, integración y analítica:** cobertura de los invariantes W1 y de las nuevas fronteras de medición.

Estos son límites funcionales; su asignación a servicios, módulos o infraestructura queda pendiente de inspeccionar el runtime real.

## Decisions

1. **W1 permanece como autoridad para los resultados de KYC y wallet.** El flujo presenta los resultados de la API y consulta el estado cuando corresponda; no mantiene una transición paralela ni activa wallets desde la interfaz. Alternativa considerada: inferir activación al completar los pasos locales. Se descarta porque la activación depende de `APPROVED` y del estado real de wallet.
2. **La validación del flujo no sustituye la validación contractual de la API.** Se puede evitar el avance y orientar al usuario antes de enviar datos, pero el contrato y los errores de servidor siguen siendo autoritativos. Alternativa: cambiar o relajar la API para acomodar el flujo; se descarta por el límite explícito de no modificar W1.
3. **La entrada de pagos depende del estado `ACTIVE`, no solo del éxito visual del onboarding.** `PENDING`, `REJECTED` y `UNAVAILABLE` no habilitan ese punto de entrada. La decisión manual continúa siendo responsabilidad del flujo W1 existente. Alternativa: permitir pagos mientras hay revisión; se descarta porque contradice la spec y el contrato.
4. **La frontera de duración es la definida en la spec.** Se mide desde la presentación del primer paso hasta que la wallet esté `ACTIVE` después de `APPROVED`; los flujos sin ese resultado se excluyen de la mediana. Alternativas como medir desde la primera interacción o detener el cronómetro en el envío KYC se descartan porque producirían una métrica distinta.
5. **Las métricas se reportan según las definiciones de producto, sin fijar una tecnología de analítica.** MAU cuenta usuarios únicos con al menos una actividad de producto durante el mes; CAC usa gasto atribuido en PEN sobre nuevos usuarios activos y queda no calculable con denominador cero. Alternativa: codificar proveedor, atribución o una convención de evento/identidad nueva en este diseño; se descarta porque no hay evidencia de esa infraestructura en el repositorio y la propuesta la deja fuera de alcance.
6. **Los umbrales son criterios de evaluación, no lógica de producto.** El reporte muestra la mediana frente a 8 y 3 minutos y los valores frente al objetivo de MAU de 1,000–2,000 y CAC de PEN 10; no cambia el flujo para forzar su cumplimiento. La fecha exacta de lanzamiento, las fuentes de gasto y la regla operativa para identificar “nuevo usuario activo” deben quedar acordadas antes de implementar los reportes, manteniendo las definiciones aprobadas.

## Incremental Strategy

1. **Caracterizar antes de cambiar:** registrar con pruebas el comportamiento observable actual de W1 para escenarios válidos, entradas inválidas, consultas, decisiones, errores y pagos. Resolver cualquier diferencia entre ejecución y contrato antes de atribuirla a este cambio.
2. **Añadir el flujo guiado:** mostrar pasos/progreso y validar información obligatoria y los datos ficticios exigidos; conservar el paso actual y mostrar correcciones accionables ante errores.
3. **Conectar resultados y activación:** representar los estados observados de KYC/wallet y habilitar el punto de entrada de pagos solo cuando la wallet consultada esté `ACTIVE`; cubrir decisiones pendientes y respuestas no exitosas.
4. **Instrumentar eventos y duración:** emitir los tres tipos de eventos requeridos y calcular la duración con las fronteras y exclusiones fijadas. Verificar consistencia entre la activación observada y el final de medición.
5. **Entregar el reporte mensual:** conectar fuentes acordadas para nuevos usuarios activos, actividad mensual y gasto atribuido; probar fórmula, límites temporales y denominador cero antes de publicar métricas.
6. **Habilitar de forma gradual donde el runtime lo permita:** comparar errores, estados y conteos con la línea base; detener la habilitación si se altera un contrato protegido o las mediciones no son reproducibles.

Cada etapa debe poder validarse independientemente. No se requiere una migración o proveedor de datos nuevo como parte del diseño; si la implementación demuestra que son imprescindibles, se deberá acordar su alcance y compatibilidad antes de introducirlos.

## Characterization Tests

Antes de modificar el comportamiento crítico de W1, establecer pruebas de contrato (o pruebas de integración sobre el servicio existente) para:

- KYC `APPROVED` predeterminado y explícito: `201`, estado `ACTIVE`, saldo cero e identificadores correctos.
- KYC `MANUAL_REVIEW`, `REJECTED` y `UNAVAILABLE`: estados y caso de soporte esperados, respuesta `503 KYC_UNAVAILABLE` sin crear recursos para indisponibilidad, y rechazo del pago con wallet rechazada mediante `409`.
- Documento inválido (`documentType` distinto de `TEST` o sin prefijo `TEST-`): `400` sin crear verificación ni wallet; solicitudes válidas repetidas conservan el comportamiento sin prevención de duplicados.
- Decisiones sobre verificaciones pendientes: actualización de wallet y soporte, repetición idempotente, conflicto al cambiar una decisión final y `400 INVALID_DECISION` para valores no admitidos.
- Consultas de identificadores inexistentes (`404 NOT_FOUND`), campos/identificadores de respuesta y saldos; pago `PENDING` como único estado que reserva fondos.
- Límites de tamaño e intentos (`413` y `429`) y códigos/cuerpos de error documentados, para asegurar que la nueva capa de presentación no los traduzca en falsos éxitos.
- Separadamente, los escenarios del nuevo flujo: pasos visibles y persistencia del paso ante datos inválidos; cada estado de KYC/wallet y habilitación de pagos; un evento por inicio, paso completado y cierre; cálculo de duración solo para `APPROVED` que llega a `ACTIVE`; y reporte mensual, moneda, fórmula CAC y cero denominador.

No se encontró código ejecutable o una suite de pruebas en la raíz inspeccionada, por lo que no es posible fijar aquí una línea base de ejecución. Al implementar, primero se deberán correr estas pruebas contra el servicio disponible y documentar cualquier divergencia con `W1_api.md`; la spec de este cambio no autoriza corregirla silenciosamente ampliando el contrato.

## Risks / Trade-offs

- **La implementación real puede estar fuera del repositorio inspeccionado.** Los límites lógicos no deben traducirse en módulos o dependencias supuestos; confirmar tecnología, pruebas y fuentes existentes antes de asignar ubicaciones.
- **Fuentes o definiciones de adquisición incompletas** (gasto, identidad de usuario, “nuevo usuario activo” o fecha de lanzamiento) pueden producir CAC/MAU no reproducibles. Acordar y documentar estas entradas antes del reporte; no completar vacíos con valores predeterminados silenciosos.
- **Eventos incompletos, duplicados o fuera de orden** pueden sesgar duración y conteos. Validar correlación y consistencia con activación; reutilizar mecanismos existentes si los hay y exponer fallos de medición, no presentarlos como cero ni como éxito.
- **Desalineación entre estado mostrado y estado actual de W1** puede habilitar una acción prematuramente. Basar la presentación y el gating en el resultado W1 disponible y volver a consultar conforme al patrón existente; no inferir `ACTIVE` del avance local.
- **Errores traducidos u ocultos por la nueva experiencia** pueden romper contratos observables. Las pruebas de caracterización deben cubrir rutas de éxito y error antes de habilitar cambios y conservar los códigos/mensajes contractuales en la integración.
- **Atribución analítica vs. privacidad/retención** requiere políticas existentes del producto. No registrar documentos ni datos sensibles en eventos de onboarding; revisar los campos mínimos y las reglas aplicables antes de instrumentar.
- **Métricas tempranas con volumen bajo** pueden ser inestables. El reporte debe mostrar la población y periodo realmente medidos y no afirmar que una meta se alcanzó por el mero hecho de publicar la métrica.

## Rollback

El cambio no requiere modificar contratos públicos W1. Si la implementación permite habilitación gradual, deshabilitar el nuevo flujo, su punto de entrada o la publicación del reporte de forma independiente cuando una regresión afecte los invariantes; mantener disponibles las rutas y comportamiento W1 anteriores.

Si la instrumentación o el cálculo falla, detener o marcar la salida afectada como no disponible/no calculable según la métrica, sin sustituir datos ausentes por cero ni cambiar el resultado de KYC o wallet. Si se añadiera persistencia aditiva durante una implementación futura, conservar compatibilidad con la versión anterior y no eliminar eventos históricos en rollback. Cualquier rollback que requiera cambiar rutas, respuestas o estados W1 no está cubierto por este cambio y requiere una decisión/spec aparte.
