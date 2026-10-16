# Tasks

El repositorio no dispone de un GitHub Issue identificable para W2. Por autorización del usuario, este checklist queda limitado a `proposal.md`, `specs/low-value-payments/spec.md` y `design.md`; no amplía el alcance a W4/W5 ni modifica sus contratos.

## 1. Caracterización del contrato existente

- [ ] 1.1 Localizar el flujo de pagos y las pruebas existentes; ejecutar la suite focalizada antes de cambios y comprobar que el baseline pasa.
- [ ] 1.2 Añadir o completar pruebas de caracterización para reintento con la misma clave y contenido, conflicto por contenido distinto y solicitudes simultáneas; verificar que una única operación se crea y que pasan las pruebas focalizadas.
- [ ] 1.3 Añadir o completar pruebas de caracterización para timeout con `paymentId`, resolución del mismo pago, consulta de estado, historial y disponibilidad del comprobante; verificar que resolver un timeout no crea una segunda operación.
- [ ] 1.4 Añadir o completar pruebas de caracterización para estados pendientes, aprobados y rechazados y para validaciones de saldo existentes; ejecutar las pruebas y comprobar que se conserva el contrato actual.

## 2. Revisión y confirmación del pago

- [ ] 2.1 Obtener y registrar los límites de monto aprobados por producto para cada proveedor/canal del MVP; verificar que cada combinación necesaria tenga un valor antes de habilitar el bloqueo de envío por límite.
- [ ] 2.2 Implementar la revisión previa de identidad del destino e importe, y el bloqueo de importes superiores al límite aprobado antes de enviar; verificar con pruebas un importe permitido, el límite y uno superior sin emitir solicitud para el caso rechazado.
- [ ] 2.3 Implementar la presentación diferenciada del estado pendiente y de los resultados terminales confirmados; verificar que solo un estado del pago que confirme explícitamente expiración se muestre como expirado.
- [ ] 2.4 Implementar el tratamiento de timeout como resultado incierto y la consulta/resolución del pago existente antes de permitir una nueva operación; verificar que timeout no se presente como fallo ni expiración y que la recuperación no genere otro cobro.

## 3. Evidencia, acciones y medición

- [ ] 3.1 Implementar la presentación de referencia, historial y comprobante para pagos exitosos; verificar que un pago exitoso pueda consultarse y que los estados no elegibles no se muestren como pagos completados.
- [ ] 3.2 Implementar las acciones volver/reintentar para resultados fallidos o expirados conservando la clave y el contenido al repetir el mismo intento; verificar que el reintento no duplique el cobro y que una intención nueva solo use una clave nueva.
- [ ] 3.3 Integrar los eventos del funnel W2 y el evento de activación con las convenciones analíticas existentes; verificar que éxito emita activación, resultados fallidos/expirados no la emitan y que el reporte permita comparar la caída con la referencia del 30 % y el objetivo del 8 %.
- [ ] 3.4 Ejecutar las pruebas focalizadas y de integración del flujo completo, incluida la secuencia timeout → resolución → resultado confirmado; verificar que todas pasen y que no haya regresiones en idempotencia, saldo, historial ni comprobantes.
