---
name: api-contract-json-fixtures
description: 'Genera en db/ ejemplos JSON sintéticos basados en el contrato OpenAPI de un endpoint. Para responses, incluye un return representativo de éxito y un error genérico 500. Úsalo cuando se soliciten mocks, responses o datos de ejemplo.'
argument-hint: 'Endpoint, archivo OpenAPI o contrato'
user-invocable: true
---

# Ejemplos JSON desde contratos API

## Objetivo

Crear en `db/` un archivo JSON útil para revisar o probar un endpoint. Deriva la forma del payload y sus valores de los schemas de request o response definidos para la operación en OpenAPI u otro contrato. Para responses, incluye un solo return representativo de éxito según el schema exitoso y un error genérico con status `500`, sin listas de fixtures. El ejemplo de error `500` es genérico y no implica que ese código o cuerpo esté declarado en el contrato. Los datos deben ser enteramente sintéticos y seguros para pruebas; el archivo no modifica el endpoint, el contrato ni el código funcional.

## Procedimiento

1. Identifica el método HTTP, ruta y operación. Encuentra la especificación OpenAPI compartida o, si el usuario solo dio una ruta, búscala en el repositorio (prioriza `docs/APIs/openapi.json`). Determina qué se solicita simular: usa `requestBody` para una solicitud y `responses` para una respuesta. Para responses, incluye el status de éxito definido por el contrato y un único campo `return` con un cuerpo representativo según el schema de esa respuesta. Incluye también un único objeto `error` genérico con status `500` y mensaje `Internal Server Error`, sin replicar errores declarados individualmente. El error genérico `500` se usa aunque el contrato no lo declare; explica que su forma puede no coincidir con un schema de error contractual. Trata `default` como respuesta por defecto, no como éxito, salvo que el contrato lo indique. Si el usuario dice solo "mock del endpoint" sin especificar dirección, genera el payload de `requestBody` —los datos que el cliente envía al endpoint— y deja claro ese alcance; si no hay `requestBody`, usa la respuesta definida. No mezcles propiedades de request y response.
2. Usa como fuente de verdad las `properties` del schema seleccionado para el request o response exitoso. Para el `return`, toma el schema del `content` de la respuesta exitosa específica. Incluye las propiedades definidas, respetando `required`, tipos, formatos, enums, ejemplos, patrones, nulabilidad, restricciones y anidamiento. Para valores de ejemplo, prioriza `example`/`examples`, luego `default` y enums; si no están definidos, crea valores ficticios que cumplan el schema. No agregues campos no declarados al cuerpo de éxito. Resuelve `$ref` contra la especificación disponible y respeta `allOf`, `oneOf` y `anyOf`; si la composición o referencia no puede resolverse, declara la limitación en vez de adivinar.
3. Para responses, usa un objeto JSON en la raíz con este formato:
   ```json
   {
     "success": {
       "status": "201",
       "return": {}
     },
     "error": {
       "status": "500",
       "message": "Internal Server Error"
     }
   }
   ```
   Reemplaza el objeto vacío de `return` por un cuerpo representativo que coincida con el schema exitoso; no copies el ejemplo literalmente. `success` y `error` son metadatos del contenedor. El cuerpo de `return` conserva la forma del payload exitoso. El objeto genérico `error` conserva status `500` y mensaje `Internal Server Error`; no le atribuyas un schema contractual si no está definido. Para requests, genera el payload literal conforme al schema; no lo envuelvas en `fixtures`.
4. Genera un único objeto/payload representativo por operación. Incluye las propiedades requeridas y las opcionales definidas que puedan generarse válidamente. Mantén coherentes identificadores y referencias, y no inventes reglas de negocio ausentes del contrato.
5. Haz que los datos sean plausibles y completamente sintéticos. Usa dominios reservados para pruebas (por ejemplo, `.test` o `.invalid`) para correos; no copies datos personales ni uses secretos o identificadores productivos. No sacrifiques restricciones del schema. Para campos de credenciales de un request, usa valores ficticios seguros que cumplan el contrato.
6. Si el contrato está incompleto, es ambiguo o contiene referencias no disponibles, no adivines silenciosamente. Pide la aclaración mínima necesaria o genera solo lo que sí puede sustentarse y enumera las limitaciones.
7. Asigna automáticamente el nombre del JSON en inglés según la descripción de la operación OpenAPI: prioriza `summary`; si falta o no aporta un nombre útil, usa una frase breve de `description`. Si el texto elegido no está en inglés, tradúcelo a una frase concisa en inglés que conserve el significado de la operación antes de normalizarlo. Convierte el texto a minúsculas, reemplaza secuencias de caracteres no alfanuméricos por guiones y añade `.json` (por ejemplo, `Registrar credenciales` → `register-credentials.json`). Si no hay una descripción útil, usa el último segmento de la ruta, traducido al inglés si hace falta, y normalízalo del mismo modo. Guarda el archivo en `db/`. Antes de sobrescribir el nombre resultante, inspecciona su contenido: actualiza solo si corresponde a la misma operación; si es un artefacto distinto, no lo sobrescribas y pide aclaración para resolver el conflicto.
8. Comprueba que el resultado sea JSON válido y que su payload de request o `success.return` coincida con las restricciones del schema seleccionado. Verifica que el status de éxito coincida con el contrato y que el error genérico tenga status `500`; informa que el error puede no corresponder a un schema definido formalmente. Si hay una herramienta de validación disponible y un esquema formal, úsala; informa cualquier validación que no se haya podido realizar.

## Límites

- No alteres el contrato, el endpoint, código funcional, infraestructura ni configuración.
- Si el usuario solo proporciona una ruta, inspecciona el OpenAPI del repositorio antes de pedir más información. No inventes un contrato si no encuentras la operación o sus properties del request/response; solicita el contrato o declara claramente qué parte no es verificable.
- El error genérico `500` es una convención del skill solicitada para los ejemplos y no debe presentarse como una respuesta declarada por OpenAPI ni como un body validado contra un schema de error.
- No agregues propiedades auxiliares como `_comment`, ni comentarios, porque no son JSON estándar ni pertenecen al contrato. Explica fuera del archivo cualquier supuesto o limitación.
- No afirmes que los ejemplos fueron validados contra un esquema formal si solo se revisaron manualmente.
- Mantén fuera del archivo las explicaciones; el entregable debe poder consumirse como JSON.

## Respuesta al usuario

Resume el método y ruta considerados, el nombre en inglés asignado a partir del resumen/descripción de la operación y si se generó un request o response. Para responses, indica el código HTTP de éxito contractual y el error genérico `500`, y aclara que el contenedor `success`/`error` es un formato para organizar ejemplos, no el payload literal de la API. Cita los supuestos o limitaciones relevantes y enlaza el archivo generado.
