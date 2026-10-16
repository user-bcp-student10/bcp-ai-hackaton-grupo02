## SPEC.MD

Trabaja sobre la rama actual.
No crees ni cambies de rama.

Usa # como contexto de lo que se necesita realizar

Trabaja con OpenSpec y el schema estándar spec-driven configurado en este repositorio.

Crea una propuesta OpenSpec para este cambio y materializa:
- proposal.md;
- las specs necesarias bajo openspec/changes/<change>/specs/.

La propuesta debe:
- referenciar el Issue;
- explicar por qué importa el cambio;
- separar alcance y fuera de alcance;
- identificar comportamiento que debe preservarse;
- definir requisitos verificables y escenarios observables.

No diseñes todavía la implementación técnica.
No crees tasks.md todavía.
No modifiques código funcional.


----------------------------------------
##  DESIGN.MD

No leas ni modifiques los otros repositorios del workspace.
Todos los comandos, lecturas, cambios y operaciones Git/GitHub de este paso deben referirse únicamente a este repositorio.

Trabaja sobre la rama actual. No crees ni cambies a otra rama.

Trabaja sobre el cambio OpenSpec add-w0-registration-login ya aprobado.
Lee proposal.md y specs/ antes de proponer cualquier diseño.

Crea o completa:
openspec/changes/add-w0-registration-login/design.md

El design debe incluir:
- contexto técnico relevante;
- goals / non-goals;
- contratos protegidos;
- componentes afectados;
- decisiones técnicas y alternativas consideradas;
- estrategia incremental;
- pruebas de caracterización necesarias antes de modificar comportamiento crítico;
- riesgos / trade-offs;
- rollback cuando aplique.

No implementes código funcional.
No rediseñes toda la aplicación.


-----

## TASK.MD

Trabaja únicamente en este repositorio
No leas ni modifiques los otros repositorios del workspace.
Todos los comandos, lecturas, cambios y operaciones Git/GitHub de este paso deben referirse únicamente a este repositorio.

Continúa sobre la rama actual . No crees ni cambies de rama.

Usa proposal.md, specs/ y design.md ya aprobados del cambio OpenSpec add-w0-registration-login.

Genera o completa:
openspec/changes/add-w0-registration-login/tasks.md

Las tareas deben:
- estar dentro del alcance del GitHub Issue;
- ser pequeñas y verificables;
- comenzar por las pruebas de caracterización necesarias antes del cambio funcional;
- incluir la implementación incremental;
- incluir pruebas/validaciones relevantes;
- evitar trabajo secundario no aprobado.

El GitHub Issue sigue siendo la unidad de trabajo del producto. tasks.md es el checklist de implementación de este cambio OpenSpec.

No implementes todavía el cambio funcional.