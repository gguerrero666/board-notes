## Story
Como usuario, quiero arrastrar una nota a cualquier lugar del board y que se quede ahí al recargar, para organizar mis notas a mi manera.

## Acceptance criteria
- [x] Dado que tengo notas en el board, cuando arrastro una nota con el ratón y la suelto, entonces se queda en el lugar donde la solté, sin salirse por los bordes superior e izquierdo del board.
- [x] Dado que moví una o más notas, cuando recargo la página o vuelvo a abrir el board, entonces cada nota aparece en la posición donde la dejé.
- [x] Dado que hay notas que nunca moví (nuevas o anteriores), cuando abro el board, entonces las veo en posiciones iniciales ordenadas, sin quedar todas apiladas en el mismo punto.

### Ampliación: dispositivos móviles (táctil)
- [x] Dado que uso un dispositivo táctil o el ratón, cuando arrastro una nota desde su asa y la suelto, entonces se queda donde la solté y se guarda igual que antes; y cuando arrastro desde cualquier otra parte de la nota, la nota no se mueve y la página se desplaza con normalidad.
- [x] Dado que estoy arrastrando una nota con un dedo, cuando apoyo un segundo dedo (sobre esa u otra nota), entonces se ignora y la nota sigue únicamente al primer dedo.
- [x] Dado que tengo notas sin mover, cuando giro el dispositivo o cambio el tamaño de la ventana, entonces se reacomodan en las columnas que caben en el nuevo ancho; las notas que ya moví no cambian de lugar.

## Plan
- Backend: cada nota guarda su posición (horizontal y vertical); las notas que nunca se movieron no tienen posición. El listado la incluye. *(hecho)*
- Backend: un endpoint para actualizar solo la posición de una nota, con validación de rango (0 a 100000), y documentado en Swagger. *(hecho)*
- Frontend: el board es una zona libre donde cada nota se coloca por su posición; las que no tienen posición reciben una inicial en cuadrícula según su orden y el ancho disponible. *(hecho)*
- Frontend: al arrastrar una nota se mueve en pantalla, y al soltarla se guarda su posición; la nota arrastrada queda encima de las demás. Si falla guardar, se muestra "No se pudo guardar la posición.". *(hecho)*
- Frontend (ampliación, hecho): cada nota tiene un asa visible; solo desde el asa se arrastra, y solo el asa bloquea el gesto del navegador, de modo que el resto de la nota deja desplazar la página con el dedo.
- Frontend (ampliación, hecho): el arrastre sigue a un único puntero; un segundo dedo se ignora.
- Frontend (ampliación, hecho): al cambiar el tamaño de la ventana o girar el dispositivo se vuelve a medir el ancho del board y se recolocan las notas sin posición guardada.

## Decisiones tomadas
- El board es la zona libre bajo el formulario: crece hacia abajo y a la derecha según las notas; no se puede arrastrar fuera del borde superior ni del izquierdo (coordenadas nunca negativas), ni pasar de 100000 en cada eje.
- Las notas sin posición guardada (nuevas o anteriores) aparecen en una cuadrícula inicial según su orden, y no se guarda hasta que el usuario la mueve.
- Las notas pueden superponerse; la que se acaba de mover queda encima.
- Si falla guardar la posición, se avisa con un mensaje (mismo mecanismo de la historia #6) y la nota se queda donde se soltó.
- Táctil (ampliación): se arrastra desde un asa (opción B), no desde toda la nota. Esto cambia también el uso con ratón. Un segundo dedo se ignora. Girar el móvil recoloca las notas sin mover.
- Como el arrastre sale del asa, el texto de la nota vuelve a poder seleccionarse y copiarse.

## Out of scope
- Ajustar al cuadriculado (snap), alinear o reordenar automáticamente.
- Cambiar color o tamaño de las notas (siguen fijos).
- Editar o eliminar notas (historias #2 y #3).
- Mover varias notas a la vez.
- Gestos de varios dedos (pellizcar para hacer zoom, etc.).

## Suggestions (your call)
- La historia #2 (editar) también necesitará actualizar una nota. Conviene que el endpoint de posición siga siendo independiente del de edición, para que mover una nota nunca pueda pisar título ni texto.
- Los criterios de la ampliación suman 6 en total. Si lo prefieres, la ampliación se puede tratar como una historia aparte (#4b) en el backlog.
- Comportamientos que dependen del navegador del móvil (gesto de desplazamiento, pulsación larga, giro real) no se pueden probar en los tests automáticos; van como verificación manual.
