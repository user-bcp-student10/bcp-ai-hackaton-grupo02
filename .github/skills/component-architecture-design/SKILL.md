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
6. Genera un archivo `.drawio` válido y editable con la arquitectura. Guarda el entregable por defecto en `docs/architecture/diagrams/<alcance>-componentes.drawio`, creando solo los directorios necesarios. Usa un nombre de archivo breve, descriptivo y seguro.
7. Asegúrate de que el archivo use el formato XML de diagrams.net (`mxfile` con uno o más `diagram` y un modelo `mxGraphModel`), tenga nodos para los componentes y conectores para las relaciones, y se pueda abrir como diagrama editable. Agrupa o estiliza de forma consistente los componentes identificados y las recomendaciones, con una leyenda visible que los diferencie.
8. Resume en la respuesta el alcance y las fuentes consultadas, los componentes existentes, las recomendaciones y las dudas. Incluye un enlace al archivo `.drawio` generado. Si no fue posible validar alguna relación o componente, indícalo explícitamente.

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
