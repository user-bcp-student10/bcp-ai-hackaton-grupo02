# Spec Delta

## Purpose

Esta capacidad define el contrato observable para que un pagador pueda revisar y completar un pago de bajo monto, entender su resultado incluso cuando la confirmación sea asíncrona y consultar la evidencia de un pago exitoso.

## ADDED Requirements

### Requirement: Revisar el destino, el monto y los límites antes del envío

El sistema SHALL mostrar al pagador el destino y el monto antes de confirmar, y SHALL impedir el envío cuando el importe exceda el límite aplicable al proveedor y canal.

#### Scenario: Revisión previa del pago

- **WHEN** el pagador llega a la confirmación de un pago válido
- **THEN** ve la identidad del destino y el importe antes de enviar la operación

#### Scenario: Importe superior al límite aplicable

- **WHEN** el pagador intenta enviar un importe superior al límite vigente para el proveedor y canal
- **THEN** el sistema no envía el pago y comunica que el importe excede el límite

### Requirement: Comunicar el estado y un único resultado terminal

El sistema SHALL distinguir un pago en proceso de un resultado terminal y SHALL presentar un único resultado terminal coherente por intento.

#### Scenario: Confirmación asíncrona pendiente

- **WHEN** se inició un pago, pero todavía no se conoce su resultado definitivo
- **THEN** el pagador ve que la confirmación está en proceso y no recibe una confirmación terminal de éxito o fallo

#### Scenario: Resultado definitivo conocido

- **WHEN** el pago alcanza un resultado definitivo exitoso, fallido o expirado
- **THEN** el pagador ve el resultado correspondiente y el mismo intento no se presenta con un resultado terminal contradictorio

#### Scenario: Timeout sin resultado confirmado

- **WHEN** una solicitud de pago termina en timeout y todavía no se ha confirmado el resultado definitivo
- **THEN** el sistema informa que el resultado sigue sin confirmarse y no lo presenta como un pago fallido o exitoso

### Requirement: Conservar la evidencia consultable de pagos exitosos

El sistema SHALL hacer visible la referencia de un pago exitoso y SHALL permitir encontrarlo en el historial del pagador.

#### Scenario: Pago exitoso

- **WHEN** el pago termina exitosamente
- **THEN** el pagador ve su referencia de transacción y el pago queda disponible en su historial

#### Scenario: Comprobante de pago exitoso

- **WHEN** el pagador consulta el comprobante de un pago exitoso
- **THEN** el sistema entrega el comprobante asociado al pago

### Requirement: Dar una siguiente acción segura ante un resultado no exitoso

El sistema SHALL ofrecer una acción clara para volver o reintentar cuando un pago falla o expira, sin crear un cobro duplicado al repetir el mismo intento.

#### Scenario: Pago fallido o expirado

- **WHEN** el pago termina fallido o expirado
- **THEN** el pagador puede volver o reintentar y el resultado explica que el pago no se completó

#### Scenario: Reintento de una solicitud ya recibida

- **WHEN** se reintenta una solicitud con la misma clave de idempotencia y el mismo contenido
- **THEN** se devuelve el pago existente y no se crea un segundo cobro

#### Scenario: Clave reutilizada con contenido distinto

- **WHEN** se reutiliza una clave de idempotencia con contenido diferente
- **THEN** el sistema rechaza la solicitud con un conflicto y no la trata como un nuevo pago

### Requirement: Emitir activación del pagador después de un pago exitoso

El sistema SHALL emitir el evento de activación usado en la medición de MAU cuando el pagador completa exitosamente una transacción.

#### Scenario: Activación por transacción exitosa

- **WHEN** un pago del pagador termina exitosamente
- **THEN** se emite el evento de activación que consume el cálculo de MAU

#### Scenario: Pago no exitoso

- **WHEN** el pago termina fallido o expirado
- **THEN** no se emite para ese intento el evento de activación por transacción exitosa

### Requirement: Medir el resultado del funnel de checkout de W2

El sistema SHALL proporcionar mediciones del funnel de checkout de W2 para evaluar la cohorte MVP en Perú durante el trimestre posterior al lanzamiento frente a la línea base del 30 % y el objetivo del 8 % de caída.

#### Scenario: Consulta de medición del periodo MVP

- **WHEN** se consulta el resultado del funnel de W2 para la cohorte y periodo definidos
- **THEN** se informa la tasa de caída calculada para compararla con la línea base del 30 % y el objetivo del 8 %

