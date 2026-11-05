## Story
Como usuario, quiero que el orden en que se apilan las notas se conserve al recargar, para ver el tablero tal como lo dejé.

## Acceptance criteria
- [x] Dado que agarré varias notas por el asa en cierto orden (aunque no las moviera), cuando recargo la página, entonces están apiladas en ese mismo orden: la última que agarré queda encima de todas.
- [x] Dado que guardé una nota nueva, cuando recargo la página, entonces sigue encima de todas las demás (la nota nueva empieza encima).
- [x] Dado que hay notas que nunca agarré, cuando recargo la página, entonces conservan entre ellas el orden de la lista y quedan por debajo de las que sí agarré.

## Plan
- Backend: cada nota guarda su orden de apilado (vacío mientras no se haya agarrado) y el listado lo incluye.
- Backend: al actualizar la posición de una nota (lo que ocurre cada vez que se suelta tras agarrarla) y al crear una nota, el servidor le asigna un valor mayor que el de todas las demás; editar y eliminar no lo cambian. Documentado en Swagger.
- Frontend: el apilado en pantalla usa el valor guardado (las notas sin valor, por orden de lista, debajo); al soltar una nota usa el valor que devuelve el servidor, y la nota recién guardada usa el suyo. Sustituye al apilado temporal en memoria.
- Un fallo al guardar usa el aviso de posición que ya existe; no hay mensaje nuevo.

## Decisiones tomadas
- Una nota sube al frente cuando se agarra por el asa (aunque no se mueva) y ese cambio se guarda; una nota recién creada empieza encima de todas; editar, guardar, cancelar y eliminar no cambian el apilado.
- Se reutiliza la petición de posición, que ya se envía cada vez que se suelta una nota tras agarrarla: el servidor, al recibirla, la sube al frente. "Mover nota" pasa a significar "mover y subir al frente" y se documenta así en Swagger. No hay endpoint nuevo.
- Si falla guardar, se muestra el aviso de la posición ("No se pudo guardar la posición."), porque viaja en la misma petición. La nota se queda arriba en pantalla, pero al recargar volvería a su orden anterior.
- Las notas que nunca se agarraron no tienen valor guardado: mantienen entre ellas el orden de la lista y quedan por debajo de las que sí se agarraron.
- El apilado es compartido por quien abra el board, igual que las posiciones (un único usuario, sin login).

## Out of scope
- Botones "traer al frente" o "enviar al fondo" y cualquier reordenación manual.
- Sincronizar el apilado en tiempo real entre dispositivos.
- Renumerar o compactar los valores guardados.

## Suggestions (your call)
- La alternativa de un endpoint separado "subir al frente" evita cambiar el significado de "mover nota", pero añade una petición por arrastre. Reutilizar la petición de posición es lo más simple que cumple los criterios.
- Verificación manual: agarrar notas superpuestas en distinto orden, recargar y comprobar el apilado; comprobar con el backend parado que el aviso aparece y que al recargar vuelve el orden anterior.
