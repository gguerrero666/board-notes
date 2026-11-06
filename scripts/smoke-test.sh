#!/usr/bin/env bash
# Prueba de humo: con la aplicación en marcha, recorre a través de nginx el ciclo real
# (crear, mover, editar, listar y eliminar) y comprueba las validaciones principales.
#
# Uso:   BASE_URL=http://localhost ./scripts/smoke-test.sh
# Ojo:   crea y elimina una nota de prueba; no la ejecutes contra datos que no quieras tocar.
set -u

BASE_URL="${BASE_URL:-http://localhost}"
CUERPO="$(mktemp)"
fallos=0
id=""

limpiar() {
  # Si algo falló a mitad, intenta no dejar la nota de prueba
  [ -n "$id" ] && curl -s -o /dev/null -X DELETE --max-time 5 "$BASE_URL/api/notes/$id" || true
  rm -f "$CUERPO"
}
trap limpiar EXIT

ok()    { echo "  ok     $1"; }
falla() { echo "  FALLA  $1"; fallos=$((fallos + 1)); }

# comprueba CODIGO "descripción" args-de-curl...   (el cuerpo queda en $CUERPO)
comprueba() {
  local esperado="$1" descripcion="$2" codigo
  shift 2
  codigo=$(curl -s -o "$CUERPO" -w '%{http_code}' --max-time 10 "$@")
  if [ "$codigo" = "$esperado" ]; then ok "$descripcion ($codigo)"; else falla "$descripcion: se esperaba $esperado y llegó $codigo"; fi
}

campo() { sed -n "s/.*\"$1\":\([0-9]*\).*/\1/p" "$CUERPO" | head -1; }
JSON='Content-Type: application/json'

echo "Esperando a la aplicación en $BASE_URL ..."
# Hasta ~2,5 minutos de espera como máximo (el backend suele estar listo en unos 5 segundos)
for i in $(seq 1 30); do
  curl -sf --max-time 3 "$BASE_URL/api/notes" > /dev/null && break
  if [ "$i" = 30 ]; then echo "La aplicación no respondió a tiempo"; exit 1; fi
  sleep 2
done

echo "Frontend (nginx):"
comprueba 200 "la página principal se sirve" "$BASE_URL/"
grep -qi '<div id="root">' "$CUERPO" && ok "es la aplicación (contiene el nodo raíz)" || falla "la página principal no es la aplicación"
comprueba 200 "una ruta desconocida cae en la aplicación" "$BASE_URL/ruta-que-no-existe"

echo "API a través de nginx:"
comprueba 200 "listar notas" "$BASE_URL/api/notes"
comprueba 201 "crear una nota" -X POST -H "$JSON" -d '{"title":"Prueba de humo","text":"se elimina al final"}' "$BASE_URL/api/notes"
id=$(campo id); z1=$(campo z)
[ -n "$id" ] && ok "la nota tiene id ($id) y apilado ($z1)" || falla "la respuesta de crear no trae id"

comprueba 400 "rechazar un título vacío" -X POST -H "$JSON" -d '{"title":" "}' "$BASE_URL/api/notes"
comprueba 200 "mover la nota" -X PATCH -H "$JSON" -d '{"x":120,"y":80}' "$BASE_URL/api/notes/$id/position"
z2=$(campo z)
[ -n "$z2" ] && [ -n "$z1" ] && [ "$z2" -gt "$z1" ] && ok "mover la sube al frente (z $z1 -> $z2)" || falla "mover no subió la nota al frente (z $z1 -> $z2)"
comprueba 200 "editar la nota" -X PUT -H "$JSON" -d '{"title":"Prueba editada","text":"otro texto"}' "$BASE_URL/api/notes/$id"
comprueba 200 "listar de nuevo" "$BASE_URL/api/notes"
grep -q 'Prueba editada' "$CUERPO" && ok "el listado refleja la edición" || falla "el listado no refleja la edición"

comprueba 204 "eliminar la nota" -X DELETE "$BASE_URL/api/notes/$id"
comprueba 404 "eliminarla otra vez da 404" -X DELETE "$BASE_URL/api/notes/$id"
id=""

echo "Lo que no debe verse desde fuera:"
curl -s --max-time 10 "$BASE_URL/swagger-ui.html" > "$CUERPO"
grep -qi 'swagger' "$CUERPO" && falla "Swagger es accesible desde fuera" || ok "Swagger no es accesible (solo /api sale por nginx)"

echo
if [ "$fallos" -eq 0 ]; then echo "Prueba de humo superada."; else echo "Prueba de humo FALLIDA: $fallos comprobaciones."; exit 1; fi
