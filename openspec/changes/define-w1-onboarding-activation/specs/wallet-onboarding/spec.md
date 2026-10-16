# Spec Delta

## Purpose

Define el comportamiento observable del flujo guiado de onboarding, la activación de wallet y la medición de resultados para que la experiencia y sus métricas sean verificables sin alterar el contrato W1 existente.

## ADDED Requirements

### Requirement: Mostrar el progreso del onboarding

El sistema SHALL mostrar la secuencia de pasos requeridos y señalar el paso actual durante el flujo de onboarding.

#### Scenario: Avance por los pasos del onboarding

- **WHEN** el usuario inicia el onboarding y avanza entre pasos
- **THEN** el sistema muestra la secuencia requerida y mantiene visible cuál es el paso actual

### Requirement: Bloquear el avance con datos inválidos

El sistema SHALL impedir el avance cuando falte información obligatoria o los datos no cumplan las validaciones aplicables, y SHALL mostrar una indicación accionable para corregirlos.

#### Scenario: Información obligatoria ausente o inválida

- **WHEN** el usuario intenta avanzar con información obligatoria ausente o datos inválidos, incluidos `documentType` distinto de `TEST` o un documento sin prefijo `TEST-`
- **THEN** el sistema conserva el paso actual y comunica qué información debe corregirse

#### Scenario: La API rechaza documentos fuera del contrato

- **WHEN** se envía una solicitud KYC con `documentType` distinto de `TEST` o un documento sin prefijo `TEST-`
- **THEN** la API responde `400` y no crea la verificación ni la wallet

### Requirement: Reflejar los resultados de KYC y la activación

El sistema SHALL reflejar en el flujo el estado de la verificación y de la wallet, y SHALL habilitar el acceso al punto de entrada de pagos de bajo monto únicamente cuando la wallet esté `ACTIVE`.

#### Scenario: KYC aprobado activa la wallet

- **WHEN** `POST /kyc/verifications` recibe datos ficticios válidos con escenario `APPROVED` o sin escenario explícito
- **THEN** la API responde `201`, crea una wallet `ACTIVE` con saldo cero y el flujo permite acceder al punto de entrada de pagos de bajo monto

#### Scenario: KYC requiere revisión manual

- **WHEN** `POST /kyc/verifications` recibe datos válidos con escenario `MANUAL_REVIEW`
- **THEN** la API responde `201`, la wallet queda `PENDING`, se abre un caso de soporte y el flujo informa que falta una decisión

#### Scenario: KYC rechaza la verificación

- **WHEN** `POST /kyc/verifications` recibe datos válidos con escenario `REJECTED`
- **THEN** la API responde `201`, la wallet queda `REJECTED` y un intento de pago con esa wallet responde `409`

#### Scenario: KYC no está disponible

- **WHEN** `POST /kyc/verifications` recibe datos válidos con escenario `UNAVAILABLE`
- **THEN** la API responde `503 KYC_UNAVAILABLE`, no crea una cuenta ni una wallet y el flujo informa que el servicio no está disponible

#### Scenario: Registro repetido con los mismos datos ficticios

- **WHEN** se envía más de una solicitud KYC válida con el mismo documento ficticio
- **THEN** la API no aplica prevención de altas repetidas y cada solicitud sigue el resultado indicado por su escenario

### Requirement: Preservar decisiones y consultas W1

El sistema SHALL conservar el comportamiento de decisiones finales, consultas de verificación y wallet definido por el contrato W1.

#### Scenario: Decisión sobre una verificación pendiente

- **WHEN** una verificación `PENDING` recibe una decisión `ACTIVE` o `REJECTED`
- **THEN** la API actualiza el estado de la wallet y resuelve el caso de soporte; repetir la misma decisión responde `200` y cambiar una decisión final responde `409 DECISION_CONFLICT`

#### Scenario: Identificador de verificación desconocido

- **WHEN** se consulta una verificación usando un identificador KYC inexistente
- **THEN** `GET /kyc/verifications/{id}` responde `404 NOT_FOUND`

#### Scenario: Identificador de wallet desconocido

- **WHEN** se consulta una wallet inexistente
- **THEN** `GET /wallets/{id}` responde `404 NOT_FOUND`

#### Scenario: Consulta de wallet existente y saldos

- **WHEN** se consulta una wallet existente
- **THEN** `GET /wallets/{id}` devuelve su estado y saldos en céntimos, con `available` igual a `balance - reserved`; solo pagos `PENDING` reservan saldo

#### Scenario: Decisión inválida

- **WHEN** una decisión enviada a `POST /kyc/verifications/{id}/decision` no es `ACTIVE` ni `REJECTED`
- **THEN** la API responde `400 INVALID_DECISION`

#### Scenario: Solicitud excedida o límite de intentos

- **WHEN** una solicitud KYC o de decisión excede el tamaño permitido o supera el límite de intentos
- **THEN** la API responde respectivamente `413` o `429`

### Requirement: Registrar los eventos del flujo

El sistema SHALL registrar un evento observable de inicio, uno por cada paso completado y uno de cierre del flujo para la analítica del MVP.

#### Scenario: Inicio, finalización de paso y cierre

- **WHEN** el usuario inicia el onboarding, completa un paso o cierra el flujo
- **THEN** la salida analítica contiene el evento correspondiente a cada una de esas acciones

### Requirement: Medir la duración de onboarding

El sistema SHALL medir la duración de los flujos con KYC `APPROVED` desde la presentación del primer paso hasta que la wallet pasa a `ACTIVE`, y SHALL reportar la mediana para la cohorte MVP en Perú durante los tres meses posteriores al lanzamiento.

#### Scenario: Reporte de duración del periodo posterior al lanzamiento

- **WHEN** se consulta la medición del periodo de los primeros tres meses desde el lanzamiento
- **THEN** se informa la mediana calculada con la frontera de inicio y fin definida, junto con la referencia de 8 minutos y el objetivo de 3 minutos para evaluar la reducción

#### Scenario: Flujo que no termina con KYC aprobado

- **WHEN** el flujo termina con KYC `MANUAL_REVIEW`, `REJECTED` o `UNAVAILABLE` sin alcanzar `ACTIVE` mediante `APPROVED`
- **THEN** el flujo no se contabiliza como finalización elegible para la mediana de duración definida aquí

### Requirement: Informar métricas mensuales de activación y adquisición

El sistema SHALL proporcionar, para cada uno de los tres primeros meses posteriores al lanzamiento en Perú, los conteos mensuales de nuevos usuarios activos y MAU, el gasto de adquisición atribuido y el CAC que esos datos permiten verificar frente a los objetivos definidos.

#### Scenario: Reporte mensual disponible

- **WHEN** se consulta el reporte de un mes dentro de los tres primeros meses posteriores al lanzamiento
- **THEN** el reporte incluye el conteo de nuevos usuarios activos, el conteo de usuarios únicos con al menos una actividad de producto en el mes, el gasto de adquisición atribuido en PEN y el CAC calculado como gasto atribuido dividido entre nuevos usuarios activos, para contrastarlos con los objetivos de MAU de 1,000 a 2,000 y CAC de PEN 10

#### Scenario: Ningún usuario nuevo activo en el mes

- **WHEN** el conteo mensual de nuevos usuarios activos es cero
- **THEN** el reporte muestra cero nuevos usuarios activos y señala el CAC como no calculable, sin sustituirlo por cero
