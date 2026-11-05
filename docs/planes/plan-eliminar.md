## Story
Como usuario, quiero eliminar una nota, para quitar lo que ya no necesito.

## Acceptance criteria
- [x] Dado que tengo una nota en el board, cuando pulso el icono de papelera y confirmo, entonces la nota desaparece del board, no vuelve al recargar la página y las demás notas conservan su título, su texto y su posición.
- [x] Dado que pulsé el icono de papelera, cuando pulso "Cancelar" en la confirmación, entonces la nota sigue igual en el board.
- [x] Dado que el servidor falla al eliminar, cuando confirmo la eliminación, entonces la nota sigue en el board, veo el mensaje "No se pudo eliminar la nota." y el mensaje desaparece en el siguiente borrado exitoso.

## Plan
- Backend: un endpoint para eliminar una nota por su identificador, que responde sin contenido si se eliminó y 404 si no existe, y documentado en Swagger. No toca las demás notas.
- Frontend: cada nota muestra un icono de papelera (abajo a la izquierda); al pulsarlo, la nota pasa a una confirmación "¿Eliminar esta nota?" con "Eliminar" y "Cancelar".
- Frontend: "Eliminar" borra la nota del servidor y, cuando este lo confirma, la quita del board; si falla, la nota se queda y se muestra el mensaje.
- Frontend: mientras una nota se edita o está en confirmación de borrado, los iconos de las demás notas (lápiz y papelera) están deshabilitados; mientras se elimina, los botones de la confirmación también, para no enviar dos veces.

## Decisiones tomadas
- La confirmación es dentro de la misma nota (no el cuadro nativo del navegador ni borrado directo).
- Icono de papelera (SVG propio, sin librerías), con nombre accesible "Eliminar nota", en la esquina inferior izquierda; el lápiz sigue abajo a la derecha.
- Si falla eliminar: mensaje "No se pudo eliminar la nota.", propio de esta acción, que se limpia en el siguiente borrado exitoso.
- Si la nota ya no existe en el servidor, el `DELETE` devuelve 404 (como el `PUT` y el `PATCH`) y en la interfaz se ve el mensaje de fallo.
- Las notas que nunca se movieron ocupan el hueco de la cuadrícula inicial al eliminarse una anterior (por su orden); las que ya se movieron no cambian de lugar.

## Out of scope
- Deshacer o papelera de reciclaje.
- Eliminar varias notas a la vez o vaciar el board.
- Atajos de teclado (Supr, Esc).
- Reordenar las notas que no se movieron: simplemente ocupan el hueco por su orden.

## Suggestions (your call)
- Con la confirmación, `Note` pasa a tener tres modos (lectura, edición, confirmación de borrado) y `App` guarda hoy `editingId`. Conviene un único estado "nota activa" con su modo, en vez de dos ids paralelos; lo propongo como parte de la implementación, sin sumar una abstracción.
- Verificación manual: que la papelera y el lápiz se distingan bien con el dedo (unos 44 px) y no se confundan, y que la confirmación quepa bien en la nota de 220×220.
