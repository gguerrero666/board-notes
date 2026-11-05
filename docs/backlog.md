## Context
Board online personal para agregar, editar, eliminar y acomodar notas libremente, para un único usuario sin login. Las notas tienen título y texto, con color y tamaño fijos.
Stack: Backend Java + Spring Boot con H2 · Frontend React con Vite
Expensive decisions: ninguna

## Backlog
1. [x] Como usuario, quiero agregar una nota con título y texto al board y verla al volver a abrirlo, para no perder lo que anoté. (ver [plan.md](planes/plan.md)) (hecha)
2. [x] Como usuario, quiero editar el título y el texto de una nota, para corregirla o actualizarla. Requires: #1 (ver [plan-editar.md](planes/plan-editar.md)) (hecha)
3. [x] Como usuario, quiero eliminar una nota, para quitar lo que ya no necesito. Requires: #1 (ver [plan-eliminar.md](planes/plan-eliminar.md)) (hecha)
4. [x] Como usuario, quiero arrastrar una nota a cualquier lugar del board y que se quede ahí al recargar, para organizar mis notas a mi manera. Requires: #1 (ver [plan-arrastrar.md](planes/plan-arrastrar.md)) (hecha, incluye arrastre táctil)
5. [x] Como usuario, quiero que el board guarde y muestre mis notas de forma confiable (sin duplicados, en el mismo orden y sin que se pisen entre sí), para no perder ni mezclar lo que anoté. Requires: #1 (ver [plan-endurecimiento.md](planes/plan-endurecimiento.md)) (hecha)
6. [x] Como usuario, quiero ver un mensaje claro cuando algo falla al cargar o guardar mis notas, para saber qué pasó y no creer que mi nota se guardó cuando no fue así. Requires: #1, #5 (ver [plan-errores.md](planes/plan-errores.md)) (hecha)
7. [x] Como usuario, quiero agregar una nota pulsando un botón "+" flotante y escribir su título y texto directamente sobre la nota nueva en el board, para crear notas sin salir del tablero. Requires: #1, #2 (ver [plan-agregar.md](planes/plan-agregar.md)) (hecha)
8. [x] Como usuario, quiero que el formulario de agregar nota desaparezca y que el board ocupe ese espacio, para ver más notas a la vez. Requires: #7 (ver [plan-quitar-formulario.md](planes/plan-quitar-formulario.md)) (hecha)
9. [x] Como usuario, quiero que el orden en que se apilan las notas se conserve al recargar, para ver el tablero tal como lo dejé. Requires: #4, #7 (ver [plan-apilado.md](planes/plan-apilado.md)) (hecha)

## Pendientes (sin historia)
Mejoras o decisiones detectadas durante el desarrollo que todavía no son historias. Si alguna se aborda, se refina con `/story`.

- **Accesibilidad con teclado:** devolver el foco a donde estaba tras abrir y cerrar una acción (editar, borrar, nota en blanco), y atajos Enter (guardar) y Esc (cancelar). Hoy el asa de arrastre es solo para puntero y los atajos están fuera de alcance en los planes de #3, #2, #7 y #8.
- **Board con su propio desplazamiento horizontal:** hoy la etiqueta viewport lleva `minimum-scale=1` para que el botón "+" quede en la esquina del móvil (se pierde alejar el zoom con dos dedos). Con un contenedor propio para el desplazamiento horizontal se podría volver a permitir. Obliga a tocar el arrastre (lectura del scroll horizontal) y los tests de ese eje.
- **`DELETE` con 404 como éxito:** si la nota ya no existe en el servidor (por ejemplo, la borraste desde otro dispositivo), hoy se muestra "No se pudo eliminar la nota." y la nota se queda; decisión del plan de #3. Alternativa: quitarla de la pantalla sin aviso.
- **Extraer el arrastre de `App.jsx` a un hook `useNoteDrag`:** son unas 80 líneas (el inicio del arrastre y su `useEffect`) más las funciones de posición. Refactor, sin cambios de comportamiento.
- **Movimiento suave y `prefers-reduced-motion`:** el desplazamiento hasta la nota en blanco (`scrollIntoView` suave) no respeta la preferencia de movimiento reducido del sistema.
- **Apilado: asignar el siguiente `z` de forma atómica:** hoy el servidor calcula "el mayor existente + 1" en una consulta y guarda en otra, sin transacción ni bloqueo (`nextZ()` en el controlador). Dos soltados exactamente simultáneos (por ejemplo, desde dos pestañas) podrían recibir el mismo `z`. Se puede resolver con una sola sentencia de actualización que lo calcule, o una secuencia. Además, subir la nota solo si no es ya la de arriba evitaría que el `z` crezca con cada clic en la nota superior, y el entero tardaría mucho más en desbordarse. Con un único usuario no se nota; relevante si hubiera varios clientes a la vez.
