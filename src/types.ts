// ---- Modelo de datos (sync-ready: todo lleva id + updatedAt) ----

export interface Profile {
  id: string
  name: string
  emoji: string
  createdAt: string
  updatedAt: string
}

export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Hombro'
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Femoral'
  | 'Glúteo'
  | 'Gemelo'
  | 'Core'
  | 'Full body'
  | 'Cardio'

export interface Exercise {
  id: string
  name: string
  group: MuscleGroup
  custom: 0 | 1
  updatedAt: string
}

export interface SetEntry {
  weight: number | null
  reps: number | null
  done: boolean
}

export interface SessionExercise {
  exerciseId: string
  sets: SetEntry[]
}

export interface Session {
  id: string
  profileId: string
  routineName: string | null
  startedAt: string
  finishedAt: string | null
  exercises: SessionExercise[]
  updatedAt: string
}

export interface RoutineItem {
  exerciseId: string
  sets: number
  reps: number
}

export interface Routine {
  id: string
  profileId: string
  name: string
  items: RoutineItem[]
  updatedAt: string
}

export interface BodyLog {
  id: string
  profileId: string
  date: string // YYYY-MM-DD
  weightKg: number
  updatedAt: string
}

export const MEASURE_KEYS = ['Pecho', 'Cintura', 'Cadera', 'Brazo', 'Muslo', 'Gemelo'] as const
export type MeasureKey = (typeof MEASURE_KEYS)[number]

export interface Measurement {
  id: string
  profileId: string
  date: string
  values: Partial<Record<MeasureKey, number>>
  updatedAt: string
}

export interface ProgressPhoto {
  id: string
  profileId: string
  date: string
  blob: Blob
  updatedAt: string
}

export interface Goal {
  id: string
  profileId: string
  title: string
  type: 'body' | 'lift'
  exerciseId: string | null
  target: number
  direction: 'up' | 'down'
  startValue: number | null
  doneAt: string | null
  updatedAt: string
}

export interface XpEvent {
  id: string
  profileId: string
  amount: number
  reason: string
  icon: string
  date: string // ISO
}

export interface AchievementUnlock {
  id: string
  profileId: string
  achievementId: string
  date: string
}

export function uid(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}
