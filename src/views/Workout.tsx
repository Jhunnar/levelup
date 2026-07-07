import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Exercise, Routine, Session, SetEntry } from '../types'
import { nowISO, uid } from '../types'
import { finishSession, type FinishResult } from '../game/engine'
import { suggestWeight } from '../game/suggest'
import { ExercisePicker } from './ExercisePicker'
import { Modal } from '../components/ui'
import { RoutineEditor } from './Routines'
import { History } from './History'

type SubTab = 'hoy' | 'rutinas' | 'historial'

export function Workout({ profileId }: { profileId: string }) {
  const [tab, setTab] = useState<SubTab>('hoy')
  const [result, setResult] = useState<FinishResult | null>(null)

  const active = useLiveQuery(
    async () =>
      (await db.sessions.where('profileId').equals(profileId).toArray()).find((s) => !s.finishedAt) ?? null,
    [profileId]
  )

  return (
    <div>
      <div className="seg">
        {(
          [
            ['hoy', 'Entreno'],
            ['rutinas', 'Rutinas'],
            ['historial', 'Historial'],
          ] as [SubTab, string][]
        ).map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'hoy' &&
        (active === undefined ? null : active ? (
          <ActiveSession session={active} onFinished={setResult} />
        ) : (
          <StartSession profileId={profileId} />
        ))}
      {tab === 'rutinas' && <RoutineEditor profileId={profileId} />}
      {tab === 'historial' && <History profileId={profileId} />}

      {result && <FinishSummary result={result} onClose={() => setResult(null)} />}
    </div>
  )
}

// ---------- Empezar sesión ----------

function StartSession({ profileId }: { profileId: string }) {
  const routines = useLiveQuery(() => db.routines.where('profileId').equals(profileId).toArray(), [profileId])

  async function start(routine: Routine | null) {
    const session: Session = {
      id: uid(),
      profileId,
      routineName: routine?.name ?? null,
      startedAt: nowISO(),
      finishedAt: null,
      exercises:
        routine?.items.map((it) => ({
          exerciseId: it.exerciseId,
          sets: Array.from({ length: it.sets }, (): SetEntry => ({ weight: null, reps: it.reps, done: false })),
        })) ?? [],
      updatedAt: nowISO(),
    }
    await db.sessions.add(session)
  }

  return (
    <div>
      <div className="card hero center" style={{ padding: 26 }}>
        <div style={{ fontSize: 40 }}>⚔️</div>
        <h2 style={{ margin: '10px 0 6px', fontSize: 20 }}>¿Listo para la batalla?</h2>
        <p className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>
          Empieza un entrenamiento y gana XP por cada serie completada.
        </p>
        <button className="btn primary" onClick={() => start(null)}>
          🏋️ Entreno libre
        </button>
      </div>

      {routines && routines.length > 0 && (
        <div className="card">
          <div className="card-title">O empieza desde una rutina</div>
          {routines.map((r) => (
            <div className="list-item" key={r.id}>
              <div className="grow">
                <div className="t">{r.name}</div>
                <div className="s">{r.items.length} ejercicios</div>
              </div>
              <button className="btn small purple" onClick={() => start(r)}>
                Empezar ▶
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Sesión activa ----------

function ActiveSession({
  session,
  onFinished,
}: {
  session: Session
  onFinished: (r: FinishResult) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [restLeft, setRestLeft] = useState<number | null>(null)
  const [restTotal, setRestTotal] = useState(90)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const restRef = useRef<number | null>(null)

  const exercises = useLiveQuery(() => db.exercises.toArray(), [])
  const exMap = new Map((exercises ?? []).map((e) => [e.id, e]))

  // perfil + último peso corporal, para sugerir pesos iniciales
  const profile = useLiveQuery(() => db.profiles.get(session.profileId), [session.profileId])
  const latestWeight = useLiveQuery(async () => {
    const logs = await db.bodyLogs.where('profileId').equals(session.profileId).toArray()
    if (logs.length === 0) return null
    return logs.sort((a, b) => a.date.localeCompare(b.date))[logs.length - 1].weightKg
  }, [session.profileId])

  // mejores marcas anteriores para mostrar "última vez"
  const prevBest = useLiveQuery(async () => {
    const all = await db.sessions.where('profileId').equals(session.profileId).toArray()
    const best = new Map<string, { weight: number; reps: number }>()
    for (const s of all) {
      if (!s.finishedAt) continue
      for (const ex of s.exercises)
        for (const set of ex.sets) {
          if (!set.done || !set.weight) continue
          const cur = best.get(ex.exerciseId)
          if (!cur || set.weight > cur.weight) best.set(ex.exerciseId, { weight: set.weight, reps: set.reps ?? 0 })
        }
    }
    return best
  }, [session.profileId])

  // temporizador de descanso
  useEffect(() => {
    if (restLeft === null) return
    if (restLeft <= 0) {
      try {
        navigator.vibrate?.([200, 100, 200])
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        osc.start()
        osc.stop(ctx.currentTime + 0.6)
      } catch {
        // sin audio, no pasa nada
      }
      setRestLeft(null)
      return
    }
    restRef.current = window.setTimeout(() => setRestLeft((v) => (v === null ? null : v - 1)), 1000)
    return () => {
      if (restRef.current) clearTimeout(restRef.current)
    }
  }, [restLeft])

  async function update(mutate: (s: Session) => void) {
    // transacción sobre el estado fresco: dos ediciones rápidas no se pisan
    await db.transaction('rw', db.sessions, async () => {
      const fresh = await db.sessions.get(session.id)
      if (!fresh) return
      mutate(fresh)
      fresh.updatedAt = nowISO()
      await db.sessions.put(fresh)
    })
  }

  async function finish() {
    setConfirmFinish(false)
    const res = await finishSession(session.id)
    onFinished(res)
  }

  async function cancel() {
    await db.sessions.delete(session.id)
  }

  const startedMin = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)

  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>⏱️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>{session.routineName ?? 'Entreno libre'}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            En curso · {startedMin} min
          </div>
        </div>
        <button className="btn small danger" onClick={cancel}>
          Descartar
        </button>
      </div>

      {session.exercises.map((ex, exIdx) => {
        const meta = exMap.get(ex.exerciseId)
        const prev = prevBest?.get(ex.exerciseId)
        return (
          <div className="exercise-block" key={`${ex.exerciseId}-${exIdx}`}>
            <div className="exercise-head">
              <div className="nm">{meta?.name ?? '...'}</div>
              <div className="grp">{meta?.group}</div>
              <button
                className="icon-btn"
                onClick={() => update((s) => s.exercises.splice(exIdx, 1))}
                aria-label="Quitar ejercicio"
              >
                ✕
              </button>
            </div>
            {prev ? (
              <div className="prev-hint">
                Tu mejor marca: <b className="gold-text">{prev.weight} kg × {prev.reps}</b>
              </div>
            ) : (
              (() => {
                const sug = suggestWeight(profile, latestWeight ?? null, ex.exerciseId)
                return sug ? (
                  <div className="prev-hint">
                    💡 Sugerido para empezar:{' '}
                    <b style={{ color: 'var(--purple-soft)' }}>
                      ~{sug.weight} kg{sug.perDumbbell ? ' por mancuerna' : ''} × 8-10
                    </b>
                  </div>
                ) : null
              })()
            )}
            <div className="set-labels">
              <span>#</span>
              <span>KG</span>
              <span>REPS</span>
              <span>✓</span>
            </div>
            {ex.sets.map((set, setIdx) => (
              <div className={`set-row${set.done ? ' done' : ''}`} key={setIdx}>
                <span className="idx">{setIdx + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="—"
                  value={set.weight ?? ''}
                  onChange={(e) =>
                    update((s) => {
                      s.exercises[exIdx].sets[setIdx].weight = e.target.value === '' ? null : Number(e.target.value)
                    })
                  }
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="—"
                  value={set.reps ?? ''}
                  onChange={(e) =>
                    update((s) => {
                      s.exercises[exIdx].sets[setIdx].reps = e.target.value === '' ? null : Number(e.target.value)
                    })
                  }
                />
                <button
                  className="chk"
                  onClick={() => {
                    const willBeDone = !set.done
                    update((s) => {
                      s.exercises[exIdx].sets[setIdx].done = willBeDone
                    })
                    if (willBeDone) setRestLeft(restTotal)
                  }}
                >
                  {set.done ? '✅' : '○'}
                </button>
              </div>
            ))}
            <div className="row mt">
              <button
                className="btn small ghost"
                onClick={() =>
                  update((s) => {
                    const sets = s.exercises[exIdx].sets
                    const last = sets[sets.length - 1]
                    sets.push({ weight: last?.weight ?? null, reps: last?.reps ?? null, done: false })
                  })
                }
              >
                ＋ Serie
              </button>
              {ex.sets.length > 1 && (
                <button className="btn small ghost" onClick={() => update((s) => s.exercises[exIdx].sets.pop())}>
                  − Serie
                </button>
              )}
            </div>
          </div>
        )
      })}

      <button className="btn ghost" onClick={() => setShowPicker(true)} style={{ marginBottom: 10 }}>
        ＋ Añadir ejercicio
      </button>

      <div className="card">
        <div className="field">
          <label>⏲️ Descanso entre series (segundos)</label>
          <div className="row">
            {[60, 90, 120, 180].map((s) => (
              <button
                key={s}
                className="btn small"
                style={{
                  flex: 1,
                  background: restTotal === s ? 'var(--purple)' : 'var(--bg2)',
                  color: restTotal === s ? '#fff' : 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
                onClick={() => setRestTotal(s)}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn primary" onClick={() => setConfirmFinish(true)}>
        🏁 Terminar entrenamiento
      </button>

      {showPicker && (
        <ExercisePicker
          onClose={() => setShowPicker(false)}
          onPick={(exercise: Exercise) => {
            update((s) =>
              s.exercises.push({ exerciseId: exercise.id, sets: [{ weight: null, reps: null, done: false }] })
            )
            setShowPicker(false)
          }}
        />
      )}

      {restLeft !== null && (
        <div className="rest-timer">
          <span className="time">
            {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
          </span>
          <div className="bar">
            <div style={{ width: `${(restLeft / restTotal) * 100}%` }} />
          </div>
          <button className="btn small ghost" onClick={() => setRestLeft(null)}>
            Saltar
          </button>
        </div>
      )}

      {confirmFinish && (
        <Modal onClose={() => setConfirmFinish(false)}>
          <h3>¿Terminar entrenamiento?</h3>
          <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
            Solo contarán las series marcadas con ✅. Se calculará tu XP, récords y logros.
          </p>
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirmFinish(false)}>
              Seguir entrenando
            </button>
            <button className="btn primary" onClick={finish}>
              ¡Terminar!
            </button>
          </div>
        </Modal>
      )}

    </div>
  )
}

function FinishSummary({ result, onClose }: { result: FinishResult; onClose: () => void }) {
  return (
    <div className="finish-overlay">
      <div className="finish-card">
        <div style={{ fontSize: 44 }}>🏆</div>
        <h2 style={{ margin: '6px 0 2px', fontSize: 20 }}>¡Victoria!</h2>
        <div className="big-xp">+{result.xpGained} XP</div>
        <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px' }}>
          {result.totalSets} series · {(result.totalVolume / 1000).toFixed(2)} toneladas movidas
        </p>

        {result.prs.map((pr) => (
          <div className="reward-line" key={pr.exerciseId}>
            <span>📈</span>
            <span>
              <b>¡Récord!</b> {pr.exerciseName}: {pr.weight} kg
              {pr.previous > 0 && <span className="muted"> (antes {pr.previous})</span>}
            </span>
            <span className="xp">+25</span>
          </div>
        ))}
        {result.newAchievements.map((a) => (
          <div className="reward-line" key={a.id}>
            <span>{a.icon}</span>
            <span>
              <b>Logro:</b> {a.name}
            </span>
            <span className="xp">+{a.xp}</span>
          </div>
        ))}
        {result.goalsCompleted.map((g) => (
          <div className="reward-line" key={g}>
            <span>🏆</span>
            <span>
              <b>Objetivo cumplido:</b> {g}
            </span>
            <span className="xp">+100</span>
          </div>
        ))}

        <button className="btn primary" style={{ marginTop: 18 }} onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  )
}
