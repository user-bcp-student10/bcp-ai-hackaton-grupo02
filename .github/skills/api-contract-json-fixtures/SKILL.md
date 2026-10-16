---
name: api-contract-json-fixtures
description: 'Genera en db/ un archivo JSON con al menos cinco objetos de ejemplo a partir de las properties de respuesta de un endpoint definido en OpenAPI, JSON Schema u otro contrato. Úsalo cuando se soliciten mocks, fixtures o datos de ejemplo y se proporcione el endpoint, la especificación y el nombre del archivo.'
argument-hint: 'Endpoint, archivo OpenAPI o contrato y nombre definido del archivo JSON'
user-invocable: true
---

# Fixtures JSON desde contratos API

## Objetivo

Crear en `db/` un archivo JSON útil para revisar o probar un endpoint. Deriva la forma y los valores de los mocks de las `properties` del esquema de respuesta definido para la operación en OpenAPI u otro contrato. El JSON debe tener un objeto en la raíz que contenga al menos cinco objetos válidos conforme al contrato. El archivo es un artefacto de ejemplo: no modifica el endpoint, el contrato ni el código funcional.

## Procedimiento

1. Identifica el método HTTP, ruta y operación. Encuentra la especificación OpenAPI compartida o, si el usuario solo dio una ruta, búscala en el repositorio (prioriza `docs/APIs/openapi.json`). Selecciona la respuesta exitosa pertinente y su esquema; no confundas el schema del `requestBody` con el de `responses`.
2. Usa como fuente de verdad las `properties` del esquema de respuesta de esa operación. Incluye las propiedades definidas, respetando `required`, tipos, formatos, enums, ejemplos, patrones, nulabilidad, restricciones y anidamiento. Para valores de ejemplo, prioriza `example`/`examples`, luego `default` y enums; si no están definidos, crea valores ficticios que cumplan el schema. No agregues campos que no estén declarados. Resuelve `$ref` contra la especificación disponible y respeta `allOf`, `oneOf` y `anyOf` cuando estén definidos; si la composición o referencia no puede resolverse, declara la limitación en vez de adivinar.
3. Usa un objeto JSON en la raíz. Si el schema de respuesta define un objeto con una propiedad de colección, conserva esa estructura y coloca al menos cinco objetos válidos en la colección. Si no define una colección o la respuesta wire es un arreglo o un único recurso, envuelve los ejemplos en una propiedad `fixtures` del objeto raíz; aclara que este contenedor es un formato de fixtures y no la respuesta literal del endpoint.
4. Construye al menos cinco objetos de respuesta distintos y válidos conforme al schema. Incluye todas las propiedades requeridas y, cuando el schema las define, rellena también las opcionales con valores válidos para que el mock refleje las `properties` del OpenAPI. Mantén coherentes identificadores, referencias, totales, conteos y metadatos; no inventes relaciones o reglas de negocio ausentes del contrato.
5. Usa valores de ejemplo realistas y claramente ficticios; no uses datos personales reales, secretos, credenciales ni identificadores que puedan confundirse con datos productivos. No incluyas campos de request como contraseñas salvo petición explícita de ejemplos de request.
6. Si el contrato está incompleto, es ambiguo o contiene referencias no disponibles, no adivines silenciosamente. Pide la aclaración mínima necesaria o genera solo lo que sí puede sustentarse y enumera las limitaciones.
7. Guarda el archivo dentro de `db/` usando exactamente el nombre JSON previamente definido por el usuario. Si no se proporcionó el nombre, solicítalo en lugar de inventar uno. Antes de sobrescribir un archivo, inspecciona su contenido; evita reemplazar un artefacto no relacionado.
8. Comprueba que el resultado sea JSON válido, que la raíz sea un objeto, que contenga al menos cinco objetos de recurso y que sus propiedades y valores coincidan con las restricciones del schema de respuesta. Si hay una herramienta de validación disponible y un esquema formal, úsala; informa cualquier validación que no se haya podido realizar.

## Límites

- No alteres el contrato, el endpoint, código funcional, infraestructura ni configuración.
- Si el usuario solo proporciona una ruta, inspecciona el OpenAPI del repositorio antes de pedir más información. No inventes un contrato si no encuentras la operación o sus propiedades de respuesta; solicita el contrato o declara claramente qué parte no es verificable.
- No agregues propiedades auxiliares como `_comment`, ni comentarios, porque no son JSON estándar ni pertenecen al contrato. Explica fuera del archivo cualquier supuesto o limitación.
- No afirmes que los ejemplos fueron validados contra un esquema formal si solo se revisaron manualmente.
- Mantén fuera del archivo las explicaciones; el entregable debe poder consumirse como JSON.

## Respuesta al usuario

Resume el método y ruta considerados, la forma del JSON y el número de objetos. Indica si el archivo es una respuesta literal o un contenedor de fixtures, cita los supuestos o limitaciones relevantes y enlaza el archivo generado.
