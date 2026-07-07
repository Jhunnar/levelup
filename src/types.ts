// ---- Modelo de datos (sync-ready: todo lleva id + updatedAt) ----

export type Sex = 'M' | 'F'
export type Experience = 'nuevo' | 'poco' | 'medio' | 'avanzado'
export type TrainingGoal = 'grasa' | 'musculo' | 'fuerza' | 'salud'

export interface Profile {
  id: string
  name: string
  emoji: string
  createdAt: string
  updatedAt: string
  // datos del onboarding (opcionales hasta completarlo)
  sex?: Sex
  birthDate?: string // YYYY-MM-DD
  heightCm?: number
  experience?: Experience
  goal?: TrainingGoal
  daysPerWeek?: number
  onboardedAt?: string
}

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  nuevo: 'Nunca he entrenado',
  poco: 'Menos de 6 meses',
  medio: 'De 6 meses a 2 años',
  avanzado: 'Más de 2 años',
}

export const GOAL_LABELS: Record<TrainingGoal, string> = {
  grasa: 'Perder grasa',
  musculo: 'Ganar músculo',
  fuerza: 'Ganar fuerza',
  salud: 'Salud y energía',
}

export function ageFrom(birthDate: string): number {
  const b = new Date(birthDate)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
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
