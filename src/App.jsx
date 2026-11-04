import { useEffect, useState } from 'react'

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    fetch('/api/notes')
      .then((response) => {
        if (!response.ok) throw new Error('No se pudieron cargar las notas')
        return response.json()
      })
      .then(setNotes)
      .catch(() => setLoadError(true))
  }, [])

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

  return (
    <main>
      {loadError && <p role="alert">No se pudieron cargar las notas.</p>}
      {saveError && <p role="alert">No se pudo guardar la nota.</p>}
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
      <section className="board">
        {notes.map((note) => (
          <article key={note.id} className="note">
            <h2>{note.title}</h2>
            <p>{note.text}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
