import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Note from './Note.jsx'

const NOTE_SIZE = 220
const GAP = 24
const EDGE = 40 // distancia al borde de la ventana que activa el auto-desplazamiento
const SCROLL_STEP = 20
const MAX_POSITION = 100000 // igual que el límite del backend

function clamp(value) {
  return Math.min(MAX_POSITION, Math.max(0, value))
}

// Posición inicial de una nota sin posición guardada: cuadrícula por orden de lista,
// con tantas columnas como quepan en el ancho del board (mínimo 1).
function initialPosition(index, boardWidth) {
  const columns = Math.max(1, Math.floor((boardWidth + GAP) / (NOTE_SIZE + GAP)))
  return {
    left: (index % columns) * (NOTE_SIZE + GAP),
    top: Math.floor(index / columns) * (NOTE_SIZE + GAP),
  }
}

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [boardWidth, setBoardWidth] = useState(0)
  const boardRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [topId, setTopId] = useState(null)
  // Nota con una acción abierta (por ahora solo 'edit'); null si ninguna
  const [active, setActive] = useState(null)
  const [editError, setEditError] = useState(false)
  const [positionError, setPositionError] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  useLayoutEffect(() => {
    const measure = () => setBoardWidth(boardRef.current.clientWidth)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    fetch('/api/notes')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudieron cargar las notas')
        return response.json()
      })
      .then(setNotes)
      .catch(() => setLoadError(true))
  }, [])

  function positionOf(note, index) {
    return note.x == null || note.y == null
      ? initialPosition(index, boardWidth)
      : { left: note.x, top: note.y }
  }

  function startDrag(event, note, index) {
    if (event.button !== 0 || drag) return
    if (active?.id === note.id && active.mode === 'delete') return // confirmando un borrado
    const { left, top } = positionOf(note, index)
    setTopId(note.id)
    setDrag({
      id: note.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollX: window.scrollX,
      startScrollY: window.scrollY,
      left,
      top,
    })
  }

  useEffect(() => {
    if (!drag) return undefined
    const target = (event) => ({
      x: clamp(drag.left + event.clientX - drag.startX + window.scrollX - drag.startScrollX),
      y: clamp(drag.top + event.clientY - drag.startY + window.scrollY - drag.startScrollY),
    })
    function edgeScroll(distanceToStart, distanceToEnd) {
      if (distanceToStart < EDGE) return -SCROLL_STEP
      if (distanceToEnd < EDGE) return SCROLL_STEP
      return 0
    }
    let last = { x: drag.left, y: drag.top } // última posición alcanzada, para cerrar sin evento de puntero
    function onMove(event) {
      if (event.pointerId !== drag.pointerId) return
      const scrollX = edgeScroll(event.clientX, window.innerWidth - event.clientX)
      const scrollY = edgeScroll(event.clientY, window.innerHeight - event.clientY)
      if (scrollX !== 0 || scrollY !== 0) window.scrollBy(scrollX, scrollY)
      const { x, y } = target(event)
      last = { x, y }
      setNotes((current) => current.map((n) => (n.id === drag.id ? { ...n, x, y } : n)))
    }
    function onUp(event) {
      if (event.pointerId !== drag.pointerId) return
      const { x, y } = target(event)
      finish(x, y)
    }
    function onBlur() {
      finish(last.x, last.y)
    }
    function finish(x, y) {
      setDrag(null)
      fetch(`/api/notes/${drag.id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('No se pudo guardar la posición')
          setPositionError(false)
        })
        .catch(() => setPositionError(true))
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [drag])

  function updateNote(id, title, text) {
    return fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('No se pudieron guardar los cambios')
        return response.json()
      })
      .then((updated) => {
        setNotes((current) =>
          current.map((n) =>
            n.id === updated.id ? { ...n, title: updated.title, text: updated.text } : n,
          ),
        )
        setActive(null)
        setEditError(false)
      })
      .catch(() => setEditError(true))
  }

  function deleteNote(id) {
    return fetch(`/api/notes/${id}`, { method: 'DELETE' })
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo eliminar la nota')
        setNotes((current) => current.filter((n) => n.id !== id))
        setActive(null)
        setDeleteError(false)
      })
      .catch(() => setDeleteError(true))
  }

  function cancelEdit() {
    setActive(null)
    setEditError(false)
    setDeleteError(false)
  }

  function addNote(event) {
    event.preventDefault()
    if (sending || title.trim() === '') return
    setSending(true)
    fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('No se pudo guardar la nota')
        return response.json()
      })
      .then((created) => {
        setNotes((current) => [...current, created])
        setTitle('')
        setText('')
        setSaveError(false)
      })
      .catch(() => setSaveError(true))
      .finally(() => setSending(false))
  }

  // El board crece hacia abajo para contener hasta la nota más baja
  const boardHeight = Math.max(
    0,
    ...notes.map((note, index) => positionOf(note, index).top + NOTE_SIZE + GAP),
  )

  return (
    <main>
      {loadError && <p role="alert">No se pudieron cargar las notas.</p>}
      {saveError && <p role="alert">No se pudo guardar la nota.</p>}
      {positionError && <p role="alert">No se pudo guardar la posición.</p>}
      {editError && <p role="alert">No se pudieron guardar los cambios.</p>}
      {deleteError && <p role="alert">No se pudo eliminar la nota.</p>}
      <form onSubmit={addNote}>
        <label>
          Título
          <input maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Texto
          <textarea maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button type="submit" disabled={sending}>Agregar</button>
      </form>
      <section className="board" ref={boardRef} style={{ minHeight: boardHeight }}>
        {notes.map((note, index) => (
          <Note
            key={note.id}
            note={note}
            position={positionOf(note, index)}
            isTop={note.id === topId}
            isDragging={drag?.id === note.id}
            isEditing={active?.id === note.id && active.mode === 'edit'}
            isDeleting={active?.id === note.id && active.mode === 'delete'}
            canEdit={active === null}
            onHandlePointerDown={(event) => startDrag(event, note, index)}
            onStartEdit={() => setActive({ id: note.id, mode: 'edit' })}
            onStartDelete={() => setActive({ id: note.id, mode: 'delete' })}
            onConfirmDelete={() => deleteNote(note.id)}
            onCancelEdit={cancelEdit}
            onSave={(title, text) => updateNote(note.id, title, text)}
          />
        ))}
      </section>
    </main>
  )
}

export default App
