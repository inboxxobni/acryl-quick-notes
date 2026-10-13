// Quick Notes — browser half (no build step).
// TopBar notebook icon + floating notes LIST panel. Each note is its own
// .txt file on the host via RPC (shared Web/Desktop, survives clearing
// the browser); localStorage is only a fallback if RPC fails.
window.__ModuleLoader__.load({ id: 'acryl-quick-notes', factory: (require) => {
var module = { exports: {} }; var exports = module.exports;

const React = require('react')
const ReactDOM = require('react-dom')
const h = React.createElement
console.info('[acryl-quick-notes] client module loaded')
const ID = 'acryl-quick-notes'
const CHANNEL = '/acryl-quick-notes'
const FALLBACK_KEY = 'acryl-quick-notes-list-fallback'

function loadFallback() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(n => n && typeof n.id === 'string' && typeof n.text === 'string') : []
  } catch (_) { return [] }
}
function saveFallback(notes) {
  try { localStorage.setItem(FALLBACK_KEY, JSON.stringify(notes)) } catch (_) {}
}

function makeQuickNotes(connection) {
  const call = async (endpoint, payload) => {
    const result = await connection.rpc.call(CHANNEL, endpoint, payload ?? {})
    if (result && result.ok === false) throw new Error(result.error && result.error.message ? result.error.message : 'RPC call failed')
    return result && result.ok === true ? result.value : result
  }

  return function QuickNotesAction() {
    const [open, setOpen] = React.useState(false)
    const [notes, setNotes] = React.useState([])
    const [draft, setDraft] = React.useState('')
    const [editingId, setEditingId] = React.useState(null)
    const [editText, setEditText] = React.useState('')
    const [status, setStatus] = React.useState('')
    const [loaded, setLoaded] = React.useState(false)

    const applyNotes = (list, msg) => {
      setNotes(list)
      saveFallback(list)
      setStatus(msg || (String(list.length) + (list.length === 1 ? ' note' : ' notes')))
    }

    const loadFromHost = React.useCallback(() => {
      setStatus('Loading…')
      call('list').then(v => {
        applyNotes(v && Array.isArray(v.notes) ? v.notes : [], '')
        setLoaded(true)
      }).catch(e => {
        const fb = loadFallback()
        setNotes(fb)
        setStatus(fb.length ? 'Offline copy' : 'Offline')
        setLoaded(true)
      })
    }, [])

    React.useEffect(() => { if (open && !loaded) loadFromHost() }, [open, loaded, loadFromHost])

    const add = () => {
      const text = draft.trim()
      if (!text) return
      setStatus('Saving…')
      call('add', { text }).then(v => {
        applyNotes(v.notes || [], '')
        setDraft('')
      }).catch(e => {
        const next = [{ id: 'local-' + Date.now().toString(36), text, updatedAt: new Date().toISOString() }, ...notes]
        applyNotes(next, 'Saved locally')
        setDraft('')
      })
    }

    const startEdit = (n) => { setEditingId(n.id); setEditText(n.text) }
    const cancelEdit = () => { setEditingId(null); setEditText('') }
    const saveEdit = () => {
      if (!editingId) return
      setStatus('Saving…')
      call('update', { id: editingId, text: editText }).then(v => {
        applyNotes(v.notes || [], '')
        setEditingId(null); setEditText('')
      }).catch(() => {
        applyNotes(notes.map(n => n.id === editingId ? { ...n, text: editText } : n), 'Saved locally')
        setEditingId(null); setEditText('')
      })
    }

    const remove = (noteId) => {
      call('remove', { id: noteId }).then(v => {
        applyNotes(v.notes || [], '')
        if (editingId === noteId) { setEditingId(null); setEditText('') }
      }).catch(() => {
        applyNotes(notes.filter(n => n.id !== noteId), 'Saved locally')
      })
    }

    const rows = notes.map(n => {
      const isEditing = editingId === n.id
      const preview = n.text.length > 140 ? n.text.slice(0, 140) + '…' : n.text
      return h('div', { key: n.id, style: { border: '1px solid #8883', borderRadius: 8, padding: 8, marginTop: 8 } },
        isEditing
          ? h(React.Fragment, null,
              h('textarea', { value: editText, onChange: e => setEditText(e.target.value),
                style: { width: '100%', minHeight: 80, resize: 'vertical', padding: 6, fontSize: 13, boxSizing: 'border-box', background: 'var(--surface,#fff)', color: 'inherit', border: '1px solid #8884', borderRadius: 6, outline: 'none' } }),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 6 } },
                h('button', { type: 'button', onClick: saveEdit, style: { flex: 1, cursor: 'pointer', borderRadius: 6, border: '1px solid #8884', background: 'var(--accent,#2f6feb)', color: '#fff', padding: '4px 8px', fontSize: 12 } }, 'Save'),
                h('button', { type: 'button', onClick: cancelEdit, style: { cursor: 'pointer', borderRadius: 6, border: '1px solid #8884', background: 'transparent', color: 'inherit', padding: '4px 8px', fontSize: 12 } }, 'Cancel')))
          : h(React.Fragment, null,
              h('div', { style: { fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' } }, preview || '(empty)'),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' } },
                h('span', { style: { flex: 1, fontSize: 10, opacity: 0.55 } }, n.id.indexOf('local-') === 0 ? 'local' : 'txt file'),
                h('button', { type: 'button', onClick: () => startEdit(n), title: 'Edit note', style: { cursor: 'pointer', border: '1px solid #8884', background: 'transparent', color: 'inherit', borderRadius: 6, padding: '2px 8px', fontSize: 11 } }, 'Edit'),
                h('button', { type: 'button', onClick: () => remove(n.id), title: 'Delete note', 'aria-label': 'Delete note', style: { cursor: 'pointer', border: 'none', background: 'transparent', color: 'inherit', fontSize: 13, opacity: 0.7 } }, '✕'))))
    })

    const panel = open && h('div', {
      style: {
        position: 'fixed', top: 56, right: 16, width: 360, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        zIndex: 9999, padding: 12,
        background: 'var(--surface, #fff)', color: 'var(--text, #111)',
        border: '1px solid #8884', borderRadius: 10,
        boxShadow: '0 8px 24px #0003'
      },
      role: 'dialog', 'aria-label': 'Quick Notes'
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
        h('span', { style: { fontSize: 16 } }, '📓'),
        h('strong', { style: { flex: 1 } }, 'Quick Notes'),
        h('span', { style: { fontSize: 11, opacity: 0.65 } }, status),
        h('button', { type: 'button', onClick: () => setOpen(false), title: 'Close', 'aria-label': 'Close notes',
          style: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14 } }, '✕')),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 4 } },
        h('input', { value: draft, placeholder: 'New note…', onChange: e => setDraft(e.target.value),
          onKeyDown: e => { if (e.key === 'Enter') add() },
          style: { flex: 1, padding: '6px 8px', fontSize: 13, boxSizing: 'border-box', background: 'var(--surface,#fff)', color: 'inherit', border: '1px solid #8884', borderRadius: 6, outline: 'none' } }),
        h('button', { type: 'button', onClick: add, title: 'Add note',
          style: { cursor: 'pointer', borderRadius: 6, border: '1px solid #8884', background: 'var(--accent,#2f6feb)', color: '#fff', padding: '6px 12px', fontSize: 12 } }, 'Add')),
      h('div', { style: { overflow: 'auto', paddingBottom: 4 } },
        notes.length === 0
          ? h('p', { style: { fontSize: 12, opacity: 0.65, marginTop: 12 } }, loaded ? 'No notes yet — type above and hit Add.' : 'Loading…')
          : rows),
      h('div', { style: { fontSize: 10, opacity: 0.55, marginTop: 8 } }, 'Each note = one .txt file on the host'))

    return h(React.Fragment, null,
      h('button', {
        type: 'button',
        onClick: () => setOpen(v => !v),
        title: open ? 'Close Quick Notes (' + String(notes.length) + ')' : 'Quick Notes (' + String(notes.length) + ')',
        'aria-label': 'Quick Notes, ' + String(notes.length) + ' notes',
        style: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px 6px', lineHeight: 1, opacity: 0.9, position: 'relative' }
      }, '📓',
        notes.length > 0 ? h('span', { style: { position: 'absolute', top: -2, right: -2, fontSize: 9, background: 'var(--accent,#2f6feb)', color: '#fff', borderRadius: 8, padding: '0 4px', lineHeight: '14px', minWidth: 14, textAlign: 'center' } }, String(notes.length)) : null),
      panel ? ReactDOM.createPortal(panel, document.body) : null)
  }
}

exports.inject = ['slots', 'connection']

exports.apply = function apply(ctx) {
  console.info('[acryl-quick-notes] apply: registering TopBar notebook icon (list)')
  const QuickNotes = makeQuickNotes(ctx.connection)
  ctx.slots.inject('conversation.session.header.actions', () =>
    ctx.slots.register({ name: 'conversation.session.header.actions', id: ID, order: 60 }, QuickNotes))
}

return module.exports; } });
