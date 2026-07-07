// ---- Sistema de XP y niveles ----
// XP necesaria para pasar del nivel n al n+1: 100 + 60*(n-1)
// Nivel 1→2: 100 · 2→3: 160 · 3→4: 220 ...

export function xpForNextLevel(level: number): number {
  return 100 + 60 * (level - 1)
}

export interface LevelInfo {
  level: number
  currentXp: number // XP dentro del nivel actual
  neededXp: number // XP para subir al siguiente
  totalXp: number
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1
  let rest = totalXp
  while (rest >= xpForNextLevel(level)) {
    rest -= xpForNextLevel(level)
    level++
    if (level > 999) break
  }
  return { level, currentXp: rest, neededXp: xpForNextLevel(level), totalXp }
}

export function titleForLevel(level: number): string {
  if (level >= 50) return 'Leyenda del Hierro'
  if (level >= 40) return 'Semidiós del Gym'
  if (level >= 30) return 'Maestro de la Forja'
  if (level >= 25) return 'Campeón'
  if (level >= 20) return 'Gladiador'
  if (level >= 15) return 'Veterano'
  if (level >= 10) return 'Guerrero'
  if (level >= 6) return 'Escudero'
  if (level >= 3) return 'Aprendiz'
  return 'Novato'
}

// Recompensas base
export const XP = {
  SESSION_BASE: 50,
  PER_SET: 3,
  SESSION_CAP_SETS: 30, // máx sets que dan XP por sesión
  PR: 25,
  BODY_LOG: 10,
  MEASUREMENT: 15,
  PHOTO: 15,
  GOAL_DONE: 100,
} as const
