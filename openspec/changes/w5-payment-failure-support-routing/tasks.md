# Tasks

GitHub Issues está deshabilitado en este repositorio, por lo que no hay un identificador de Issue W5 contra el cual validar el alcance. Por autorización del usuario, estas tareas se limitan a `proposal.md`, `specs/payment-support-routing/spec.md` y `design.md`; las categorías de disputa, los SLA, las notificaciones externas y los cambios a los contratos financieros quedan excluidos.

## 1. Caracterización del comportamiento existente

- [ ] 1.1 Localizar las fuentes, pruebas y mecanismos de persistencia/autorización de W5 en este repositorio; ejecutar las pruebas focalizadas disponibles y verificar que el baseline pasa antes de modificar el comportamiento.
- [ ] 1.2 Añadir o completar pruebas de caracterización para `TIMEOUT_AFTER_PROCESSING` y `PROVIDER_ERROR`; verificar que el timeout conserva `paymentId` como resultado incierto y que el error previo al procesamiento no crea pago ni reserva.
- [ ] 1.3 Añadir o completar pruebas de caracterización para `/payments/{id}/resolve` cuando el pago sigue `PENDING` y cuando ya terminó; verificar el estado y que resolver repetidamente no crea pagos ni casos duplicados.
- [ ] 1.4 Añadir o completar pruebas de caracterización del ciclo de reverso y de `GET /support/cases`; verificar reverso único y completo, devolución de saldo solo tras confirmación, tratamiento de aprobación tardía y lectura de casos `OPEN`/`RESOLVED` sin edición directa ni notificaciones externas.
- [ ] 1.5 Añadir o completar pruebas de caracterización de idempotencia y callbacks duplicados según W4; verificar que una misma operación no genera cobros ni asientos duplicados.

## 2. Clasificación y guía según resultado confirmado

- [ ] 2.1 Implementar la clasificación de fallos confirmados y expiraciones confirmadas con un código de motivo legible por máquina; verificar que cada resultado elegible conserva motivo y referencia de transacción.
- [ ] 2.2 Implementar la guía de falla técnica, resultado incierto, fallo confirmado y transferencia ejecutada basada en el estado confirmado; verificar que timeout no se comunica como fallo/ejecución confirmados y que una transferencia ejecutada no ofrece repetición automática.
- [ ] 2.3 Mostrar a soporte las acciones elegibles de reintento, investigación o derivación genérica a disputa sin catálogo; verificar que la elegibilidad sigue el estado confirmado y no presenta categorías ni SLA no aprobados.
- [ ] 2.4 Añadir pruebas de unidad para clasificación y orientación; verificar escenarios técnicos, pendientes, fallidos confirmados y pagos ejecutados.

## 3. Registro auditable de acciones de soporte

- [ ] 3.1 Confirmar que la persistencia y autorización existentes permiten registrar una acción vinculada a la referencia de pago y caso sin cambiar el contrato de `GET /support/cases`; verificar el acceso autorizado y la consulta por referencia. Si no existe una vía compatible, detener esta tarea y solicitar revisión de alcance/spec antes de introducir un contrato nuevo.
- [ ] 3.2 Implementar el registro de acción de soporte con tipo y estado de resolución ligado a la transacción; verificar que el registro queda consultable por referencia y no modifica pago, saldo ni reverso.
- [ ] 3.3 Añadir pruebas para registrar una acción y cerrar/resolver un caso; verificar que referencia, motivo, tipo de acción y estado de resolución se conservan.

## 4. Verificación integrada

- [ ] 4.1 Ejecutar las pruebas focalizadas y de integración del recorrido timeout → resolución, del caso pendiente, de la orientación a soporte y del registro de acciones; verificar que pasan y que W4/W5 conservan sus contratos de idempotencia, pagos, casos y reversos.
