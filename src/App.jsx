import { useEffect, useState } from 'react'

function App() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/notes')
      .then((response) => response.json())
      .then(setNotes)
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
      .then((response) => response.json())
      .then((created) => {
        setNotes((current) => [...current, created])
        setTitle('')
        setText('')
      })
      .finally(() => setSending(false))
  }

  return (
    <main>
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
