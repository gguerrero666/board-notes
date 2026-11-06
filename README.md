# Board de notas

[![CI](https://github.com/gguerrero666/board-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/gguerrero666/board-notes/actions/workflows/ci.yml)

Tablero personal para **agregar, editar, eliminar y acomodar notas libremente**: se arrastran a cualquier posición y el tablero se ve igual al volver a abrirlo, porque tanto la posición como el orden de apilado se guardan. Un solo usuario, sin login, interfaz solo en español. Funciona en escritorio y en el móvil.

## Qué se puede hacer

- **Agregar** una nota con el botón **+** flotante (esquina inferior derecha). Aparece en blanco sobre el propio tablero, con el título enfocado; se crea al pulsar *Guardar* con título y se descarta con *Cancelar*.
- **Editar** el título y el texto en la misma nota (icono de lápiz). Con el título vacío no se guarda.
- **Eliminar** con confirmación dentro de la nota (icono de papelera).
- **Arrastrar** desde el asa de la nota (franja superior), con el ratón o con el dedo. La posición se guarda y el board se desplaza solo cuando acercas la nota a los bordes de la ventana.
- **Apilado persistente:** la última nota que agarras queda encima de las demás, y ese orden se conserva al recargar.
- **Avisos de error** en español, fijos arriba de la pantalla, cuando falla cargar, guardar, mover o eliminar.
- Solo hay **una acción abierta a la vez** (editar, confirmar un borrado o crear una nota): mientras tanto el resto de notas no se pueden arrastrar ni modificar.

## Tecnología

| Parte | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 3.5.0 (Web, Data JPA, Validation), base de datos **H2** en archivo, documentación OpenAPI con springdoc 2.8.9, Gradle 8.14 (wrapper incluido) |
| Frontend | React 19, Vite 8, Vitest 5 con Testing Library y jsdom, oxlint |
| Contenedores | Docker Compose; imágenes `eclipse-temurin:21`, `node:22-alpine` y `nginx:alpine` |

## Estructura del repositorio

```
.
├── README.md
├── CLAUDE.md             Instrucciones y decisiones de diseño del proyecto
├── docker-compose.yml    Backend + frontend (nginx) en contenedores
├── scripts/
│   └── smoke-test.sh     Prueba de humo de la aplicación completa (la usa el CI)
├── .github/workflows/
│   └── ci.yml            Integración continua (GitHub Actions)
├── backend/              API REST (Spring Boot)
│   ├── Dockerfile
│   └── src/
├── frontend/             Interfaz (React + Vite)
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
└── docs/
    ├── backlog.md        Historias de usuario y pendientes
    └── planes/           Un plan por historia: criterios, plan y decisiones
```

`backend/` y `frontend/` conservan el historial de commits de cuando eran repositorios independientes.

## Requisitos

- **Para ejecutarlo con Docker:** Docker Desktop (o Docker Engine) con Compose.
- **Para desarrollo local:** JDK 21 y Node.js **22.12 o superior** (se recomienda una versión LTS; Vitest 5 no admite Node 23 ni 25). Gradle no hace falta instalarlo: lo descarga el wrapper.

## Ejecutar con Docker

Desde la raíz del repositorio:

```bash
docker compose up -d --build   # construye y arranca; la primera vez descarga dependencias
```

La aplicación queda en **http://localhost/** (puerto 80; para otro puerto: `HTTP_PORT=8081 docker compose up -d`). Para pararla:

```bash
docker compose down            # conserva las notas
docker compose down -v         # ¡borra también las notas!
```

Cómo funciona:

- **nginx** sirve el frontend compilado y reenvía `/api` al backend por la red interna de Docker (hace el papel del proxy del servidor de desarrollo).
- El **backend no publica ningún puerto**: solo nginx llega a él. Por eso Swagger no es accesible desde fuera en este modo.
- Las notas viven en el volumen **`board_data`** (montado en `/app/data`), que sobrevive a recrear los contenedores.

## Desarrollo local

**Backend** (puerto 8080):

```bash
cd backend
./gradlew bootRun          # en Windows: .\gradlew.bat bootRun
```

Si `java` no está en el `PATH`, apunta `JAVA_HOME` a tu JDK 21 antes de ejecutar Gradle (por ejemplo, en PowerShell: `$env:JAVA_HOME = "C:\ruta\al\jdk-21"`).

- Documentación interactiva: **http://localhost:8080/swagger-ui.html** (OpenAPI en `/v3/api-docs`).
- La base de datos es el archivo `backend/data/board.mv.db` (se crea sola y está ignorado por Git).

**Frontend** (puerto 5173):

```bash
cd frontend
npm install
npm run dev
```

- Abre **http://localhost:5173**. El servidor de desarrollo reenvía `/api` a `http://localhost:8080`.
- Escucha en todas las interfaces (`host: true`), así que también puedes abrirlo desde el móvil en la misma red, con la IP de tu equipo.

> El modo Docker y el desarrollo local usan **bases de datos independientes**: lo que hagas en uno no aparece en el otro.

## Tests y calidad

| Comando (desde la carpeta indicada) | Qué hace |
|---|---|
| `backend$ ./gradlew test` | Tests del backend con MockMvc sobre una H2 en memoria (33) |
| `frontend$ npm test` | Tests del frontend con Vitest y Testing Library (69) |
| `frontend$ npm run lint` | Análisis estático con oxlint |
| `frontend$ npm run build` | Compilación de producción |

### Integración continua

En cada *push* y *pull request*, GitHub Actions (`.github/workflows/ci.yml`) ejecuta tres trabajos:

1. **Backend:** los tests con Gradle y JDK 21.
2. **Frontend:** `npm ci`, lint, tests y compilación con Node 22.
3. **Docker** (si los dos anteriores pasan): construye las imágenes, levanta la aplicación completa y ejecuta `scripts/smoke-test.sh`, que recorre a través de nginx el ciclo crear, mover, editar, listar y eliminar una nota, comprueba las validaciones y que Swagger no queda expuesto. Puedes lanzarlo tú contra una aplicación en marcha con `BASE_URL=http://localhost ./scripts/smoke-test.sh` (crea y elimina una nota de prueba).

## API

Todas las rutas cuelgan de `/api/notes`.

| Método y ruta | Qué hace | Respuestas |
|---|---|---|
| `GET /api/notes` | Lista las notas, de la más antigua a la más reciente | 200 |
| `POST /api/notes` | Crea una nota (`title`, `text`); queda encima de todas | 201, 400 |
| `PUT /api/notes/{id}` | Reemplaza título y texto; no toca la posición | 200, 400, 404 |
| `PATCH /api/notes/{id}/position` | Guarda `x`, `y` y **sube la nota al frente** | 200, 400, 404 |
| `DELETE /api/notes/{id}` | Elimina la nota | 204, 404 |

Ejemplo de nota:

```json
{ "id": 1, "title": "Comprar leche", "text": "Entera, 2 litros", "x": 120, "y": 80, "z": 3 }
```

## Modelo de datos

| Campo | Descripción |
|---|---|
| `id` | Lo asigna el servidor; el cliente nunca lo envía |
| `title` | Obligatorio, no puede estar vacío ni ser solo espacios, máximo **100** caracteres (los espacios cuentan al validar; se guarda recortado) |
| `text` | Opcional, máximo **1000** caracteres |
| `x`, `y` | Enteros en píxeles entre **0 y 100000**; nulos mientras la nota no se haya movido |
| `z` | Orden de apilado: el servidor lo asigna como *el mayor existente + 1* al crear la nota y al guardar su posición; nulo en notas anteriores a esta función |

Las notas sin posición guardada se colocan en una cuadrícula inicial, por orden de lista y con tantas columnas como quepan en el ancho de la ventana (se recalcula al cambiar su tamaño o girar el móvil).

## Decisiones de diseño

- **Un solo usuario**, sin login, sin roles, sin modo offline y solo en español.
- Los límites (100 y 1000 caracteres, 0 a 100000) se aplican en **tres sitios** que hay que mantener juntos: validación del backend, longitud de las columnas y `maxLength` o tope del frontend.
- Las posiciones se guardan **relativas al board**, que ocupa toda la ventana: `x = 0` e `y = 0` son los bordes de la pantalla.
- El arrastre usa eventos de puntero (ratón y táctil) y solo se inicia desde el **asa** de la nota, para que el resto de la nota deje desplazar la página con el dedo.
- En el móvil, la etiqueta `viewport` lleva `minimum-scale=1` para que el botón flotante quede siempre en la esquina de la pantalla aunque haya notas muy a la derecha. Contrapartida: no se puede alejar el zoom con dos dedos.
- Al agarrar una nota, sube al instante con un `z` local; al soltarla se queda con el mayor entre ese valor y el del servidor, de modo que una respuesta tardía no la hunde.

El detalle completo está en [`CLAUDE.md`](CLAUDE.md).

## Datos y seguridad

- **Sin autenticación:** cualquiera que llegue a la aplicación puede leer y modificar las notas. Tanto el servidor de desarrollo (`host: true`) como Docker (puerto 80) escuchan en todas las interfaces, así que el tablero es accesible desde tu red local. Úsalo en una red de confianza o ponlo detrás de algo que autentique.
- **Una sola instancia del backend:** H2 en modo archivo no admite dos procesos sobre el mismo archivo ni más de una réplica.
- `ddl-auto=update` añade columnas nuevas pero **no modifica las existentes**: si cambia el tamaño de un campo, hay que migrar o recrear la base.
- La base de datos (`backend/data/`) no se versiona.

## Cómo se ha construido

El proyecto se desarrolló **historia por historia**, con el flujo: refinar la historia (criterios de aceptación y plan), acordar la lista de tests, y después un ciclo de *test en rojo → código mínimo → test en verde*. Los refactors van en commits separados de la funcionalidad, y cada historia pasó por una revisión de código antes de darse por cerrada. El trabajo se hizo con la ayuda de Claude Code; los commits llevan la línea `Co-Authored-By` correspondiente.

Para ver el recorrido completo:

- [`docs/backlog.md`](docs/backlog.md): las historias de usuario, su estado y los pendientes.
- [`docs/planes/`](docs/planes/): un archivo por historia, con criterios de aceptación, plan, decisiones tomadas y qué quedó fuera de alcance.

## Pendientes

Mejoras detectadas que todavía no son historias (accesibilidad con teclado, un desplazamiento horizontal propio para el board, tratar un `DELETE` con 404 como éxito, extraer el arrastre a un hook, respetar `prefers-reduced-motion` y asignar el siguiente `z` de forma atómica) están en la sección *Pendientes* de [`docs/backlog.md`](docs/backlog.md#pendientes-sin-historia).
