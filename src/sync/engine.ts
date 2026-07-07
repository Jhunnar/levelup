import type { Table } from 'dexie'
import { db } from '../db'
import { getClient } from './client'

// ---- Motor de sincronización ----
//
// Modelo: una única tabla remota `sync_records(kind, id, updated_at, payload)`.
// Estrategia: last-write-wins por `updated_at` (string ISO generado en cliente).
//   1) PULL: traigo lo cambiado en remoto desde la última marca y lo fusiono
//      localmente si es más nuevo que mi copia.
//   2) PUSH: subo mis registros cambiados desde la última marca (upsert).
//
// No se sincronizan fotos (Blobs) en esta versión. Las sesiones solo se
// sincronizan cuando están terminadas. Los borrados no se propagan todavía.

type Kind =
  | 'profiles'
  | 'exercises'
  | 'sessions'
  | 'routines'
  | 'bodyLogs'
  | 'measurements'
  | 'goals'
  | 'xpEvents'
  | 'unlocks'

const KINDS: Kind[] = [
  'profiles',
  'exercises',
  'sessions',
  'routines',
  'bodyLogs',
  'measurements',
  'goals',
  'xpEvents',
  'unlocks',
]

// tablas append-only: usan `date` como marca temporal (nunca se modifican)
const APPEND_ONLY = new Set<Kind>(['xpEvents', 'unlocks'])

const EPOCH = '1970-01-01T00:00:00.000Z'
const PULLED_KEY = 'levelup.sync.pulledAt'

interface SyncRow {
  kind: Kind
  id: string
  updated_at: string
  payload: Record<string, unknown>
}

function tableFor(kind: Kind): Table<Record<string, unknown>, string> {
  return db[kind] as unknown as Table<Record<string, unknown>, string>
}

function stampOf(kind: Kind, row: Record<string, unknown>): string {
  return (APPEND_ONLY.has(kind) ? (row.date as string) : (row.updatedAt as string)) ?? EPOCH
}

export interface SyncResult {
  pulled: number
  pushed: number
  at: string
}

let running: Promise<SyncResult> | null = null

/** Sincroniza local ↔ remoto. Reentrante: llamadas solapadas comparten la misma ejecución. */
export function runSync(): Promise<SyncResult> {
  running ??= doSync().finally(() => {
    running = null
  })
  return running
}

async function doSync(): Promise<SyncResult> {
  const client = getClient()
  if (!client) throw new Error('Sincronización no configurada')

  const pulledAt = localStorage.getItem(PULLED_KEY) ?? EPOCH
  let maxSeen = pulledAt

  // ---- PULL ----
  const { data, error } = await client
    .from('sync_records')
    .select('kind, id, updated_at, payload')
    .gt('updated_at', pulledAt)
    .order('updated_at', { ascending: true })

  if (error) throw new Error(`Error al descargar: ${error.message}`)

  const remote = (data ?? []) as SyncRow[]
  let pulled = 0

  if (remote.length > 0) {
    await db.transaction('rw', KINDS.map(tableFor), async () => {
      for (const rec of remote) {
        if (!KINDS.includes(rec.kind)) continue
        const t = tableFor(rec.kind)
        const local = await t.get(rec.id)
        const localStamp = local ? stampOf(rec.kind, local) : null
        if (localStamp === null || rec.updated_at > localStamp) {
          await t.put(rec.payload)
          pulled++
        }
        if (rec.updated_at > maxSeen) maxSeen = rec.updated_at
      }
    })
  }

  // ---- PUSH ----
  const toPush: SyncRow[] = []
  for (const kind of KINDS) {
    const rows = await tableFor(kind).toArray()
    for (const row of rows) {
      if (kind === 'sessions' && !row.finishedAt) continue // solo sesiones terminadas
      const stamp = stampOf(kind, row)
      if (stamp > pulledAt) {
        toPush.push({ kind, id: row.id as string, updated_at: stamp, payload: row })
        if (stamp > maxSeen) maxSeen = stamp
      }
    }
  }

  let pushed = 0
  if (toPush.length > 0) {
    // subir en lotes para no exceder límites de payload
    for (let i = 0; i < toPush.length; i += 200) {
      const chunk = toPush.slice(i, i + 200)
      const { error: upErr } = await client.from('sync_records').upsert(chunk, { onConflict: 'kind,id' })
      if (upErr) throw new Error(`Error al subir: ${upErr.message}`)
      pushed += chunk.length
    }
  }

  // avanzar la marca para no re-descargar lo que ya conocemos (incluido lo que subimos)
  localStorage.setItem(PULLED_KEY, maxSeen)

  const result: SyncResult = { pulled, pushed, at: new Date().toISOString() }
  localStorage.setItem('levelup.sync.lastResult', JSON.stringify(result))
  window.dispatchEvent(new CustomEvent('levelup-sync', { detail: result }))
  return result
}

/** Fuerza una resincronización completa (reinicia la marca). */
export function resetSyncWatermark(): void {
  localStorage.removeItem(PULLED_KEY)
}

export function getLastResult(): SyncResult | null {
  const raw = localStorage.getItem('levelup.sync.lastResult')
  return raw ? (JSON.parse(raw) as SyncResult) : null
}
