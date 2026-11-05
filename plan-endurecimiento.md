## Story
Como usuario, quiero que el board guarde y muestre mis notas de forma confiable (sin duplicados, en el mismo orden y sin que se pisen entre sí), para no perder ni mezclar lo que anoté.

## Acceptance criteria
- [ ] Dado que tengo varias notas, cuando recargo o vuelvo a abrir el board, entonces las veo siempre en el mismo orden, de la más antigua a la más reciente.
- [ ] Dado que confirmo una nota, cuando hago doble clic o presiono Enter dos veces seguidas, entonces se crea una sola nota, y su título se guarda sin espacios al inicio ni al final.
- [ ] Dado que escribo un título de más de 100 caracteres o un texto de más de 1000, cuando intento confirmar, entonces la nota no se crea y el sistema lo rechaza como dato inválido (no como error del servidor).
- [ ] Dado que ya existen notas, cuando se crea una nota nueva enviando un identificador de una nota existente, entonces se crea una nota nueva y la existente no cambia.

## Plan
- Backend: el listado devuelve las notas ordenadas por antigüedad de creación.
- Backend: la creación recibe solo título y texto (el identificador nunca viene del cliente), recorta el título y rechaza longitudes mayores a los límites con un error de validación.
- Backend: los límites de longitud también se reflejan en la base de datos y en la documentación de la API.
- Frontend: mientras se envía una nota, el botón de agregar queda deshabilitado y se ignoran envíos repetidos; el límite de longitud se aplica también en los campos del formulario.

## Out of scope
- Mostrar mensajes de error al usuario (historia aparte).
- Editar, eliminar o arrastrar notas (#2, #3 y #4).
- Ruta de la base de datos y cualquier configuración de despliegue.

## Suggestions (your call)
- Son 4 criterios, uno más del máximo recomendado, porque pediste agrupar los puntos 1, 2, 4 y 5 del review. Si prefieres dividir, el 4.º (identificador) y el 3.º (longitud) forman una historia natural de "datos de entrada del backend".
- Confirmar los límites (100 y 1000): son una propuesta mía, no salen de ningún requisito.
- El 4.º criterio es una sospecha del review aún sin verificar; el primer paso sería un test que lo confirme o lo descarte.
