# Cobertura del alcance por historias W

Este documento explica qué historias W cubrirían las necesidades del MVP definidas en [Alcance.md](./Alcance.md) y por qué. La cobertura se basa en el comportamiento descrito en [hu.md](./hu.md); una cobertura parcial indica que la W aborda el flujo, pero no especifica todos los criterios necesarios para cumplir el alcance.

## Resumen

| Necesidad del alcance | W que la cubrirían | Nivel | Por qué |
|---|---|---|---|
| Onboarding de wallet para el MVP en Perú | W1 | Directo para el flujo; parcial para el objetivo de rapidez | W1 incluye registro, validaciones/KYC mock y estados de cuenta. No define el recorrido UX detallado ni cómo medir que se complete en 3 minutos. |
| Transferencias frecuentes de bajo monto | W2, con apoyo de W4 y W5 | Parcial | W2 permite pagos a una persona o comercio y confirma el resultado. W4 protege los reintentos contra duplicados y W5 cubre estados de error o pendientes. No se define el monto máximo del MVP ni el pago mediante alias. |
| Pago a comercios con QR | W3, con apoyo de W5 y W6 | Directo para el flujo de prueba | W3 genera o lee un QR, inicia el pago y refleja su resultado. W5 cubre fallas y reversos simulados; W6 ayuda a verificar que el resultado coincida entre las fuentes. |
| Confirmación y estado visible del pago | W2 y W3; W5 para resultados no exitosos o pendientes | Parcial | W2 incluye confirmación, comprobante e historial; W3 refleja el resultado del pago QR; W5 contempla timeout, rechazo y pending. No se describe una vista de estado específica para pagador y comercio. |
| Confiabilidad de operaciones frente a reintentos y callbacks duplicados | W4 | Directo para idempotencia | W4 especifica idempotency key, callbacks duplicados y validación persistente, reduciendo el riesgo de duplicidad financiera. |
| Fallas, reversos y escalamiento | W5, con apoyo de W4 y W6 | Parcial | W5 simula timeout, rechazo, pending y reversos, y contempla HITL. W4 evita duplicados; W6 puede detectar diferencias posteriores. No se define el procedimiento real legal/operativo de disputas o reversos. |
| Conciliación de transacciones núcleo | W6, con apoyo de W4 y W5 | Directo para conciliación mock; parcial para operación diaria | W6 compara Wallet, proveedor mock y ledger local, detecta diferencias y determina estados finales. Las W no detallan alertas ni monitoreo operativo continuo. |
| Instrumentar checkout, finalización de onboarding y activación al mes 3 | Ninguna W actual | No cubierta | W1–W6 no describen eventos analíticos, embudos, reportes ni seguimiento de cohortes para medir estas métricas. |

## Cobertura de las historias de usuario candidatas

### 1. Onboarding rápido y orientación durante el flujo

**W principal: W1 — Onboarding Wallet.**

W1 cubre el alta, las validaciones, el KYC mock y los estados de cuenta, por lo que establece el flujo base de incorporación. La historia candidata también promete que el usuario entenderá el siguiente paso en cada punto y que completará el onboarding rápidamente; esos criterios no están detallados en W1. Para verificar el objetivo de 3 minutos, además hace falta instrumentar el inicio, la finalización y los abandonos del onboarding.

### 2. Pago de bajo monto con confirmación clara

**W principal: W2 — Pago a contacto. Apoyos: W4 — Idempotencia y W5 — Fallas y reversos.**

W2 cubre la intención de pago a una persona o comercio, el resultado, el comprobante y el historial. W4 complementa el flujo para que los reintentos no creen operaciones duplicadas. W5 permite representar resultados como timeout, rechazo o pending, que son necesarios para comunicar un estado distinto de una confirmación exitosa. La cobertura es parcial mientras no se definan el rango de bajo monto, el uso de alias y los mensajes/estados visibles durante una transición asíncrona.

### 3. Cobro de un pequeño comercio con QR y validación confiable

**W principal: W3 — Pago QR comercio. Apoyos: W5 — Fallas y reversos y W6 — Conciliación.**

W3 cubre la generación o lectura de un QR, el inicio del pago y la presentación del resultado/comprobante. W5 añade escenarios de falla y pendiente; W6 comprueba que la operación concuerde entre las fuentes mock. Así se cubren el flujo QR y una validación técnica del resultado, aunque todavía no se especifican la disponibilidad operativa diaria, las vistas de estado diferenciadas para pagador/comercio ni la integración real con adquirencia.

### 4. Monitoreo de estados y conciliación por operaciones/compliance

**W principal: W6 — Conciliación. Apoyos: W5 — Fallas y reversos y W4 — Idempotencia.**

W6 permite comparar fuentes, encontrar diferencias y establecer el estado final de una operación. W5 aporta los casos que pueden necesitar atención humana y W4 da garantías contra duplicados que afectarían la conciliación. La conciliación está cubierta en el entorno mock, pero el monitoreo continuo, las alertas, los permisos de operaciones/compliance y los procedimientos de resolución no aparecen especificados en las W.

## Qué no se debe considerar cubierto

- **Métricas de éxito:** reducir la caída de checkout al 8%, completar onboarding en 3 minutos, mantener MAU entre 1,000 y 2,000 y alcanzar CAC de PEN 10 son objetivos de la épica, no resultados que las W garanticen por sí solas. La instrumentación de checkout, onboarding y activación al mes 3 no está asignada a ninguna W.
- **Integraciones productivas:** W2, W3, W5 y W6 describen proveedores, adquirencia o datos mock. No cubren la contratación, habilitación ni operación de los partners reales.
- **Restricciones de pago:** ninguna W detalla límites por proveedor, selección multirriel ni la expectativa 24x7x365 para pagos con alias.
- **Fuera de alcance:** expansión multipaís amplia, lealtad avanzada y APIs abiertas de pago para terceros no requieren cobertura en estas W para esta épica.

## Conclusión

W1, W2 y W3 cubren los flujos visibles del MVP —onboarding, transferencia y pago QR—. W4, W5 y W6 refuerzan su confiabilidad con idempotencia, manejo de fallas y conciliación. En conjunto cubren buena parte del alcance funcional, pero no bastan para afirmar que se cumplirán las métricas de negocio ni los aspectos de operación productiva: la instrumentación y varios criterios de alias, límites, monitoreo y procedimientos reales necesitan definición adicional.
