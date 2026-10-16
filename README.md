# MVP de Wallet para Perú

> Alcance de desarrollo documentado para W1, W2 y W5: onboarding, pagos de bajo monto y manejo de fallas y reversos.

## Objetivo

Reducir la fricción del checkout y acelerar el onboarding, manteniendo confirmaciones claras y rutas de atención previsibles ante fallas de pago. El MVP está enfocado inicialmente en Perú.

## Usuarios objetivo

- **Usuarios que realizan pagos frecuentes de bajo monto:** necesitan completar el onboarding y conocer el resultado de sus pagos con claridad.
- **Especialistas de soporte:** necesitan clasificar fallas y orientar la atención de pagos e incidentes de forma consistente.

## Alcance del MVP

- **W1 — Registro y activación:** alta de wallet, validaciones y estados de cuenta para incorporar al usuario.
- **W2 — Confirmación de pagos de bajo monto:** pago a una persona o comercio, resultado definitivo, referencia e historial cuando sea exitoso, y una siguiente acción ante falla o expiración.
- **W5 — Manejo de fallas de pago y reversos:** clasificación de fallas y expiraciones, orientación de soporte para reintento, investigación o disputa, y registro de acciones con referencia y estado de resolución.

La matriz considera parcial la cobertura de estas historias frente al alcance completo del MVP. El conjunto W1, W2 y W5 no define el recorrido detallado necesario para garantizar un onboarding en 3 minutos, el uso de alias ni la regla de monto bajo. Tampoco cubre por sí solo idempotencia robusta ante reintentos, conciliación ni los procedimientos legales y operativos reales para disputas y reversos.

## Stack tecnológico

- **Frontend:** Angular.
- **Backend:** Node.js.

El alcance funcional está definido; los detalles de infraestructura, persistencia y contratos de integración se documentarán cuando se acuerden.

## Objetivos de negocio

Los siguientes son objetivos del MVP, no resultados garantizados por las historias seleccionadas:

- Reducir la caída en checkout de **30% a 8%**.
- Reducir el tiempo de onboarding de **8 a 3 minutos**.
- Mantener entre **1,000 y 2,000 usuarios activos mensuales (MAU)**.
- Alcanzar un **CAC de PEN 10** por usuario nuevo.

Según la matriz de cobertura, la instrumentación analítica para verificar estas métricas no está cubierta por las waves consideradas.

## Consideraciones y riesgos

- Los límites transaccionales pueden variar por proveedor; la matriz señala que la regla de monto bajo sigue pendiente de definición.
- Los estados de pago deben distinguir claramente entre éxito, falla y expiración; las transiciones asíncronas requieren criterios adicionales.
- La matriz identifica como pendiente el control robusto de duplicados ante reintentos.
- La cancelación unilateral de transferencias ejecutadas no es uniforme; las rutas de reverso y disputa requieren definición operativa y legal.

## Historias incluidas

- Como usuario de smartphone, quiero completar un onboarding guiado y entender el siguiente paso para poder empezar a pagar.
- Como pagador, quiero completar un pago de bajo monto y recibir una confirmación definitiva de su resultado.
- Como especialista de soporte, quiero que los pagos fallidos, expirados y disputados sigan rutas de atención explícitas.

## Documentación

- [Alcance del MVP](docs/Alcance.md)
- [Matriz de cobertura por historias](docs/matriz_hu_objetivo_hackathon.md)
- [Historias de usuario](docs/HU/)
- [Definiciones de API](docs/APIs/)