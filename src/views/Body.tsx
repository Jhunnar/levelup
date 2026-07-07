import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { addPhoto, logBodyWeight, logMeasurement } from '../game/engine'
import { resizePhoto } from '../utils/image'
import { LineChart, Modal } from '../components/ui'
import { MEASURE_KEYS, nowISO, uid, type Goal, type MeasureKey } from '../types'

type SubTab = 'peso' | 'medidas' | 'fotos' | 'objetivos'

export function Body({ profileId, onXp }: { profileId: string; onXp: (msg: string) => void }) {
  const [tab, setTab] = useState<SubTab>('peso')
  return (
    <div>
      <div className="seg">
        {(
          [
            ['peso', '⚖️ Peso'],
            ['medidas', '📏 Medidas'],
            ['fotos', '📸 Fotos'],
            ['objetivos', '🎯 Metas'],
          ] as [SubTab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'peso' && <WeightTab profileId={profileId} onXp={onXp} />}
      {tab === 'medidas' && <MeasuresTab profileId={profileId} onXp={onXp} />}
      {tab === 'fotos' && <PhotosTab profileId={profileId} onXp={onXp} />}
      {tab === 'objetivos' && <GoalsTab profileId={profileId} />}
    </div>
  )
}

// ---------- Peso corporal ----------

function WeightTab({ profileId, onXp }: { profileId: string; onXp: (msg: string) => void }) {
  const [value, setValue] = useState('')
  const profile = useLiveQuery(() => db.profiles.get(profileId), [profileId])
  const logs = useLiveQuery(
    async () =>
      (await db.bodyLogs.where('profileId').equals(profileId).toArray()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [profileId]
  )

  async function save() {
    const w = parseFloat(value.replace(',', '.'))
    if (!w || w <= 0) return
    const xp = await logBodyWeight(profileId, w)
    setValue('')
    if (xp > 0) onXp(`⚖️ Peso registrado · +${xp} XP`)
    else onXp('⚖️ Peso de hoy actualizado')
  }

  const delta = logs && logs.length >= 2 ? logs[logs.length - 1].weightKg - logs[0].weightKg : null

  return (
    <div>
      <div className="card">
        <div className="card-title">Registrar peso de hoy</div>
        <div className="row">
          <input
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="btn primary small" style={{ padding: '12px 22px' }} onClick={save}>
            Guardar
          </button>
        </div>
      </div>

      {logs && logs.length > 0 && (
        <div className="card">
          <div className="card-title">Evolución</div>
          <LineChart
            points={logs.slice(-30).map((l) => ({
              label: new Date(l.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
              value: l.weightKg,
            }))}
            unit=" kg"
          />
          <div className="grid2 mt">
            <div className="mini-stat">
              <div className="v">{logs[logs.length - 1].weightKg} kg</div>
              <div className="k">Actual</div>
            </div>
            <div className="mini-stat">
              <div className={`v ${delta !== null && delta < 0 ? 'green-text' : ''}`}>
                {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`}
              </div>
              <div className="k">Desde el inicio</div>
            </div>
            {profile?.heightCm ? (
              <div className="mini-stat">
                <div className="v">
                  {(logs[logs.length - 1].weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)}
                </div>
                <div className="k">IMC</div>
              </div>
            ) : null}
            {profile?.heightCm ? (
              <div className="mini-stat">
                <div className="v">{profile.heightCm} cm</div>
                <div className="k">Altura</div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {logs && logs.length === 0 && (
        <div className="empty">
          <div className="big">⚖️</div>
          Registra tu peso para ver tu evolución.
          <br />
          +10 XP por registro diario.
        </div>
      )}
    </div>
  )
}

// ---------- Medidas ----------

function MeasuresTab({ profileId, onXp }: { profileId: string; onXp: (msg: string) => void }) {
  const [values, setValues] = useState<Partial<Record<MeasureKey, string>>>({})
  const [selected, setSelected] = useState<MeasureKey>('Cintura')
  const measurements = useLiveQuery(
    async () =>
      (await db.measurements.where('profileId').equals(profileId).toArray()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    [profileId]
  )

  async function save() {
    const parsed: Record<string, number> = {}
    for (const k of MEASURE_KEYS) {
      const raw = values[k]?.replace(',', '.')
      if (raw) {
        const n = parseFloat(raw)
        if (n > 0) parsed[k] = n
      }
    }
    if (Object.keys(parsed).length === 0) return
    const xp = await logMeasurement(profileId, parsed)
    setValues({})
    onXp(`📏 Medidas guardadas · +${xp} XP`)
  }

  const seriesForSelected = useMemo(
    () =>
      (measurements ?? [])
        .filter((m) => m.values[selected] != null)
        .map((m) => ({
          label: new Date(m.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          value: m.values[selected]!,
        })),
    [measurements, selected]
  )

  return (
    <div>
      <div className="card">
        <div className="card-title">Nuevas medidas (cm) — rellena las que quieras</div>
        <div className="grid2">
          {MEASURE_KEYS.map((k) => (
            <div className="field" key={k} style={{ marginBottom: 4 }}>
              <label>{k}</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder="cm"
                value={values[k] ?? ''}
                onChange={(e) => setValues({ ...values, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button className="btn primary mt" onClick={save}>
          Guardar medidas (+15 XP)
        </button>
      </div>

      {measurements && measurements.length > 0 && (
        <div className="card">
          <div className="card-title">Evolución por zona</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
            {MEASURE_KEYS.map((k) => (
              <button
                key={k}
                className="btn small"
                style={{
                  flexShrink: 0,
                  background: k === selected ? 'var(--purple)' : 'var(--bg2)',
                  color: k === selected ? '#fff' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
                onClick={() => setSelected(k)}
              >
                {k}
              </button>
            ))}
          </div>
          {seriesForSelected.length > 0 ? (
            <LineChart points={seriesForSelected} color="#a78bfa" unit=" cm" />
          ) : (
            <div className="empty">Sin datos de {selected} todavía.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- Fotos ----------

function PhotosTab({ profileId, onXp }: { profileId: string; onXp: (msg: string) => void }) {
  const photos = useLiveQuery(
    async () =>
      (await db.photos.where('profileId').equals(profileId).toArray()).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    [profileId]
  )
  const [viewing, setViewing] = useState<string | null>(null)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!photos) return
    const map = new Map<string, string>()
    for (const p of photos) map.set(p.id, URL.createObjectURL(p.blob))
    setUrls(map)
    return () => {
      for (const u of map.values()) URL.revokeObjectURL(u)
    }
  }, [photos])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const blob = await resizePhoto(file)
    const xp = await addPhoto(profileId, blob)
    onXp(`📸 Foto guardada · +${xp} XP`)
    e.target.value = ''
  }

  const viewingPhoto = photos?.find((p) => p.id === viewing)

  return (
    <div>
      <label className="btn purple" style={{ marginBottom: 14 }}>
        📸 Añadir foto de progreso (+15 XP)
        <input type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      </label>

      {photos && photos.length === 0 && (
        <div className="empty">
          <div className="big">🖼️</div>
          Las fotos se guardan solo en este dispositivo.
          <br />
          Hazte una al mes con la misma luz y postura.
        </div>
      )}

      <div className="photo-grid">
        {photos?.map((p) => (
          <button className="photo-cell" key={p.id} onClick={() => setViewing(p.id)}>
            <img src={urls.get(p.id)} alt={p.date} loading="lazy" />
            <span className="d">{p.date}</span>
          </button>
        ))}
      </div>

      {viewing && viewingPhoto && (
        <Modal onClose={() => setViewing(null)}>
          <h3>{viewingPhoto.date}</h3>
          <img
            src={urls.get(viewing)}
            alt={viewingPhoto.date}
            style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
          />
          <button
            className="btn danger mt"
            onClick={async () => {
              if (confirm('¿Borrar esta foto?')) {
                await db.photos.delete(viewing)
                setViewing(null)
              }
            }}
          >
            🗑️ Borrar foto
          </button>
        </Modal>
      )}
    </div>
  )
}

// ---------- Objetivos ----------

function GoalsTab({ profileId }: { profileId: string }) {
  const goals = useLiveQuery(() => db.goals.where('profileId').equals(profileId).toArray(), [profileId])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const bodyLogs = useLiveQuery(() => db.bodyLogs.where('profileId').equals(profileId).toArray(), [profileId])
  const sessions = useLiveQuery(() => db.sessions.where('profileId').equals(profileId).toArray(), [profileId])
  const [creating, setCreating] = useState(false)

  const exMap = new Map((exercises ?? []).map((e) => [e.id, e.name]))

  function progressOf(g: Goal): { current: number | null; pct: number } {
    if (g.type === 'body') {
      const sorted = (bodyLogs ?? []).slice().sort((a, b) => a.date.localeCompare(b.date))
      const cur = sorted.length ? sorted[sorted.length - 1].weightKg : null
      if (cur === null || g.startValue === null) return { current: cur, pct: 0 }
      const total = Math.abs(g.target - g.startValue)
      const done = Math.abs(cur - g.startValue)
      const rightDir = g.direction === 'down' ? cur <= g.startValue : cur >= g.startValue
      return { current: cur, pct: total === 0 ? 100 : Math.min(100, rightDir ? (done / total) * 100 : 0) }
    }
    let best = 0
    for (const s of sessions ?? []) {
      if (!s.finishedAt) continue
      for (const ex of s.exercises)
        if (ex.exerciseId === g.exerciseId)
          for (const st of ex.sets) if (st.done && st.weight && st.weight > best) best = st.weight
    }
    return { current: best || null, pct: Math.min(100, (best / g.target) * 100) }
  }

  return (
    <div>
      <button className="btn purple" onClick={() => setCreating(true)} style={{ marginBottom: 14 }}>
        🎯 Nueva misión (+100 XP al cumplirla)
      </button>

      {goals && goals.length === 0 && (
        <div className="empty">
          <div className="big">🗺️</div>
          Define misiones: un peso objetivo o una marca
          <br />
          en un ejercicio. Se completan solas al lograrlo.
        </div>
      )}

      {goals?.map((g) => {
        const { current, pct } = progressOf(g)
        return (
          <div className="card" key={g.id} style={g.doneAt ? { borderColor: 'var(--gold-dark)' } : undefined}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700 }}>
                {g.doneAt ? '✅ ' : '🎯 '}
                {g.title}
              </div>
              <button
                className="icon-btn"
                onClick={() => {
                  if (confirm('¿Borrar este objetivo?')) db.goals.delete(g.id)
                }}
              >
                🗑️
              </button>
            </div>
            <div className="muted" style={{ fontSize: 12.5, margin: '4px 0 8px' }}>
              {g.type === 'body'
                ? `Peso corporal → ${g.target} kg`
                : `${exMap.get(g.exerciseId ?? '') ?? '?'} → ${g.target} kg`}
              {current !== null && ` · ahora: ${current} kg`}
            </div>
            <div className="xpbar">
              <div className="fill" style={{ width: `${g.doneAt ? 100 : pct}%` }} />
            </div>
          </div>
        )
      })}

      {creating && (
        <GoalForm
          profileId={profileId}
          onClose={() => setCreating(false)}
          latestWeight={
            (bodyLogs ?? []).slice().sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0]?.weightKg ?? null
          }
        />
      )}
    </div>
  )
}

function GoalForm({
  profileId,
  onClose,
  latestWeight,
}: {
  profileId: string
  onClose: () => void
  latestWeight: number | null
}) {
  const [type, setType] = useState<'body' | 'lift'>('body')
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState<'down' | 'up'>('down')
  const [exerciseId, setExerciseId] = useState('')
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  async function save() {
    const t = parseFloat(target.replace(',', '.'))
    if (!t || t <= 0) return
    if (type === 'lift' && !exerciseId) return
    const exName = exercises?.find((e) => e.id === exerciseId)?.name
    const goal: Goal = {
      id: uid(),
      profileId,
      title:
        type === 'body'
          ? `${direction === 'down' ? 'Bajar' : 'Subir'} a ${t} kg`
          : `${exName}: llegar a ${t} kg`,
      type,
      exerciseId: type === 'lift' ? exerciseId : null,
      target: t,
      direction: type === 'lift' ? 'up' : direction,
      startValue: type === 'body' ? latestWeight : 0,
      doneAt: null,
      updatedAt: nowISO(),
    }
    await db.goals.add(goal)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h3>Nueva misión</h3>
      <div className="seg">
        <button className={type === 'body' ? 'on' : ''} onClick={() => setType('body')}>
          ⚖️ Peso corporal
        </button>
        <button className={type === 'lift' ? 'on' : ''} onClick={() => setType('lift')}>
          🏋️ Marca en ejercicio
        </button>
      </div>

      {type === 'body' ? (
        <>
          <div className="seg">
            <button className={direction === 'down' ? 'on' : ''} onClick={() => setDirection('down')}>
              Bajar hasta
            </button>
            <button className={direction === 'up' ? 'on' : ''} onClick={() => setDirection('up')}>
              Subir hasta
            </button>
          </div>
        </>
      ) : (
        <div className="field">
          <label>Ejercicio</label>
          <select value={exerciseId} onChange={(e) => setExerciseId(e.target.value)}>
            <option value="">— elige —</option>
            {(exercises ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Objetivo (kg)</label>
        <input type="number" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>

      <div className="row">
        <button className="btn ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={save}>
          Aceptar misión
        </button>
      </div>
    </Modal>
  )
}
