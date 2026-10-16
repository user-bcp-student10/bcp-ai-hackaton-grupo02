---
name: component-architecture-design
description: 'Diseña arquitectura de componentes como Arquitecto de TI. Úsalo para identificar componentes definidos, recomendar componentes faltantes y generar diagramas de arquitectura editables en formato draw.io (.drawio).'
argument-hint: 'Sistema, funcionalidad o alcance a modelar'
user-invocable: true
---

# Diseño de arquitectura de componentes

## Objetivo

Analizar un sistema o una funcionalidad desde la perspectiva de Arquitectura de TI, representar sus componentes y relaciones en un diagrama draw.io editable y recomendar componentes adicionales cuando exista una necesidad justificada.

## Cuándo usar

- El usuario solicita diseñar, actualizar o explicar una arquitectura de componentes.
- Se necesita mapear componentes existentes y sus interacciones para un sistema, flujo o funcionalidad.
- Se solicita recomendar componentes arquitectónicos o producir un diagrama que pueda abrirse y editarse en draw.io (diagrams.net).

## Procedimiento

1. Define el alcance a partir de la solicitud. Si no está claro qué sistema o flujo debe modelarse, pregunta antes de generar el diagrama.
2. Revisa las fuentes disponibles del repositorio que describan la arquitectura: documentación, diagramas, contratos, configuración y estructura del código. Da prioridad a las fuentes vigentes y explícitas; no declares que un componente existe basándote solo en suposiciones o en un nombre de carpeta.
3. Elabora un inventario de componentes identificados. Para cada componente, determina su responsabilidad, límites, interfaces y dependencias relevantes usando evidencia verificable. Registra las dudas o vacíos como tales.
4. Traza los flujos y relaciones que sean pertinentes al alcance. Usa flechas etiquetadas con el tipo o propósito de la interacción cuando se conozca. Distingue llamadas síncronas, eventos, acceso a datos y otros vínculos solo si hay evidencia; no inventes protocolos ni direcciones de flujo.
5. Evalúa si faltan capacidades arquitectónicas necesarias para los requisitos y restricciones conocidos. Presenta esas propuestas por separado de los componentes existentes, con su motivo, responsabilidad propuesta, dependencias e impacto. No añadas componentes por preferencia tecnológica ni amplíes el alcance sin justificarlo.
6. Diseña primero la composición y después escribe el XML. Para una vista de componentes, usa por defecto flujo de izquierda a derecha: actores/consumidores a la izquierda, componentes del sistema al centro y sistemas externos a la derecha; coloca persistencia debajo del componente que la usa. Usa contenedores para separar límites de sistema, no para implicar despliegue. Si el alcance requiere más de 12 nodos, agrupa responsabilidades relacionadas o separa el diagrama en páginas con nombres claros; no reduzcas el texto hasta volverlo ilegible.
7. Genera el archivo en `docs/architecture/diagrams/<alcance>-componentes.drawio`, creando solo los directorios necesarios. Antes de elegir el nombre, revisa si ya existe un diagrama para ese alcance. No sobrescribas diagramas de otro alcance y conserva la información vigente al actualizar uno existente.
8. Construye un diagrama editable de diagrams.net con XML legible (`mxfile` → `diagram` → `mxGraphModel` → `root`). Asegura IDs únicos, células base `id="0"` y `id="1"`, geometría para cada nodo y geometría relativa para cada conector. Cada conector debe referenciar IDs reales de origen y destino. Escapa los caracteres XML reservados (`&`, `<`, `>`, comillas cuando corresponda); para etiquetas HTML usa `html=1` y entidades XML válidas. No construyas la vista como una imagen incrustada ni como un volcado de Mermaid.
9. Aplica una jerarquía visual consistente: título y alcance en la parte superior; nodos con nombres breves y responsabilidad/interfaz esencial; evidencia o estado (identificado, propuesto o pendiente) visible; leyenda que explique colores y tipos de línea. Usa tamaños de nodo acordes al contenido, tipografía legible y espacio en blanco. Evita cajas muy altas por texto excesivo, texto que desborde, nodos solapados, conectores que atraviesen cajas, cruces innecesarios y etiquetas de conectores encimadas. Si una etiqueta larga perjudica la lectura, acórtala en el diagrama y explica el detalle en la respuesta.
10. Valida semántica y presentación antes de entregar: (a) revisa que todo nodo y flecha corresponda al inventario y evidencia; (b) verifica referencias, unicidad de IDs, jerarquía XML, geometrías y escapes; (c) abre/importa el archivo en diagrams.net y comprueba que se renderiza, que todo el contenido cabe en la página y que las relaciones son legibles. Corrige y repite la validación si falla. No declares validación visual si solo inspeccionaste el texto XML; si no puedes abrir diagrams.net, indica exactamente qué comprobación sí realizaste y qué queda sin validar.
11. Resume en la respuesta el alcance y las fuentes consultadas, los componentes identificados, las recomendaciones y las dudas. Incluye un enlace al archivo `.drawio` generado y distingue validación XML de validación visual.

## Criterios de modelado

- Separa claramente:
  - **Existente / identificado**: componente respaldado por una fuente del repositorio.
  - **Propuesto / recomendado**: componente sugerido para satisfacer un requisito o mitigar un riesgo; no implica que ya exista.
  - **Pendiente de confirmar**: elemento o relación cuyo estado no puede verificarse.
- Usa nombres y límites coherentes con el dominio y la arquitectura existente. Evita duplicar responsabilidades ya cubiertas por un componente.
- Incluye solo los detalles necesarios para entender el alcance; no conviertas el diagrama en un despliegue físico ni en un diagrama de clases salvo que se solicite.
- Cada recomendación debe vincularse a una necesidad, requisito, restricción o riesgo observado. Expón alternativas cuando haya opciones razonables con impactos distintos; no las presentes como decisiones ya aprobadas.
- No alteres código, contratos, infraestructura ni configuración del sistema como parte del diseño, salvo petición explícita y aprobada.
- No sobrescribas un diagrama existente sin revisar su contenido y conservar información vigente. Si el nombre de salida ya existe, actualízalo solo si corresponde al mismo alcance; de lo contrario, elige un nombre que evite reemplazarlo.
- No conviertas tecnologías citadas por el usuario en evidencia de módulos, despliegues o integraciones que el repositorio no confirma. Puedes reflejar las versiones declaradas por el usuario, identificándolas como tales.
- No dibujes una flecha de integración únicamente porque dos componentes aparecen juntos en el alcance. Si la relación es probable pero no está documentada, márcala visualmente como pendiente (por ejemplo, línea discontinua) y etiqueta qué debe confirmarse.
- No presentes servicios mock, contratos OpenAPI, datos de ejemplo ni endpoints documentados como componentes desplegados o productivos sin evidencia explícita.
- Prefiere etiquetas cortas y específicas. No pegues bloques de requisitos, listas largas de endpoints o narrativas dentro de las cajas; usa notas breves o sintetiza en el texto de respuesta.
- Mantén la relación entre estado y estilo constante en todo el diagrama. No uses el mismo estilo para componentes existentes y propuestos; las flechas pendientes deben diferenciarse de las integraciones comprobadas.

## Contenido de la respuesta

```text
Alcance: [sistema o funcionalidad]
Fuentes revisadas: [documentos, contratos o rutas relevantes]
Diagrama: [enlace al archivo .drawio]

Componentes identificados:
- [componente]: [responsabilidad y evidencia]

Componentes recomendados:
- [componente]: [necesidad que cubre, responsabilidad e impacto]
- Si no hay recomendaciones justificadas, indícalo explícitamente.

Relaciones o supuestos pendientes:
- [duda y cómo afecta al diseño, o "ninguno"]
```
