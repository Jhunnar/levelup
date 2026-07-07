import { useState } from 'react'
import { db } from '../db'
import { addPhoto, logBodyWeight } from '../game/engine'
import { resizePhoto } from '../utils/image'
import {
  EXPERIENCE_LABELS,
  GOAL_LABELS,
  nowISO,
  type Experience,
  type Profile,
  type Sex,
  type TrainingGoal,
} from '../types'

const STEPS = 4

export function Onboarding({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [sex, setSex] = useState<Sex | null>(profile.sex ?? null)
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? '')
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [experience, setExperience] = useState<Experience | null>(profile.experience ?? null)
  const [goal, setGoal] = useState<TrainingGoal | null>(profile.goal ?? null)
  const [days, setDays] = useState<number>(profile.daysPerWeek ?? 3)
  const [weight, setWeight] = useState('')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [xpGained, setXpGained] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  function validateStep(): string | null {
    if (step === 0) {
      if (!sex) return 'Elige tu clase de personaje'
      if (!birthDate) return 'Indica tu fecha de nacimiento'
      const h = parseFloat(height.replace(',', '.'))
      if (!h || h < 100 || h > 250) return 'Indica una altura válida (en cm)'
    }
    if (step === 1) {
      if (!experience) return 'Elige tu nivel de experiencia'
      if (!goal) return 'Elige tu misión principal'
    }
    if (step === 2) {
      const w = parseFloat(weight.replace(',', '.'))
      if (!w || w < 30 || w > 300) return 'Indica un peso válido (en kg)'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStep((s) => s + 1)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const blob = await resizePhoto(file)
    setPhoto(blob)
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(URL.createObjectURL(blob))
    e.target.value = ''
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      const now = nowISO()
      await db.profiles.update(profile.id, {
        sex: sex!,
        birthDate,
        heightCm: parseFloat(height.replace(',', '.')),
        experience: experience!,
        goal: goal!,
        daysPerWeek: days,
        onboardedAt: now,
        updatedAt: now,
      })
      let xp = await logBodyWeight(profile.id, parseFloat(weight.replace(',', '.')))
      if (photo) xp += await addPhoto(profile.id, photo)
      setXpGained(xp)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
      setSaving(false)
    }
  }

  // ---- pantalla final de recompensa ----
  if (xpGained !== null) {
    return (
      <div className="finish-overlay">
        <div className="finish-card">
          <div style={{ fontSize: 44 }}>{profile.emoji}</div>
          <h2 style={{ margin: '6px 0 2px', fontSize: 20 }}>¡Personaje forjado!</h2>
          <div className="big-xp">+{xpGained} XP</div>
          <p className="muted" style={{ fontSize: 13, margin: '4px 0 14px' }}>
            Tu aventura comienza, {profile.name}. La app ya puede sugerirte pesos en cada ejercicio.
          </p>
          <button className="btn primary" onClick={onDone}>
            ⚔️ ¡A la aventura!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ paddingTop: 14 }}>
      <div className="center" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 40 }}>{profile.emoji}</div>
        <h2 style={{ fontSize: 20, margin: '6px 0 2px' }}>Forja tu personaje</h2>
        <div className="muted" style={{ fontSize: 13 }}>
          {profile.name} · paso {step + 1} de {STEPS}
        </div>
        <div className="xpbar" style={{ marginTop: 10 }}>
          <div className="fill" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="card">
          <div className="card-title">Identidad</div>
          <div className="field">
            <label>Clase</label>
            <div className="seg" style={{ marginBottom: 0 }}>
              <button className={sex === 'M' ? 'on' : ''} onClick={() => setSex('M')}>
                🚹 Hombre
              </button>
              <button className={sex === 'F' ? 'on' : ''} onClick={() => setSex('F')}>
                🚺 Mujer
              </button>
            </div>
          </div>
          <div className="field">
            <label>Fecha de nacimiento</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Altura (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ej: 175"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="card-title">Nivel y misión</div>
          <div className="field">
            <label>¿Cuánta experiencia tienes en el gym?</label>
            {(Object.entries(EXPERIENCE_LABELS) as [Experience, string][]).map(([k, label]) => (
              <button
                key={k}
                className="btn ghost"
                style={{
                  marginBottom: 8,
                  justifyContent: 'flex-start',
                  borderColor: experience === k ? 'var(--gold)' : 'var(--border)',
                  color: experience === k ? 'var(--gold-bright)' : 'var(--text)',
                }}
                onClick={() => setExperience(k)}
              >
                {experience === k ? '⚔️' : '○'} {label}
              </button>
            ))}
          </div>
          <div className="field">
            <label>Tu misión principal</label>
            <div className="grid2">
              {(Object.entries(GOAL_LABELS) as [TrainingGoal, string][]).map(([k, label]) => (
                <button
                  key={k}
                  className="btn ghost small"
                  style={{
                    width: '100%',
                    borderColor: goal === k ? 'var(--purple)' : 'var(--border)',
                    color: goal === k ? 'var(--purple-soft)' : 'var(--text)',
                  }}
                  onClick={() => setGoal(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>¿Cuántos días por semana quieres entrenar?</label>
            <div className="row">
              {[2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  className="btn small"
                  style={{
                    flex: 1,
                    background: days === d ? 'var(--purple)' : 'var(--bg2)',
                    color: days === d ? '#fff' : 'var(--muted)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={() => setDays(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="card-title">Peso actual</div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            Será tu primer registro de progreso (+XP) y la base para sugerirte pesos en los ejercicios.
          </p>
          <div className="field">
            <label>Peso corporal (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Ej: 75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="card-title">Foto del Día 1 (opcional)</div>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            Dentro de unos meses agradecerás tener esta foto. Se guarda solo en tu dispositivo.
          </p>
          {photoUrl ? (
            <>
              <img
                src={photoUrl}
                alt="Foto día 1"
                style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 10 }}
              />
              <label className="btn ghost" style={{ marginBottom: 8 }}>
                🔄 Cambiar foto
                <input type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
              </label>
            </>
          ) : (
            <label className="btn purple" style={{ marginBottom: 8 }}>
              📸 Hacer / elegir foto (+XP)
              <input type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
            </label>
          )}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--red)', padding: 12 }}>
          <span className="red-text" style={{ fontSize: 13 }}>
            ⚠️ {error}
          </span>
        </div>
      )}

      <div className="row">
        {step > 0 && (
          <button className="btn ghost" onClick={() => setStep((s) => s - 1)} disabled={saving}>
            ← Atrás
          </button>
        )}
        {step < STEPS - 1 ? (
          <button className="btn primary" onClick={next}>
            Siguiente →
          </button>
        ) : (
          <button className="btn primary" onClick={finish} disabled={saving}>
            {saving ? '⏳ Forjando...' : photo ? '🔥 ¡Forjar personaje!' : '🔥 Forjar sin foto'}
          </button>
        )}
      </div>
    </div>
  )
}
