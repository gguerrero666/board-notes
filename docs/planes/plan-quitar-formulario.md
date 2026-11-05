## Story
Como usuario, quiero que el formulario de agregar nota desaparezca y que el board ocupe ese espacio, para ver más notas a la vez.

## Acceptance criteria
- [x] Dado que abro el board, entonces ya no veo el formulario de título y texto ni su botón "Agregar"; la forma de agregar una nota es el botón "+".
- [x] Dado que abro el board, entonces el board empieza en la parte superior de la página, donde estaba el formulario, y la primera fila de notas aparece ahí.
- [x] Dado que el servidor falla al cargar las notas, cuando abro el board, entonces veo el mensaje "No se pudieron cargar las notas." y el botón "+" sigue visible (la pantalla no queda en blanco).

## Plan
- Frontend: quitar el formulario de arriba y todo lo que solo existía para él (los campos, el estado de envío, la función de alta antigua y sus estilos); el alta queda únicamente con el botón "+".
- Frontend: reducir el margen superior de la página para que el board empiece arriba; las notas con posición guardada conservan su posición dentro del board.
- Frontend: el aviso "No se pudo guardar la nota." se mantiene, ahora solo para la nota en blanco.
- Tests: se eliminan los 8 tests del formulario (con equivalente en los de la historia #7) y se adaptan 3.
- Backend: sin cambios.

## Tests afectados (aprobados)
Se eliminan (8), cada uno con su equivalente ya cubierto por la nota en blanco (#7):
- al escribir título y texto y confirmar, la nota aparece en el board sin recargar
- con el título vacío, al confirmar no se llama al backend y no aparece nota
- dos clics seguidos en Agregar envían un solo POST y crean una sola nota
- mientras la nota se está enviando, el botón Agregar está deshabilitado
- los campos del formulario limitan el título a 100 y el texto a 1000 caracteres
- si el guardado falla por red, se muestra el mensaje, no aparece ninguna nota y el formulario conserva lo escrito
- si el servidor responde con error al guardar, se muestra el mensaje, no aparece ninguna nota y el formulario conserva lo escrito
- después de un error al guardar, al confirmar otra vez y funcionar, el mensaje desaparece y la nota aparece

Se adaptan (3), cambiando el formulario por el botón "+":
- si la petición de carga falla por red, se muestra el mensaje y el formulario sigue visible → el botón "+" sigue visible
- si el servidor responde con error al cargar, se muestra el mensaje y el formulario sigue visible → el botón "+" sigue visible
- si la carga falló, un guardado exitoso posterior no borra el mensaje de carga → el guardado se hace con la nota en blanco

## Decisiones tomadas
- Las notas con posición guardada suben en pantalla lo que ocupaba el formulario, porque su posición es relativa al board y no a la página. No se migra nada.
- Con el tablero vacío no se muestra ningún mensaje de guía: solo el botón "+".
- El board ocupa toda la ventana, sin ancho máximo ni margen arriba ni a los lados: `x = 0` e `y = 0` son los bordes de la pantalla. La regla de coordenadas ≥ 0 se mantiene (una posición negativa quedaría fuera de la vista). *(añadido tras la verificación manual)*

## Out of scope
- Mensaje de guía cuando no hay notas.
- Cambiar las posiciones guardadas o migrar datos.
- Accesibilidad con teclado y atajos.

## Suggestions (your call)
- Una vez retirado el formulario, `saveError` queda con un único origen (la nota en blanco), así que el aviso deja de poder borrarse por una acción del otro formulario, que era un hallazgo de la revisión anterior.
- Verificación manual: cómo se ve el tablero con y sin notas, que la primera fila no quede pegada al borde de la ventana ni bajo el aviso fijo, y que las notas ya colocadas se vean razonablemente tras subir.
