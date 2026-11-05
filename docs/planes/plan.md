## Story
Como usuario, quiero agregar una nota con título y texto al board y verla al volver a abrirlo, para no perder lo que anoté.

## Acceptance criteria
- [ ] Dado que abro el board, cuando escribo un título y un texto y confirmo, entonces la nota aparece en el board mostrando ambos.
- [ ] Dado que agregué notas, cuando recargo la página o vuelvo a abrir el board, entonces veo todas mis notas con su título y texto.
- [ ] Dado que dejo el título vacío, cuando intento confirmar, entonces la nota no se crea. (El texto es opcional.)

## Plan
- Backend: proyecto Spring Boot con H2 guardado en archivo (no en memoria), para que las notas sigan ahí después de reiniciar.
- Backend: una nota con título y texto, y dos endpoints: uno para crearla y otro para listar todas.
- Frontend: proyecto React con Vite que carga las notas al abrir y las muestra en el board con color y tamaño fijos.
- Frontend: un formulario simple con título y texto que crea la nota y la agrega al board sin recargar.
- Las notas nuevas aparecen en una posición inicial fija; moverlas queda para la historia #4.

## Out of scope
- Editar, eliminar o arrastrar notas (historias #2, #3 y #4).
- Guardar posiciones.
- Login o usuarios.

## Suggestions (your call)
- Configurar el proxy de Vite hacia el backend, para no tener que lidiar con CORS en desarrollo.
