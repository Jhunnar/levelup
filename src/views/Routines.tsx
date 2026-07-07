import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Exercise, Routine } from '../types'
import { nowISO, uid } from '../types'
import { ExercisePicker } from './ExercisePicker'
import { Modal } from '../components/ui'

export function RoutineEditor({ profileId }: { profileId: string }) {
  const routines = useLiveQuery(() => db.routines.where('profileId').equals(profileId).toArray(), [profileId])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]))

  const [editing, setEditing] = useState<Routine | null>(null)

  function newRoutine() {
    setEditing({ id: uid(), profileId, name: '', items: [], updatedAt: nowISO() })
  }

  return (
    <div>
      <button className="btn purple" onClick={newRoutine} style={{ marginBottom: 14 }}>
        ＋ Nueva rutina
      </button>

      {routines && routines.length === 0 && (
        <div className="empty">
          <div className="big">📋</div>
          Crea plantillas de rutina (ej: "Push", "Pull", "Pierna")
          <br />
          para empezar tus entrenos con un toque.
        </div>
      )}

      {routines?.map((r) => (
        <div className="card" key={r.id}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{r.name}</div>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn" onClick={() => setEditing(structuredClone(r))} aria-label="Editar">
                ✏️
              </button>
              <button
                className="icon-btn"
                onClick={() => {
                  if (confirm(`¿Borrar la rutina "${r.name}"?`)) db.routines.delete(r.id)
                }}
                aria-label="Borrar"
              >
                🗑️
              </button>
            </div>
          </div>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
            {r.items.map((it, i) => (
              <div key={i}>
                • {exMap.get(it.exerciseId)?.name ?? '?'} — {it.sets}×{it.reps}
              </div>
            ))}
          </div>
        </div>
      ))}

      {editing && (
        <RoutineForm
          routine={editing}
          exMap={exMap}
          onClose={() => setEditing(null)}
          onSave={async (r) => {
            r.updatedAt = nowISO()
            await db.routines.put(r)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function RoutineForm({
  routine,
  exMap,
  onClose,
  onSave,
}: {
  routine: Routine
  exMap: Map<string, Exercise>
  onClose: () => void
  onSave: (r: Routine) => void
}) {
  const [r, setR] = useState<Routine>(routine)
  const [picking, setPicking] = useState(false)

  return (
    <>
      <Modal onClose={onClose}>
        <h3>{routine.name ? 'Editar rutina' : 'Nueva rutina'}</h3>
        <div className="field">
          <label>Nombre</label>
          <input
            placeholder="Ej: Push (pecho/hombro/tríceps)"
            value={r.name}
            onChange={(e) => setR({ ...r, name: e.target.value })}
          />
        </div>

        {r.items.map((it, idx) => (
          <div className="exercise-block" key={idx}>
            <div className="exercise-head">
              <div className="nm">{exMap.get(it.exerciseId)?.name ?? '?'}</div>
              <button
                className="icon-btn"
                onClick={() => setR({ ...r, items: r.items.filter((_, i) => i !== idx) })}
              >
                ✕
              </button>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Series</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={it.sets}
                  onChange={(e) => {
                    const items = [...r.items]
                    items[idx] = { ...it, sets: Math.max(1, Number(e.target.value) || 1) }
                    setR({ ...r, items })
                  }}
                />
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label>Reps objetivo</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={it.reps}
                  onChange={(e) => {
                    const items = [...r.items]
                    items[idx] = { ...it, reps: Math.max(1, Number(e.target.value) || 1) }
                    setR({ ...r, items })
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        <button className="btn ghost" onClick={() => setPicking(true)} style={{ marginBottom: 12 }}>
          ＋ Añadir ejercicio
        </button>

        <div className="row">
          <button className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn primary"
            onClick={() => {
              if (!r.name.trim()) {
                alert('Ponle un nombre a la rutina')
                return
              }
              onSave(r)
            }}
          >
            Guardar
          </button>
        </div>
      </Modal>

      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ex) => {
            setR({ ...r, items: [...r.items, { exerciseId: ex.id, sets: 3, reps: 10 }] })
            setPicking(false)
          }}
        />
      )}
    </>
  )
}
