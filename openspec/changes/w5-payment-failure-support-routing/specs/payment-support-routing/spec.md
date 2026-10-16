# Spec Delta

## Purpose

Esta capacidad permite que soporte y el usuario distingan fallas confirmadas de resultados inciertos o transferencias ejecutadas, y que las acciones de atención queden vinculadas a una transacción y a su resolución.

## ADDED Requirements

### Requirement: Clasificar resultados fallidos y expirados confirmados

El sistema SHALL asociar a cada pago confirmado como fallido o expirado un código de motivo legible por máquina.

#### Scenario: Pago rechazado con motivo

- **WHEN** el resultado confirmado de un pago es fallido
- **THEN** la información disponible para soporte incluye un código de motivo no vacío y legible por máquina asociado a la referencia del pago

#### Scenario: Pago expirado con motivo

- **WHEN** el estado confirmado del pago indica que expiró
- **THEN** la información disponible para soporte incluye un código de motivo no vacío y legible por máquina asociado a la referencia del pago

### Requirement: No clasificar un resultado incierto como falla

El sistema SHALL distinguir un timeout o resultado pendiente de un fallo confirmado y SHALL usar la resolución del pago existente para determinar la ruta de atención.

#### Scenario: Timeout después del procesamiento

- **WHEN** la creación del pago devuelve timeout con `paymentId`
- **THEN** el sistema conserva el resultado como incierto, no lo clasifica como fallo confirmado y permite consultar o resolver ese pago existente sin crear otro cobro

#### Scenario: Resolución confirma que sigue pendiente

- **WHEN** se resuelve un pago y el proveedor todavía informa `PENDING`
- **THEN** el pago continúa pendiente y existe un caso de soporte abierto asociado a su referencia

### Requirement: Mostrar elegibilidad y siguiente acción para soporte

El sistema SHALL mostrar a soporte si el pago admite reintento, investigación o derivación a disputa, y SHALL identificar la acción aplicable a partir del resultado confirmado.

#### Scenario: Falla técnica antes de crear una operación

- **WHEN** el proveedor devuelve un error técnico antes de crear el pago
- **THEN** la guía identifica la falla técnica, indica que no existe una operación confirmada y muestra si corresponde reintentar

#### Scenario: Pago ejecutado

- **WHEN** el estado confirmado indica que la transferencia se ejecutó
- **THEN** la guía no recomienda repetir el pago como recuperación automática y muestra la elegibilidad de investigación o derivación a disputa

#### Scenario: Pago fallido confirmado

- **WHEN** el pago tiene un resultado fallido confirmado
- **THEN** soporte ve la clasificación y la acción disponible entre reintento, investigación o derivación a disputa

### Requirement: Diferenciar la orientación al usuario según el resultado

El sistema SHALL comunicar una falla técnica de forma distinta a una transferencia que ya fue ejecutada.

#### Scenario: Falla técnica

- **WHEN** el problema es técnico y no existe evidencia de que el pago se haya ejecutado
- **THEN** la orientación indica que la operación no fue confirmada y no afirma que el dinero fue transferido

#### Scenario: Transferencia ejecutada

- **WHEN** el estado confirmado indica que el pago se ejecutó
- **THEN** la orientación informa que la transferencia fue ejecutada y dirige al usuario a investigación o disputa elegible, no a repetir el pago

### Requirement: Registrar las acciones de soporte con referencia y resolución

El sistema SHALL registrar cada acción de soporte con la referencia de transacción, el tipo de acción y su estado de resolución.

#### Scenario: Acción de soporte registrada

- **WHEN** soporte registra una acción sobre un incidente de pago
- **THEN** el registro puede consultarse por la referencia de transacción y muestra el tipo de acción y su estado de resolución

#### Scenario: Caso resuelto

- **WHEN** la causa del incidente se resuelve
- **THEN** el seguimiento refleja el estado resuelto y conserva la referencia y el motivo del caso

