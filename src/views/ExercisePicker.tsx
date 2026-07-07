import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Modal } from '../components/ui'
import type { Exercise, MuscleGroup } from '../types'
import { nowISO, uid } from '../types'

const GROUPS: (MuscleGroup | 'Todos')[] = [
  'Todos',
  'Pecho',
  'Espalda',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Femoral',
  'Glúteo',
  'Gemelo',
  'Core',
  'Full body',
  'Cardio',
]

export function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState<MuscleGroup | 'Todos'>('Todos')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroup, setNewGroup] = useState<MuscleGroup>('Pecho')

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  const filtered = useMemo(() => {
    if (!exercises) return []
    const q = search.trim().toLowerCase()
    return exercises
      .filter((e) => (group === 'Todos' || e.group === group) && (!q || e.name.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, search, group])

  async function createExercise() {
    const name = newName.trim()
    if (!name) return
    const ex: Exercise = { id: uid(), name, group: newGroup, custom: 1, updatedAt: nowISO() }
    await db.exercises.add(ex)
    setCreating(false)
    setNewName('')
    onPick(ex)
  }

  return (
    <Modal onClose={onClose}>
      <h3>Elegir ejercicio</h3>
      <input
        placeholder="🔍 Buscar ejercicio..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 6 }}>
        {GROUPS.map((g) => (
          <button
            key={g}
            className="btn small"
            style={{
              flexShrink: 0,
              background: g === group ? 'var(--purple)' : 'var(--bg2)',
              color: g === group ? '#fff' : 'var(--muted)',
              border: '1px solid var(--border)',
            }}
            onClick={() => setGroup(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {creating ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="field">
            <label>Nombre del ejercicio</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej: Press inclinado con cadenas" />
          </div>
          <div className="field">
            <label>Grupo muscular</label>
            <select value={newGroup} onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}>
              {GROUPS.filter((g) => g !== 'Todos').map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <button className="btn ghost" onClick={() => setCreating(false)}>
              Cancelar
            </button>
            <button className="btn purple" onClick={createExercise}>
              Crear y añadir
            </button>
          </div>
        </div>
      ) : (
        <button className="btn ghost" style={{ marginBottom: 8 }} onClick={() => setCreating(true)}>
          ＋ Crear ejercicio personalizado
        </button>
      )}

      <div>
        {filtered.map((e) => (
          <button
            key={e.id}
            className="list-item"
            style={{ width: '100%', textAlign: 'left' }}
            onClick={() => onPick(e)}
          >
            <div className="grow">
              <div className="t">
                {e.name} {e.custom ? '✨' : ''}
              </div>
              <div className="s">{e.group}</div>
            </div>
            <span style={{ color: 'var(--purple-soft)', fontWeight: 800 }}>＋</span>
          </button>
        ))}
        {filtered.length === 0 && <div className="empty">No hay resultados para esa búsqueda.</div>}
      </div>
    </Modal>
  )
}
