## Story
Como usuario, quiero ver un mensaje claro cuando algo falla al cargar o guardar mis notas, para saber qué pasó y no creer que mi nota se guardó cuando no fue así.

## Acceptance criteria
- [ ] Dado que el servidor no responde o devuelve un error, cuando abro el board, entonces veo el mensaje "No se pudieron cargar las notas." y el formulario sigue visible (la pantalla no queda en blanco).
- [ ] Dado que el servidor no responde o devuelve un error, cuando confirmo una nota, entonces veo el mensaje "No se pudo guardar la nota.", no aparece ninguna nota nueva en el board y el título y el texto que escribí siguen en el formulario.
- [ ] Dado que se mostró el mensaje "No se pudo guardar la nota.", cuando confirmo la nota otra vez y funciona, entonces el mensaje desaparece y la nota aparece en el board.

## Plan
- Frontend: al cargar las notas, si la respuesta no es correcta o la petición falla, se muestra el mensaje de carga en español y el board queda vacío en vez de romperse.
- Frontend: al guardar, solo se agrega la nota al board si el servidor la confirmó; si falla, se muestra el mensaje de guardado y el formulario conserva lo escrito.
- Frontend: el mensaje de guardado se limpia cuando un guardado posterior sale bien. El mensaje de carga se mantiene hasta recargar la página, porque sigue siendo cierto que las notas no se cargaron.

## Out of scope
- Botón de reintentar, reintentos automáticos o notificaciones emergentes.
- Mensaje cuando el título está vacío (hoy simplemente no se crea; criterio 3 de la historia #1).
- Distinguir tipos de error (red, 400, 500) con mensajes distintos.
- Cambios en el backend.

## Suggestions (your call)
- Ninguna por ahora. La dependencia con la historia #5 ya se cumple: el estado "enviando" existe y el manejo de error lo reutiliza.
