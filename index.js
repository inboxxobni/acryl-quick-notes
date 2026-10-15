// Quick Notes — host half
// What: persists a LIST of notes, each as its own .txt file on the host
//   (<DSH home>/plugin-data/acryl-quick-notes/notes/<id>.txt) behind an
//   authenticated RPC channel, so Web and Desktop share them and they survive
//   clearing the browser.
// Permissions: fs.write (writes its own plugin-data txt files), ui (TopBar widget).
// Generated from: state-host-store + client-slot-header-action examples. Mutation class: HOT.
import { mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'acryl-quick-notes'
// `connection.rpc.handle` registers its channel through `webServer`, so both must be declared. `dshHomePath` is declared too: the data
// directory comes only from the app's home, so in an app without it the plugin waits (PENDING) instead of guessing a folder.
export const inject = ['connection', 'webServer', 'dshHomePath']

const CHANNEL = '/acryl-quick-notes'
const MAX_NOTES = 500
const MAX_TEXT = 50000
const ID_RE = /^[a-z0-9]{4,20}$/

function dataDir(ctx) {
  return ctx.get('dshHomePath')('plugin-data', name)
}

export function apply(ctx) {
  const dir = dataDir(ctx)
  const notesDir = join(dir, 'notes')
  const legacyFile = join(dir, 'quick-notes.txt')

  function ensureDirs() {
    mkdirSync(notesDir, { recursive: true })
  }

  function makeId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)
  }

  function fileFor(id) {
    return join(notesDir, `${id}.txt`)
  }

  function writeAtomic(path, text) {
    const temp = `${path}.tmp`
    writeFileSync(temp, text)
    renameSync(temp, path)
  }

  // One-time migration: single quick-notes.txt -> first list entry.
  function migrateLegacy() {
    try {
      const items = readdirSync(notesDir).filter(f => f.endsWith('.txt'))
      if (items.length > 0) return
      let legacy = ''
      try { legacy = readFileSync(legacyFile, 'utf8') } catch { return }
      if (!legacy || !legacy.trim()) return
      const id = makeId()
      writeAtomic(fileFor(id), legacy)
    } catch { /* first run: dirs may not exist yet */ }
  }

  function readAll() {
    ensureDirs()
    migrateLegacy()
    let files = []
    try { files = readdirSync(notesDir).filter(f => f.endsWith('.txt')) } catch { return [] }
    const notes = []
    for (const f of files) {
      const id = f.slice(0, -4)
      if (!ID_RE.test(id)) continue
      try {
        const text = readFileSync(join(notesDir, f), 'utf8')
        let updatedAt = ''
        try { updatedAt = statSync(join(notesDir, f)).mtime.toISOString() } catch { updatedAt = '' }
        if (typeof text === 'string') notes.push({ id, text, updatedAt })
      } catch { /* skip unreadable file */ }
    }
    notes.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    return notes.slice(0, MAX_NOTES)
  }

  const fail = message => ({ ok: false, error: { code: 'bad-request', message, details: {} } })
  const done = notes => ({ ok: true, value: { notes } })

  const handlers = {
    list: () => done(readAll()),
    add: payload => {
      const text = String(payload?.text ?? '').trim()
      if (text === '') return fail('text is required')
      if (text.length > MAX_TEXT) return fail(`note is too long (max ${MAX_TEXT} chars)`)
      ensureDirs()
      const current = readAll()
      if (current.length >= MAX_NOTES) return fail(`too many notes (max ${MAX_NOTES})`)
      const id = makeId()
      writeAtomic(fileFor(id), text)
      return done(readAll())
    },
    update: payload => {
      const id = String(payload?.id ?? '')
      if (!ID_RE.test(id)) return fail('valid id is required')
      const text = String(payload?.text ?? '')
      if (text.length > MAX_TEXT) return fail(`note is too long (max ${MAX_TEXT} chars)`)
      ensureDirs()
      writeAtomic(fileFor(id), text)
      return done(readAll())
    },
    remove: payload => {
      const id = String(payload?.id ?? '')
      if (!ID_RE.test(id)) return fail('valid id is required')
      try { unlinkSync(fileFor(id)) } catch { /* already gone */ }
      return done(readAll())
    },
  }

  ctx.connection.rpc.handle(CHANNEL, async (endpoint, payload) => {
    const handler = handlers[endpoint]
    if (!handler) return fail(`unknown endpoint ${JSON.stringify(endpoint)}`)
    try { return handler(payload) } catch (cause) { return fail(String(cause?.message ?? cause)) }
  })
}
