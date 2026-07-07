import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Session } from '../types'

export function History({ profileId }: { profileId: string }) {
  const sessions = useLiveQuery(
    async () =>
      (await db.sessions.where('profileId').equals(profileId).toArray())
        .filter((s) => s.finishedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [profileId]
  )
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e.name]))
  const [open, setOpen] = useState<string | null>(null)

  if (!sessions) return null

  if (sessions.length === 0)
    return (
      <div className="empty">
        <div className="big">📖</div>
        Aquí aparecerán tus entrenamientos completados.
      </div>
    )

  return (
    <div>
      {sessions.map((s) => (
        <div className="card" key={s.id}>
          <button
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            <span style={{ fontSize: 20 }}>🗓️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                {new Date(s.startedAt).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {s.routineName ?? 'Entreno libre'} · {s.exercises.length} ejercicios · {volumen(s)} kg
              </div>
            </div>
            <span className="muted">{open === s.id ? '▾' : '▸'}</span>
          </button>

          {open === s.id && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              {s.exercises.map((ex, i) => (
                <div key={i} style={{ padding: '6px 0' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{exMap.get(ex.exerciseId) ?? '?'}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    {ex.sets.map((st, j) => (
                      <span key={j}>
                        {st.weight ?? 0}kg×{st.reps ?? 0}
                        {j < ex.sets.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="btn small danger mt"
                onClick={() => {
                  if (confirm('¿Borrar este entrenamiento del historial?')) db.sessions.delete(s.id)
                }}
              >
                🗑️ Borrar sesión
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function volumen(s: Session): number {
  let v = 0
  for (const ex of s.exercises) for (const st of ex.sets) if (st.done) v += (st.weight ?? 0) * (st.reps ?? 0)
  return Math.round(v)
}
