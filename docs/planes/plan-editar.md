## Story
Como usuario, quiero editar el título y el texto de una nota, para corregirla o actualizarla.

## Acceptance criteria
- [x] Dado que tengo una nota en el board, cuando pulso el icono de editar (lápiz), cambio el título y/o el texto y pulso "Guardar", entonces la nota muestra los valores nuevos, sigue en el mismo lugar del board y, al recargar la página, conserva los cambios.
- [x] Dado que estoy editando una nota, cuando dejo el título vacío (o solo espacios) y pulso "Guardar", entonces no se guarda nada y la nota sigue en modo edición con lo que escribí.
- [x] Dado que estoy editando una nota, cuando pulso "Cancelar", entonces la nota vuelve a mostrar el título y el texto que tenía antes.

## Plan
- Backend: un endpoint para actualizar solo el título y el texto de una nota, con las mismas reglas del alta (título obligatorio, máximo 100; texto opcional, máximo 1000; título recortado), 404 si la nota no existe, y documentado en Swagger. No toca la posición.
- Frontend: cada nota muestra un icono de lápiz que la pasa a modo edición in situ, con el título y el texto como campos precargados y los botones "Guardar" y "Cancelar" (en texto).
- Frontend: "Guardar" envía los cambios y, cuando el servidor los confirma, la nota vuelve a modo lectura con los valores nuevos; con el título vacío no se envía nada.
- Frontend: si falla guardar, se muestra el mensaje "No se pudieron guardar los cambios.", la nota sigue en modo edición con lo escrito y el mensaje desaparece en el siguiente guardado exitoso (mismo mecanismo de la historia #6).

## Decisiones tomadas
- Se entra a la edición con un icono de lápiz (SVG propio, sin librerías de iconos), con nombre accesible "Editar nota". Se coloca en la esquina inferior derecha de la nota, fuera del asa de arrastre.
- La edición ocurre dentro de la misma nota; el texto largo se desplaza dentro del campo.
- "Guardar" y "Cancelar" son botones de texto.
- Mensaje de fallo propio: "No se pudieron guardar los cambios." (distinto del de crear una nota).

## Out of scope
- Eliminar notas (historia #3).
- Atajos de teclado (Esc para cancelar, Enter para guardar) y deshacer.
- Resolver ediciones simultáneas desde dos dispositivos.
- Cambiar color o tamaño de la nota (siguen fijos).
- Editar varias notas a la vez.

## Suggestions (your call)
- Ahora hay una señal concreta para evitar que dos operaciones se pisen: hoy mover una nota guarda la fila entera, así que un movimiento y una edición casi simultáneos podrían deshacerse mutuamente. Conviene que cada endpoint actualice solo sus propias columnas (posición por un lado, título y texto por otro). Salió en el review.
- La edición usa exactamente las mismas reglas que el alta; en el backend se puede reutilizar el mismo objeto de entrada para crear y editar, en vez de duplicar las validaciones.
- `App.jsx` ya concentra el formulario, el arrastre y los mensajes, y la edición añadiría estado por nota. Es el momento razonable de extraer un componente `Note`, pero como refactor aparte, después de que los tests estén en verde y no mezclado con la funcionalidad.
- Verificación manual: que el icono se vea bien con el tema oscuro, que el área para pulsarlo sea cómoda con el dedo (unos 44 px) y que no inicie ni interfiera con el arrastre.
