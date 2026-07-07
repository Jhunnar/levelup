import type { BodyLog, Measurement, ProgressPhoto, Session } from '../types'

// ---- Stats de personaje (1-99), derivadas de los datos reales ----

export interface CharStat {
  key: string
  name: string
  icon: string
  value: number
  hint: string
}

function clampStat(v: number): number {
  return Math.max(1, Math.min(99, Math.round(v)))
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

export function computeStats(
  sessions: Session[],
  bodyLogs: BodyLog[],
  measurements: Measurement[],
  photos: ProgressPhoto[]
): CharStat[] {
  const finished = sessions.filter((s) => s.finishedAt)

  // FUE — mejor peso levantado en una serie
  let maxWeight = 0
  // RES — más repeticiones totales en una sesión
  let maxReps = 0
  // POD — volumen total histórico (kg)
  let totalVolume = 0

  for (const s of finished) {
    let sessionReps = 0
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.done || !set.reps) continue
        const w = set.weight ?? 0
        sessionReps += set.reps
        totalVolume += w * set.reps
        if (w > maxWeight) maxWeight = w
      }
    }
    if (sessionReps > maxReps) maxReps = sessionReps
  }

  const last28 = daysAgo(28).toISOString()
  const sessions28 = finished.filter((s) => s.startedAt >= last28).length

  // DIS — días distintos con actividad (entreno o registro corporal) en los últimos 30
  const activeDays = new Set<string>()
  const cutoff30 = daysAgo(30).toISOString().slice(0, 10)
  for (const s of finished) {
    const day = s.startedAt.slice(0, 10)
    if (day >= cutoff30) activeDays.add(day)
  }
  for (const b of bodyLogs) if (b.date >= cutoff30) activeDays.add(b.date)
  for (const m of measurements) if (m.date >= cutoff30) activeDays.add(m.date)

  // VIT — registros corporales en los últimos 30 días
  const vitCount =
    bodyLogs.filter((b) => b.date >= cutoff30).length +
    measurements.filter((m) => m.date >= cutoff30).length +
    photos.filter((p) => p.date >= cutoff30).length

  const tons = totalVolume / 1000

  return [
    {
      key: 'FUE',
      name: 'Fuerza',
      icon: '💪',
      value: clampStat(maxWeight * 0.55 + 4),
      hint: `Mejor serie: ${maxWeight} kg`,
    },
    {
      key: 'RES',
      name: 'Resistencia',
      icon: '🔥',
      value: clampStat(maxReps / 3),
      hint: `Récord: ${maxReps} reps en una sesión`,
    },
    {
      key: 'CON',
      name: 'Constancia',
      icon: '📅',
      value: clampStat((sessions28 / 16) * 99),
      hint: `${sessions28} entrenos en 4 semanas`,
    },
    {
      key: 'DIS',
      name: 'Disciplina',
      icon: '🎯',
      value: clampStat((activeDays.size / 30) * 99 * 1.6),
      hint: `${activeDays.size} días activos de 30`,
    },
    {
      key: 'VIT',
      name: 'Vitalidad',
      icon: '❤️',
      value: clampStat((vitCount / 12) * 99),
      hint: `${vitCount} registros corporales / 30 días`,
    },
    {
      key: 'POD',
      name: 'Poder',
      icon: '⚡',
      value: clampStat(30 * Math.log10(tons + 1)),
      hint: `${tons.toFixed(1)} toneladas movidas en total`,
    },
  ]
}

// Racha: semanas consecutivas (hacia atrás desde esta) con >= 2 entrenos
export function weekStreak(sessions: Session[]): number {
  const finished = sessions.filter((s) => s.finishedAt)
  if (finished.length === 0) return 0
  const perWeek = new Map<string, number>()
  for (const s of finished) {
    const d = new Date(s.startedAt)
    const monday = new Date(d)
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toISOString().slice(0, 10)
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1)
  }
  let streak = 0
  const cur = new Date()
  cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7))
  for (let i = 0; i < 520; i++) {
    const key = cur.toISOString().slice(0, 10)
    const count = perWeek.get(key) ?? 0
    if (count >= 2) streak++
    else if (i === 0) {
      // la semana actual aún puede completarse: no rompe la racha
    } else break
    cur.setDate(cur.getDate() - 7)
  }
  return streak
}
