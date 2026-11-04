import { useState } from 'react'

// Una nota del board: asa de arrastre, modo lectura y modo edición.
// El borrador y el estado "guardando" son locales; qué nota se edita, el arrastre
// y las llamadas al servidor los gestiona quien la usa.
function Note({
  note,
  position,
  isTop,
  isDragging,
  isEditing,
  canEdit,
  onHandlePointerDown,
  onStartEdit,
  onCancelEdit,
  onSave,
}) {
  const [draft, setDraft] = useState({ title: '', text: '' })
  const [saving, setSaving] = useState(false)

  const className = ['note', isDragging && 'dragging', isEditing && 'editing']
    .filter(Boolean)
    .join(' ')

  function startEdit() {
    setDraft({ title: note.title, text: note.text ?? '' })
    onStartEdit()
  }

  function save() {
    if (saving || draft.title.trim() === '') return
    setSaving(true)
    onSave(draft.title, draft.text).finally(() => setSaving(false))
  }

  return (
    <article className={className} style={{ ...position, zIndex: isTop ? 1 : 0 }}>
      <div className="note-handle" aria-label="Mover nota" onPointerDown={onHandlePointerDown} />
      {isEditing ? (
        <>
          <input
            aria-label="Título de la nota"
            maxLength={100}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            aria-label="Texto de la nota"
            maxLength={1000}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />
          <div className="note-actions">
            <button type="button" className="note-save" disabled={saving} onClick={save}>
              Guardar
            </button>
            <button type="button" disabled={saving} onClick={onCancelEdit}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>{note.title}</h2>
          <p>{note.text}</p>
          <button
            type="button"
            className="note-edit"
            aria-label="Editar nota"
            disabled={!canEdit}
            onClick={startEdit}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25zm17.7-10.2a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
          </button>
        </>
      )}
    </article>
  )
}

export default Note
