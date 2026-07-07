import type { Experience, Profile, Sex } from '../types'

// ---- Sugerencia de peso inicial por ejercicio ----
//
// Basado en estándares de fuerza: estimamos el 1RM como un múltiplo del
// peso corporal (referencia: hombre de nivel medio), lo ajustamos por
// experiencia y sexo, y sugerimos el peso de trabajo para 8-10 reps
// (~70% del 1RM), redondeado a 2.5 kg.

interface ExerciseStandard {
  mult: number // 1RM / peso corporal para hombre nivel 'medio'
  zone: 'upper' | 'lower'
  perDumbbell?: boolean // la sugerencia es por mancuerna
}

const EXP_FACTOR: Record<Experience, number> = {
  nuevo: 0.45,
  poco: 0.65,
  medio: 1.0,
  avanzado: 1.3,
}

const SEX_FACTOR: Record<Sex, { upper: number; lower: number }> = {
  M: { upper: 1, lower: 1 },
  F: { upper: 0.55, lower: 0.75 },
}

// claves = IDs deterministas del catálogo (ex-<slug>)
const STANDARDS: Record<string, ExerciseStandard> = {
  // Pecho
  'ex-press-banca-con-barra': { mult: 0.85, zone: 'upper' },
  'ex-press-banca-inclinado-con-barra': { mult: 0.72, zone: 'upper' },
  'ex-press-declinado': { mult: 0.85, zone: 'upper' },
  'ex-press-banca-con-mancuernas': { mult: 0.3, zone: 'upper', perDumbbell: true },
  'ex-press-inclinado-con-mancuernas': { mult: 0.26, zone: 'upper', perDumbbell: true },
  'ex-press-en-maquina': { mult: 0.8, zone: 'upper' },
  'ex-aperturas-con-mancuernas': { mult: 0.12, zone: 'upper', perDumbbell: true },
  'ex-cruces-en-polea': { mult: 0.18, zone: 'upper' },
  // Espalda
  'ex-jalon-al-pecho': { mult: 0.75, zone: 'upper' },
  'ex-jalon-con-agarre-cerrado': { mult: 0.75, zone: 'upper' },
  'ex-remo-con-barra': { mult: 0.75, zone: 'upper' },
  'ex-remo-con-mancuerna': { mult: 0.28, zone: 'upper', perDumbbell: true },
  'ex-remo-en-polea-baja': { mult: 0.75, zone: 'upper' },
  'ex-remo-en-maquina': { mult: 0.75, zone: 'upper' },
  'ex-remo-t': { mult: 0.7, zone: 'upper' },
  'ex-peso-muerto': { mult: 1.3, zone: 'lower' },
  'ex-rack-pull': { mult: 1.45, zone: 'lower' },
  'ex-pull-over-en-polea': { mult: 0.35, zone: 'upper' },
  'ex-face-pull': { mult: 0.25, zone: 'upper' },
  // Hombro
  'ex-press-militar-con-barra': { mult: 0.55, zone: 'upper' },
  'ex-press-militar-con-mancuernas': { mult: 0.2, zone: 'upper', perDumbbell: true },
  'ex-press-arnold': { mult: 0.18, zone: 'upper', perDumbbell: true },
  'ex-press-en-maquina-hombro': { mult: 0.5, zone: 'upper' },
  'ex-elevaciones-laterales': { mult: 0.07, zone: 'upper', perDumbbell: true },
  'ex-elevaciones-laterales-en-polea': { mult: 0.08, zone: 'upper' },
  'ex-elevaciones-frontales': { mult: 0.08, zone: 'upper', perDumbbell: true },
  'ex-pajaros-deltoides-posterior': { mult: 0.08, zone: 'upper', perDumbbell: true },
  'ex-encogimientos-trapecio': { mult: 0.35, zone: 'upper', perDumbbell: true },
  'ex-remo-al-menton': { mult: 0.35, zone: 'upper' },
  // Bíceps
  'ex-curl-con-barra': { mult: 0.4, zone: 'upper' },
  'ex-curl-con-barra-z': { mult: 0.4, zone: 'upper' },
  'ex-curl-con-mancuernas': { mult: 0.14, zone: 'upper', perDumbbell: true },
  'ex-curl-alterno': { mult: 0.14, zone: 'upper', perDumbbell: true },
  'ex-curl-martillo': { mult: 0.14, zone: 'upper', perDumbbell: true },
  'ex-curl-inclinado': { mult: 0.12, zone: 'upper', perDumbbell: true },
  'ex-curl-en-predicador-scott': { mult: 0.32, zone: 'upper' },
  'ex-curl-en-polea': { mult: 0.35, zone: 'upper' },
  // Tríceps
  'ex-press-frances': { mult: 0.3, zone: 'upper' },
  'ex-extension-de-triceps-en-polea': { mult: 0.35, zone: 'upper' },
  'ex-extension-con-cuerda': { mult: 0.3, zone: 'upper' },
  'ex-extension-sobre-la-cabeza': { mult: 0.25, zone: 'upper' },
  'ex-press-cerrado': { mult: 0.7, zone: 'upper' },
  'ex-patada-de-triceps': { mult: 0.08, zone: 'upper', perDumbbell: true },
  // Cuádriceps
  'ex-sentadilla-con-barra': { mult: 1.1, zone: 'lower' },
  'ex-sentadilla-frontal': { mult: 0.85, zone: 'lower' },
  'ex-sentadilla-goblet': { mult: 0.35, zone: 'lower' },
  'ex-sentadilla-hack': { mult: 1.3, zone: 'lower' },
  'ex-prensa-de-piernas': { mult: 2.0, zone: 'lower' },
  'ex-extension-de-cuadriceps': { mult: 0.55, zone: 'lower' },
  'ex-zancadas-con-mancuernas': { mult: 0.22, zone: 'lower', perDumbbell: true },
  'ex-zancadas-con-barra': { mult: 0.6, zone: 'lower' },
  'ex-sentadilla-bulgara': { mult: 0.2, zone: 'lower', perDumbbell: true },
  'ex-step-up-al-cajon': { mult: 0.18, zone: 'lower', perDumbbell: true },
  // Femoral / Glúteo
  'ex-peso-muerto-rumano': { mult: 1.0, zone: 'lower' },
  'ex-peso-muerto-con-mancuernas': { mult: 0.35, zone: 'lower', perDumbbell: true },
  'ex-curl-femoral-tumbado': { mult: 0.45, zone: 'lower' },
  'ex-curl-femoral-sentado': { mult: 0.5, zone: 'lower' },
  'ex-buenos-dias': { mult: 0.5, zone: 'lower' },
  'ex-hip-thrust': { mult: 1.3, zone: 'lower' },
  'ex-puente-de-gluteo': { mult: 0.8, zone: 'lower' },
  'ex-patada-de-gluteo-en-polea': { mult: 0.2, zone: 'lower' },
  'ex-abduccion-en-maquina': { mult: 0.6, zone: 'lower' },
  'ex-peso-muerto-sumo': { mult: 1.25, zone: 'lower' },
  // Gemelo
  'ex-elevacion-de-talones-de-pie': { mult: 1.0, zone: 'lower' },
  'ex-elevacion-de-talones-sentado': { mult: 0.6, zone: 'lower' },
  'ex-elevacion-de-talones-en-prensa': { mult: 1.4, zone: 'lower' },
  // Core
  'ex-crunch-en-polea': { mult: 0.4, zone: 'upper' },
  'ex-ab-crunch-en-maquina': { mult: 0.45, zone: 'upper' },
  'ex-russian-twist': { mult: 0.1, zone: 'upper' },
  'ex-pallof-press': { mult: 0.15, zone: 'upper' },
  // Full body
  'ex-clean-and-press': { mult: 0.55, zone: 'lower' },
  'ex-kettlebell-swing': { mult: 0.3, zone: 'lower' },
  'ex-farmer-walk': { mult: 0.4, zone: 'lower', perDumbbell: true },
  'ex-thruster': { mult: 0.45, zone: 'lower' },
}

export interface WeightSuggestion {
  weight: number
  perDumbbell: boolean
}

export function suggestWeight(
  profile: Profile | undefined,
  bodyWeightKg: number | null,
  exerciseId: string
): WeightSuggestion | null {
  if (!profile?.sex || !profile.experience || !bodyWeightKg) return null
  const std = STANDARDS[exerciseId]
  if (!std) return null

  const oneRM = bodyWeightKg * std.mult * EXP_FACTOR[profile.experience] * SEX_FACTOR[profile.sex][std.zone]
  const working = oneRM * 0.7
  const rounded = Math.max(2.5, Math.round(working / 2.5) * 2.5)
  return { weight: rounded, perDumbbell: std.perDumbbell ?? false }
}
