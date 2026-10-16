# Tasks: define-w1-onboarding-activation

## Alcance

GitHub Issues está deshabilitado en este repositorio y la propuesta aprobada indica que no hay un identificador de Issue disponible. Este checklist no sustituye al Issue como unidad de trabajo: desglosa únicamente `proposal.md`, `specs/wallet-onboarding/spec.md` y `design.md`, preservando el contrato documentado en `../../../docs/APIs/W1_api.md`. No incluye cambios de KYC real, autenticación, prevención de duplicados, pagos, cumplimiento, arquitectura analítica ni diseño visual.

## Checklist de implementación

### 1. Caracterización previa al cambio funcional

- [ ] Identificar la implementación W1 y el runner de pruebas disponibles; ejecutar la línea base existente sin modificar comportamiento. Registrar qué contratos se pudieron verificar y cualquier diferencia con `W1_api.md`; si no hay runtime ejecutable, registrar el bloqueo concreto en vez de inventar una implementación de prueba.
- [ ] Añadir pruebas de contrato para `POST /kyc/verifications`: casos `APPROVED` explícito y predeterminado, `MANUAL_REVIEW`, `REJECTED` y `UNAVAILABLE`, incluyendo códigos, estados, wallet/caso de soporte creados y ausencia de recursos cuando KYC no está disponible.
- [ ] Añadir pruebas de contrato para documentos inválidos y altas repetidas: `documentType` distinto de `TEST` o documento sin prefijo `TEST-` devuelve `400` sin crear recursos; solicitudes válidas repetidas con el mismo documento no activan prevención de duplicados.
- [ ] Añadir pruebas de caracterización para decisiones y consultas W1: `200` al repetir la misma decisión final, `409 DECISION_CONFLICT` al cambiarla, `400 INVALID_DECISION`, y `404 NOT_FOUND` para identificadores KYC o wallet inexistentes.
- [ ] Añadir pruebas de caracterización de wallet y pagos: estados/saldos en céntimos, `available = balance - reserved`, reserva únicamente para pagos `PENDING` y rechazo de pago con wallet `REJECTED` mediante `409`.
- [ ] Caracterizar los errores de tamaño e intentos (`413` y `429`) de las operaciones W1 afectadas, usando los límites existentes y sin introducir umbrales nuevos.

### 2. Implementación incremental del flujo

- [ ] Añadir pruebas del flujo para la secuencia de pasos requeridos, visibilidad del paso actual y conservación del paso cuando la validación impide avanzar.
- [ ] Implementar el progreso guiado del onboarding: mostrar la secuencia y el paso actual durante el avance, sin cambiar las rutas ni las respuestas W1.
- [ ] Añadir pruebas para datos obligatorios ausentes o inválidos, incluidos `documentType` y el prefijo `TEST-`; comprobar que el avance se bloquea y que el mensaje indica qué corregir.
- [ ] Implementar la validación y los mensajes accionables del flujo. Mantener la validación de la API como autoridad y conservar sus respuestas y errores contractuales.
- [ ] Añadir pruebas de integración del flujo con los cuatro resultados KYC, decisiones manuales y consultas; comprobar que se presentan los estados reales devueltos por W1 y que los errores no se convierten en resultados exitosos.
- [ ] Integrar la creación/consulta de KYC y wallet con el flujo existente, preservando identificadores, estados, errores y efectos definidos por W1; informar que falta una decisión para `PENDING` e indisponibilidad para `UNAVAILABLE`.
- [ ] Añadir pruebas de acceso al punto de entrada de pagos para cada estado de wallet; verificar que solo `ACTIVE` lo habilita y que el rechazo contractual de pagos para `REJECTED` permanece intacto.
- [ ] Implementar el gating del punto de entrada de pagos basado en el estado `ACTIVE` observado en W1; no activar ni inferir una wallet desde el avance visual del onboarding.

### 3. Eventos y medición de duración

- [ ] Añadir pruebas que verifiquen un evento observable por inicio, por cada paso completado y por cierre del flujo, sin incluir documentos ni otros datos sensibles.
- [ ] Registrar los eventos requeridos reutilizando el mecanismo analítico existente. Si no hay uno disponible, detener esta tarea y acordar el alcance técnico antes de introducir almacenamiento o un proveedor nuevos.
- [ ] Añadir pruebas de duración que fijen inicio en la presentación del primer paso, fin cuando la wallet pasa a `ACTIVE` después de KYC `APPROVED`, exclusión de `MANUAL_REVIEW`, `REJECTED` y `UNAVAILABLE`, y cálculo de mediana.
- [ ] Implementar la medición y el reporte de la mediana para la cohorte MVP en Perú durante los primeros tres meses desde el lanzamiento; mostrar junto a ella la referencia de 8 minutos y el objetivo de 3 minutos, sin presentar el objetivo como garantía.

### 4. Reporte mensual de activación y adquisición

- [ ] Antes de implementar el reporte, acordar y registrar la fecha de lanzamiento, las fuentes disponibles de gasto atribuido y la regla operativa para identificar nuevos usuarios activos. No sustituir definiciones o datos faltantes por supuestos; detener el reporte si las fuentes requeridas no existen dentro del alcance aprobado.
- [ ] Añadir pruebas para cada uno de los tres primeros meses posteriores al lanzamiento en Perú: nuevos usuarios activos, MAU como usuarios únicos con actividad de producto en el mes, gasto atribuido en PEN y CAC calculado como gasto dividido entre nuevos usuarios activos.
- [ ] Añadir una prueba para denominador cero: reportar cero nuevos usuarios activos y CAC no calculable, nunca CAC igual a cero.
- [ ] Implementar la salida mensual con esas métricas y definiciones, reutilizando la superficie de reporte existente. No añadir endpoints, proveedores ni arquitectura de adquisición fuera del alcance aprobado.

### 5. Regresión y cierre

- [ ] Ejecutar las pruebas nuevas de flujo, eventos, duración y reporte; comprobar cada escenario y fórmula definidos en la spec.
- [ ] Ejecutar la suite de contrato/regresión W1 y verificar que solicitudes, respuestas, errores, decisiones, estados de wallet, saldos y pagos no hayan cambiado.
- [ ] Validar el rollback de la capacidad añadida: donde el runtime lo permita, comprobar que se pueda deshabilitar el nuevo flujo o reporte sin retirar el comportamiento W1 existente; no eliminar datos analíticos históricos ni convertir mediciones ausentes en cero.
