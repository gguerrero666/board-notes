## Story
Como usuario, quiero agregar una nota pulsando un botón "+" flotante y escribir su título y texto directamente sobre la nota nueva en el board, para crear notas sin salir del tablero.

## Acceptance criteria
- [x] Dado que estoy en el board, cuando pulso el botón "+", entonces aparece una nota en blanco en el siguiente hueco de la cuadrícula, en modo edición con los campos de título y texto y los botones "Guardar" y "Cancelar", y la página se desplaza hasta ella.
- [x] Dado que hay una nota en blanco, cuando escribo un título (y opcionalmente un texto) y pulso "Guardar", entonces la nota se crea, muestra el título y el texto como cualquier otra nota y, al recargar la página, sigue ahí.
- [x] Dado que hay una nota en blanco, cuando pulso "Cancelar", entonces la nota desaparece sin crear nada; y cuando pulso "Guardar" con el título vacío (o solo espacios), entonces no se crea nada y la nota sigue en edición con lo que escribí.
- [x] Dado que el servidor falla al guardar la nota nueva, cuando pulso "Guardar", entonces veo el mensaje "No se pudo guardar la nota.", la nota sigue en edición con lo que escribí y el mensaje desaparece en el siguiente guardado exitoso.

## Plan
- Frontend: un botón "+" flotante, fijo en la esquina inferior derecha de la pantalla; al pulsarlo aparece una nota en blanco en el siguiente hueco de la cuadrícula, en modo edición, con el título enfocado, y la página se desplaza hasta ella.
- Frontend: "Guardar" con título envía la creación y, cuando el servidor la confirma, la nota pasa a ser una nota normal; con el título vacío no se envía nada; "Cancelar" la descarta sin tocar el servidor.
- Frontend: si falla, se muestra el aviso que ya existe para el alta y la nota sigue en edición con lo escrito.
- Frontend: mientras hay una nota en blanco, el "+" y los iconos de las demás notas están deshabilitados, la nota en blanco no se puede arrastrar y, mientras se guarda, sus botones también están deshabilitados.
- Backend: sin cambios.

## Decisiones tomadas
- El botón "+" es flotante, fijo en la esquina inferior derecha de la pantalla (visible aunque se desplace la página y cómodo con el dedo).
- La nota en blanco aparece en el siguiente hueco de la cuadrícula (donde se coloca hoy una nota nueva, sin posición guardada) y la página se desplaza sola hasta ella.
- El campo de título recibe el foco al aparecer la nota en blanco.
- La nota en blanco no se puede arrastrar hasta que se guarde, porque todavía no existe en el servidor.
- Solo se crea en el servidor al pulsar "Guardar" con título; "Cancelar" la descarta sin dejar rastro. Texto opcional y mismos límites (100 y 1000).
- Mientras haya una acción abierta (editar, confirmar un borrado o la nota en blanco), el "+" y los iconos de las demás notas están deshabilitados.
- El formulario de arriba se mantiene hasta la historia #8; durante ese tiempo conviven las dos formas de agregar.
- Los avisos de error del alta se mantienen ("No se pudo guardar la nota.").

- Mientras existe la nota en blanco, ninguna nota se puede arrastrar (ni la nueva ni las demás) hasta guardar o cancelar. *(añadido tras la verificación manual)*
- En el móvil, la etiqueta viewport lleva `minimum-scale=1` para que el botón flotante quede en la esquina de la pantalla aunque haya notas lejos a la derecha. *(añadido tras la verificación manual)*

## Out of scope
- Retirar el formulario de arriba y liberar su espacio (historia #8).
- Crear varias notas en blanco a la vez.
- Elegir la posición de la nota al crearla (aparece en el siguiente hueco; luego se arrastra como cualquier otra).
- Atajos de teclado (Enter, Esc) y cambiar color o tamaño.

## Suggestions (your call)
- La nota en blanco puede reutilizar el modo de edición de `Note`, con los mismos campos y límites (100 y 1000), porque ya existe; solo cambia lo que hace "Guardar" (crear en vez de actualizar). Así no se duplica la interfaz de edición.
- Verificación manual: que el botón flotante no tape los iconos de las notas de abajo, que el desplazamiento hasta la nota nueva se sienta natural y que el teclado del móvil no oculte los campos.
