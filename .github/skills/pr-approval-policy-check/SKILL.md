---
name: pr-approval-policy-check
description: 'Valida aprobaciones de Pull Requests en bcp-ai-hackaton-grupo02 antes de recomendar un merge. Úsalo al revisar, aprobar o mergear un PR y cuando se solicite comprobar la política de aprobación.'
argument-hint: 'URL o número del Pull Request'
user-invocable: true
---

# Validación de aprobaciones de Pull Requests

## Objetivo

Comprobar que un Pull Request de `bcp-ai-hackaton-grupo02` cumple la política de aprobación antes de recomendar o intentar un merge:

- Debe tener al menos 2 aprobaciones válidas de revisores distintos.
- Al menos una de esas aprobaciones debe pertenecer al rol QA y Seguridad.

Este skill guía la validación; por sí solo no configura ni garantiza el bloqueo técnico de merges en GitHub.

## Cuándo usar

- El usuario solicita revisar si un Pull Request está listo para merge.
- El usuario solicita mergear un Pull Request.
- El usuario pide comprobar el número o la procedencia de las aprobaciones.

## Procedimiento

1. Obtén el número o URL del Pull Request. Si no se proporcionó, solicítalo.
2. Verifica que el PR pertenezca al repositorio `bcp-ai-hackaton-grupo02`. Si pertenece a otro repositorio, detén la validación e informa que este skill no aplica.
3. Consulta mediante las herramientas de GitHub disponibles los metadatos del PR y sus revisiones actuales. No deduzcas aprobaciones a partir de comentarios, asignaciones o solicitudes de revisión.
4. Cuenta solo la revisión más reciente de cada revisor. Una revisión cuenta como aprobación válida únicamente si su estado actual es `APPROVED`; no cuentes revisiones descartadas, sustituidas por una revisión posterior o cuya vigencia no puedas verificar.
5. Inspecciona también las observaciones de revisión de código asociadas al PR, incluidos los comentarios de revisión y las revisiones con solicitud de cambios. No confundas comentarios generales del PR con observaciones de revisión de código.
6. Comprueba que existan al menos 2 aprobaciones válidas de cuentas revisoras distintas.
7. Verifica si al menos una de esas cuentas corresponde al rol QA y Seguridad. Usa solo una fuente autorizada y verificable, como la pertenencia a un equipo de GitHub o una asignación de rol documentada para este repositorio.
8. Si no existe una fuente verificable para identificar el rol QA y Seguridad, considera esa condición **no verificada**. No infieras el rol por el nombre, cargo aparente, historial o comentarios de una persona.
9. Informa el resultado con la evidencia consultada, las condiciones cumplidas y las pendientes.
10. Si el usuario pidió mergear, no invoques una herramienta de merge a menos que todas las condiciones estén verificadas y el usuario haya solicitado explícitamente la operación. Si hay una observación de revisión de código, alguna condición falla o no puede comprobarse, no intentes el merge.

## Criterio de decisión

- **Cumple**: hay al menos 2 aprobaciones válidas de revisores distintos y una pertenece al rol QA y Seguridad verificado. Puedes indicar que el PR cumple la política revisada. No afirmes que GitHub garantiza el bloqueo o que el PR está listo en otros aspectos no evaluados.
- **No cumple**: hay menos de 2 aprobaciones válidas o no hay una aprobación verificada del rol QA y Seguridad. No recomiendes ni intentes mergear. Indica qué aprobación hace falta.
- **Rechazado**: existe al menos una observación de revisión de código en el PR. Rechaza el PR para efectos de esta política, no lo apruebes ni lo recomiendes para merge, aunque cumpla los requisitos de aprobaciones. Informa las observaciones encontradas como evidencia.
- **No verificable**: faltan permisos, las herramientas no exponen las revisiones o la pertenencia al rol no está configurada/documentada. No recomiendes ni intentes mergear; especifica qué acceso o dato hace falta.

El criterio **Rechazado** prevalece sobre **Cumple**: una observación de revisión de código impide aprobar el PR.

## Manejo de errores y límites

- Si las herramientas de GitHub no están disponibles o devuelven información incompleta, dilo explícitamente y no presentes el resultado como verificado.
- No inventes el estado de revisiones, identidades, pertenencia a equipos ni configuración de protección de ramas.
- No cambies configuración del repositorio, equipos, permisos ni reglas de protección.
- No apruebes el PR en nombre de un revisor ni alteres sus revisiones.
- Si existe una observación de revisión de código, no apruebes el PR bajo ninguna circunstancia dentro de esta validación.
- No ejecutes un merge automáticamente. Solo considera hacerlo ante una solicitud explícita y después de verificar todas las condiciones; si hay observaciones, o el rol o las aprobaciones no se pueden verificar, detente.
- Limita este procedimiento a Pull Requests del repositorio `bcp-ai-hackaton-grupo02`.

## Enforcement en GitHub

Las instrucciones de este skill no bloquean por sí mismas un merge. Para exigir la política técnicamente, un administrador debe configurar reglas de protección de rama o un ruleset que requiera al menos 2 aprobaciones y, además, una aprobación de un miembro identificable del rol QA y Seguridad. La configuración concreta del rol queda pendiente hasta que el equipo defina cómo se representa y verifica en GitHub.

## Formato de respuesta

Resume cada validación así:

```text
Pull Request: [número y título]
Repositorio: [propietario/repositorio]
Resultado: CUMPLE | NO CUMPLE | RECHAZADO | NO VERIFICABLE
Aprobaciones válidas: [cantidad] de 2 requeridas
QA y Seguridad: VERIFICADO | FALTA | NO VERIFICABLE
Observaciones de revisión de código: [ninguna / detalle]
Pendiente: [condición, dato o acceso necesario]
Merge: [no recomendado / no intentado / cumple la política revisada]
Evidencia: [estado de revisiones y fuente usada para verificar el rol]
```