---
name: api-contract-json-fixtures
description: 'Genera en db/ un archivo JSON con al menos cinco objetos de ejemplo realistas y sintéticos, basados en las properties del request o response de un endpoint definido en OpenAPI, JSON Schema u otro contrato. Úsalo cuando se soliciten mocks, fixtures o datos de ejemplo.'
argument-hint: 'Endpoint, archivo OpenAPI o contrato y nombre definido del archivo JSON'
user-invocable: true
---

# Fixtures JSON desde contratos API

## Objetivo

Crear en `db/` un archivo JSON útil para revisar o probar un endpoint. Deriva la forma y los valores de los mocks de las `properties` del esquema de request o response definido para la operación en OpenAPI u otro contrato, según lo que el usuario quiera simular. El JSON debe tener un objeto en la raíz que contenga al menos cinco objetos válidos conforme al contrato. Los datos deben parecer plausibles en un entorno real, pero ser enteramente sintéticos y seguros para pruebas; el archivo no modifica el endpoint, el contrato ni el código funcional.

## Procedimiento

1. Identifica el método HTTP, ruta y operación. Encuentra la especificación OpenAPI compartida o, si el usuario solo dio una ruta, búscala en el repositorio (prioriza `docs/APIs/openapi.json`). Determina qué se solicita simular: usa `requestBody` para ejemplos de request y `responses` para ejemplos de response. Si el usuario dice solo "mock del endpoint" sin especificar dirección, genera ejemplos del `requestBody` —son los datos que el cliente envía al endpoint— y deja claro ese alcance; si no hay `requestBody`, usa la respuesta exitosa. No mezcles propiedades de request y response.
2. Usa como fuente de verdad las `properties` del schema seleccionado. Incluye las propiedades definidas, respetando `required`, tipos, formatos, enums, ejemplos, patrones, nulabilidad, restricciones y anidamiento. Para valores de ejemplo, prioriza `example`/`examples`, luego `default` y enums; si no están definidos, crea valores ficticios que cumplan el schema. No agregues campos que no estén declarados. Resuelve `$ref` contra la especificación disponible y respeta `allOf`, `oneOf` y `anyOf` cuando estén definidos; si la composición o referencia no puede resolverse, declara la limitación en vez de adivinar.
3. Usa un objeto JSON en la raíz. Si el schema seleccionado define un objeto con una propiedad de colección, conserva esa estructura y coloca al menos cinco objetos válidos en la colección. Si no define una colección o el schema describe un único objeto o un arreglo, envuelve los ejemplos en una propiedad `fixtures` del objeto raíz; aclara que este contenedor es un formato de fixtures y no el payload literal del request o response.
4. Construye al menos cinco objetos distintos y válidos conforme al schema seleccionado. Incluye todas las propiedades requeridas y, cuando estén definidas, también las opcionales con valores válidos, para que el mock refleje las `properties` de OpenAPI. Mantén coherentes identificadores, referencias, totales, conteos y metadatos; no inventes relaciones o reglas de negocio ausentes del contrato.
5. Haz que los datos parezcan naturales y realistas: varía nombres/valores, longitudes, formatos y combinaciones de forma coherente con el dominio, evitando secuencias mecánicas repetidas o marcadores obvios como `foo`, `test1` o `example` cuando el contrato permita alternativas más plausibles. Usa dominios reservados para pruebas (por ejemplo, `.test` o `.invalid`) para correos. Los valores deben ser completamente sintéticos; no copies datos personales, no generes datos que puedan atribuirse a una persona real ni uses secretos, credenciales reales o identificadores productivos. No sacrifiques restricciones del schema para que los datos parezcan reales. Para campos de credenciales en un request (por ejemplo, `password`), usa valores ficticios que cumplan el contrato y evita contraseñas comunes o reutilizadas.
6. Si el contrato está incompleto, es ambiguo o contiene referencias no disponibles, no adivines silenciosamente. Pide la aclaración mínima necesaria o genera solo lo que sí puede sustentarse y enumera las limitaciones.
7. Guarda el archivo dentro de `db/` usando exactamente el nombre JSON previamente definido por el usuario. Si no se proporcionó el nombre, solicítalo en lugar de inventar uno. Antes de sobrescribir un archivo, inspecciona su contenido; evita reemplazar un artefacto no relacionado.
8. Comprueba que el resultado sea JSON válido, que la raíz sea un objeto, que contenga al menos cinco objetos de recurso y que sus propiedades y valores coincidan con las restricciones del schema seleccionado (request o response). Si hay una herramienta de validación disponible y un esquema formal, úsala; informa cualquier validación que no se haya podido realizar.

## Límites

- No alteres el contrato, el endpoint, código funcional, infraestructura ni configuración.
- Si el usuario solo proporciona una ruta, inspecciona el OpenAPI del repositorio antes de pedir más información. No inventes un contrato si no encuentras la operación o sus properties del request/response; solicita el contrato o declara claramente qué parte no es verificable.
- No agregues propiedades auxiliares como `_comment`, ni comentarios, porque no son JSON estándar ni pertenecen al contrato. Explica fuera del archivo cualquier supuesto o limitación.
- No afirmes que los ejemplos fueron validados contra un esquema formal si solo se revisaron manualmente.
- Mantén fuera del archivo las explicaciones; el entregable debe poder consumirse como JSON.

## Respuesta al usuario

Resume el método y ruta considerados, si los ejemplos son request o response, la forma del JSON y el número de objetos. Indica si el archivo es un payload literal o un contenedor de fixtures, cita los supuestos o limitaciones relevantes y enlaza el archivo generado.
