# Board de notas

## Contexto
Board online personal para agregar, editar, eliminar y acomodar notas libremente (arrastrar a cualquier posición; las posiciones se guardan). Un único usuario, sin login por ahora.

Cada nota tiene título y texto. Color y tamaño son fijos por ahora.

## Stack
- `backend/`: Java + Spring Boot, base de datos H2
- `frontend/`: React con Vite

## Decisiones caras de cambiar
Ninguna aplica por ahora:
- Un solo usuario (sin multi-organización ni roles/permisos)
- Sin modo offline
- Interfaz solo en español

## Decisiones de diseño
- Límites: título obligatorio de hasta 100 caracteres y texto opcional de hasta 1000. Están en tres sitios que hay que mantener juntos: validación del backend, longitud de las columnas y `maxLength` del formulario.
- El `id` nunca lo fija el cliente: la creación recibe solo `title` y `text` (`NewNoteRequest`), nunca la entidad. El título se guarda recortado.
- El listado se devuelve ordenado por `id` ascendente (de la más antigua a la más reciente).
- Posición de las notas: `x` e `y` enteros en píxeles, entre 0 y 100000 (mismo límite en el backend, `@Max`, y en el arrastre del frontend). Son nulas mientras la nota no se haya movido; se actualizan solo con `PATCH /api/notes/{id}/position`, que no toca título ni texto.
- El board ocupa toda la ventana, sin ancho máximo ni márgenes arriba ni a los lados (solo un margen inferior para el botón "+"): `x = 0` e `y = 0` son los bordes de la pantalla. Las posiciones guardadas son relativas al board, así que cambiar su maquetación desplaza las notas en pantalla sin migrar datos.
- Las notas sin posición guardada se colocan en una cuadrícula por orden de lista, con tantas columnas como quepan al abrir el board (mínimo 1). No se guarda hasta que se mueven. Pueden superponerse; el orden de apilado se guarda (ver el punto de apilado).
- Arrastre (ratón y táctil): solo desde el asa de la nota (franja superior); `touch-action: none` está únicamente en el asa, así que el resto de la nota deja desplazar la página con el dedo. Se sigue a un único puntero (un segundo dedo se ignora). Cerca de los bordes de la ventana la página se desplaza mientras se mueve el puntero. Si falla guardar la posición, la nota se queda donde se soltó y se avisa con "No se pudo guardar la posición.".
- Al cambiar el tamaño de la ventana o girar el dispositivo se vuelve a medir el board y se recolocan las notas sin posición guardada (las movidas no cambian).
- Edición: `PUT /api/notes/{id}` reemplaza título y texto (mismas reglas del alta, mismo objeto de entrada; si no viene texto, queda vacío) y no toca la posición. `Note` usa `@DynamicUpdate` para que mover y editar al mismo tiempo no se pisen. En la interfaz se edita dentro de la nota con el icono de lápiz (solo una nota a la vez), con "Guardar" y "Cancelar"; con título vacío no se guarda.
- Apilado: cada nota tiene `z` (entero, nulo si nunca se agarró). El servidor lo asigna como *el mayor existente + 1* al crear una nota y al actualizar su posición (`PATCH /position`, que se envía cada vez que se suelta una nota tras agarrarla, aunque no se mueva); editar y eliminar no lo cambian. Las notas sin `z` quedan debajo, por orden de lista. En pantalla, al agarrar una nota recibe al instante un `z` local mayor que el máximo y, al soltar, se queda con el mayor entre el local y el que devuelve el servidor (una respuesta tardía o antigua nunca baja el apilado); de esa respuesta solo se toma el `z`, nunca `x` ni `y`. La nota en blanco se muestra por encima de todas mientras no tiene `z`. Si falla guardar, la nota se queda arriba en pantalla y se avisa con el aviso de posición.
- Alta de notas: botón "+" flotante (abajo a la derecha). Añade una nota en blanco en el siguiente hueco de la cuadrícula, en modo edición con el título enfocado, y la página se desplaza hasta ella. Solo se crea en el servidor al pulsar "Guardar" con título; "Cancelar" la descarta. Mientras existe esa nota en blanco, nada se arrastra y el "+" y los iconos de las demás están deshabilitados. Es la única forma de agregar notas (el formulario de arriba se retiró).
- Móvil: la etiqueta viewport lleva `minimum-scale=1` para que el navegador no aleje el zoom cuando hay notas muy a la derecha (si no, el botón flotante deja de quedar en la esquina de la pantalla). Se pierde el zoom hacia fuera con dos dedos. Si algún día hace falta, la alternativa es que el board tenga su propio desplazamiento horizontal.
- Eliminación: `DELETE /api/notes/{id}` responde 204 y 404 si la nota no existe (también si ya se eliminó). En la interfaz se pide confirmación dentro de la misma nota ("¿Eliminar esta nota?" con "Eliminar" y "Cancelar"); si falla, la nota se queda en la confirmación para reintentar. Solo hay una acción abierta a la vez (editar, confirmar un borrado o la nota en blanco): mientras tanto, los iconos de las demás notas están deshabilitados y ninguna otra nota se puede arrastrar (la nota en edición sí; la que está en confirmación de borrado o en blanco, no). Las notas sin posición guardada ocupan el hueco de la cuadrícula al eliminarse una anterior.
- Errores en la interfaz: mensaje en español, fijo arriba de la pantalla (siempre visible, aunque la nota esté lejos). "No se pudieron cargar las notas." se mantiene hasta recargar; "No se pudo guardar la nota." se limpia en el siguiente guardado exitoso. Cada acción tiene su aviso, que se limpia en el siguiente éxito de esa misma acción: "No se pudo guardar la posición." (mover) "No se pudieron guardar los cambios." (editar) y "No se pudo eliminar la nota." (eliminar). "Cancelar" limpia los avisos de editar y eliminar. No se distingue el tipo de error.

## Entorno y comandos
- Backend: `./gradlew test` y `./gradlew bootRun` desde `backend/`, con `JAVA_HOME` apuntando a un JDK 21 (`java` puede no estar en el PATH: apunta `JAVA_HOME` a la carpeta de instalación del JDK 21). Swagger en `/swagger-ui.html`.
- Frontend: `npm test` (Vitest) y `npm run dev` desde `frontend/`. Vite redirige `/api` al backend en el puerto 8080 y escucha en todas las interfaces (`host: true`), así que el board es accesible desde la red local sin login.
- La base H2 es un archivo `./data/board` relativo al directorio desde donde se arranca el backend; los tests usan una H2 en memoria. `ddl-auto=update` no modifica columnas existentes: si cambia el tamaño de un campo, hay que borrar `backend/data/`.
- Un único repositorio git (monorepo) con `backend/`, `frontend/`, `docker-compose.yml` y `CLAUDE.md` en la raíz, y los documentos de producto en `docs/` (`docs/backlog.md` y un plan por historia en `docs/planes/`). El historial de los dos proyectos, que antes eran repositorios separados, se conserva dentro de `backend/` y `frontend/`.
- Docker: `docker-compose.yml` (en la raíz del repositorio) levanta el backend y el frontend. `docker compose up -d --build` desde la raíz y la app queda en `http://localhost/` (puerto 80). Cada proyecto tiene su `Dockerfile` en dos etapas: el backend compila el jar con Gradle/JDK 21 y lo ejecuta con un JRE 21 (sin ejecutar tests, que se corren antes); el frontend compila con Vite y lo sirve con nginx, cuyo `nginx.conf` reenvía `/api` al backend por la red interna (sustituye al proxy del servidor de desarrollo). El backend no publica ningún puerto, y Swagger no es accesible desde fuera.
- Datos en Docker: la base H2 vive en el volumen `board_data` (montado en `/app/data`). `docker compose down` conserva las notas; `docker compose down -v` las borra. El volumen y `backend/data/` (desarrollo local) son copias independientes: no se sincronizan. Nunca usar el mismo archivo H2 desde dos procesos a la vez ni escalar el backend a más de una instancia.
