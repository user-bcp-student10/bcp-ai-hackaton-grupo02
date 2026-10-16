---
name: api-contract-json-fixtures
description: 'Genera en db/ un archivo JSON con un objeto raíz que contiene al menos cinco objetos de ejemplo a partir de un endpoint y su contrato. Úsalo cuando un Arquitecto comparta una ruta HTTP, OpenAPI, JSON Schema u otra definición de request/response y solicite fixtures o datos de ejemplo.'
argument-hint: 'Endpoint, contrato y nombre definido del archivo JSON'
user-invocable: true
---

# Fixtures JSON desde contratos API

## Objetivo

Crear en `db/` un archivo JSON útil para revisar o probar un endpoint. El JSON debe tener un objeto en la raíz que contenga al menos cinco objetos válidos conforme al contrato compartido. El archivo es un artefacto de ejemplo: no modifica el endpoint, el contrato ni el código funcional.

## Procedimiento

1. Identifica el método HTTP, ruta, operación, código de respuesta y esquema de respuesta del endpoint. Distingue el contrato de request del de response; genera objetos de response, salvo que el usuario pida explícitamente ejemplos de request.
2. Usa el contrato que comparta el usuario como fuente de verdad. Si es necesario para interpretar referencias o convenciones, consulta documentación del repositorio relevante. No inventes campos, relaciones, reglas de negocio ni valores permitidos.
3. Usa un objeto JSON en la raíz. Si el contrato define un objeto raíz con una propiedad de colección, conserva esa estructura y coloca al menos cinco objetos válidos en la colección. Si el contrato no define una colección o la respuesta wire es un arreglo, envuelve los ejemplos en una propiedad `fixtures` del objeto raíz; aclara que este contenedor es un formato de fixtures y no la respuesta literal del endpoint.
4. Construye al menos cinco objetos distintos y válidos. Incluye todos los campos requeridos, respeta tipos, formatos, enums, nulabilidad, restricciones y anidamiento. Para campos opcionales, omítelos o complétalos solo cuando tenga sentido según el contrato. Mantén coherentes entre sí identificadores, referencias, totales, conteos y metadatos.
5. Usa valores de ejemplo realistas y claramente ficticios; no uses datos personales reales, secretos, credenciales ni identificadores que puedan confundirse con datos productivos. Varía los objetos sin crear escenarios que contradigan las reglas conocidas.
6. Si el contrato está incompleto, es ambiguo o contiene referencias no disponibles, no adivines silenciosamente. Pide la aclaración mínima necesaria o genera solo lo que sí puede sustentarse y enumera las limitaciones.
7. Guarda el archivo dentro de `db/` usando exactamente el nombre JSON previamente definido por el usuario. Si no se proporcionó el nombre, solicítalo en lugar de inventar uno. Antes de sobrescribir un archivo, inspecciona su contenido; evita reemplazar un artefacto no relacionado.
8. Comprueba que el resultado sea JSON válido, que la raíz sea un objeto, que contenga al menos cinco objetos de recurso y que estos coincidan con las restricciones del contrato. Si hay una herramienta de validación disponible y un esquema formal, úsala; informa cualquier validación que no se haya podido realizar.

## Límites

- No alteres el contrato, el endpoint, código funcional, infraestructura ni configuración.
- No inventes un contrato cuando el usuario solo proporciona una ruta sin detalles suficientes; solicita el contrato o declara claramente qué parte no es verificable.
- No agregues propiedades auxiliares como `_comment`, ni comentarios, porque no son JSON estándar ni pertenecen al contrato. Explica fuera del archivo cualquier supuesto o limitación.
- No afirmes que los ejemplos fueron validados contra un esquema formal si solo se revisaron manualmente.
- Mantén fuera del archivo las explicaciones; el entregable debe poder consumirse como JSON.

## Respuesta al usuario

Resume el método y ruta considerados, la forma del JSON y el número de objetos. Indica si el archivo es una respuesta literal o un contenedor de fixtures, cita los supuestos o limitaciones relevantes y enlaza el archivo generado.
