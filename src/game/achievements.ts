import type { BodyLog, Goal, Measurement, ProgressPhoto, Session } from '../types'

// ---- Logros ----

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  xp: number
  secret?: boolean
}

export interface AchievementContext {
  sessions: Session[] // solo terminadas
  bodyLogs: BodyLog[]
  measurements: Measurement[]
  photos: ProgressPhoto[]
  goals: Goal[]
  maxSetWeight: number
  totalPRs: number
  bothTrainedToday: boolean
}

type Check = (ctx: AchievementContext) => boolean

export const ACHIEVEMENTS: (AchievementDef & { check: Check })[] = [
  { id: 'primer_entreno', name: 'El viaje comienza', desc: 'Completa tu primer entrenamiento', icon: '🗡️', xp: 50, check: (c) => c.sessions.length >= 1 },
  { id: 'entrenos_10', name: 'Rutina forjada', desc: 'Completa 10 entrenamientos', icon: '🛡️', xp: 100, check: (c) => c.sessions.length >= 10 },
  { id: 'entrenos_25', name: 'Veterano de guerra', desc: 'Completa 25 entrenamientos', icon: '⚔️', xp: 150, check: (c) => c.sessions.length >= 25 },
  { id: 'entrenos_50', name: 'Media centuria', desc: 'Completa 50 entrenamientos', icon: '🏛️', xp: 250, check: (c) => c.sessions.length >= 50 },
  { id: 'entrenos_100', name: 'Centurión', desc: 'Completa 100 entrenamientos', icon: '👑', xp: 500, check: (c) => c.sessions.length >= 100 },
  { id: 'primer_pr', name: 'Rompe-límites', desc: 'Consigue tu primer récord personal', icon: '📈', xp: 50, check: (c) => c.totalPRs >= 1 },
  { id: 'prs_25', name: 'Coleccionista de récords', desc: 'Acumula 25 récords personales', icon: '💎', xp: 200, check: (c) => c.totalPRs >= 25 },
  { id: 'club_60', name: 'Club de los 60', desc: 'Levanta 60 kg o más en una serie', icon: '🥉', xp: 100, check: (c) => c.maxSetWeight >= 60 },
  { id: 'club_100', name: 'Club de los 100', desc: 'Levanta 100 kg o más en una serie', icon: '🥈', xp: 200, check: (c) => c.maxSetWeight >= 100 },
  { id: 'club_140', name: 'Club de los 140', desc: 'Levanta 140 kg o más en una serie', icon: '🥇', xp: 300, check: (c) => c.maxSetWeight >= 140 },
  {
    id: 'tonelada_sesion', name: 'La tonelada', desc: 'Mueve más de 5.000 kg en una sola sesión', icon: '🏗️', xp: 150,
    check: (c) => c.sessions.some((s) => s.exercises.reduce((acc, e) => acc + e.sets.reduce((a, st) => a + (st.done ? (st.weight ?? 0) * (st.reps ?? 0) : 0), 0), 0) >= 5000),
  },
  {
    id: 'madrugador', name: 'Madrugador', desc: 'Empieza un entrenamiento antes de las 8:00', icon: '🌅', xp: 50,
    check: (c) => c.sessions.some((s) => new Date(s.startedAt).getHours() < 8),
  },
  {
    id: 'noctambulo', name: 'Guerrero nocturno', desc: 'Empieza un entrenamiento después de las 21:00', icon: '🌙', xp: 50,
    check: (c) => c.sessions.some((s) => new Date(s.startedAt).getHours() >= 21),
  },
  { id: 'peso_primero', name: 'Conócete a ti mismo', desc: 'Registra tu peso corporal por primera vez', icon: '⚖️', xp: 25, check: (c) => c.bodyLogs.length >= 1 },
  { id: 'peso_20', name: 'Bajo control', desc: 'Registra tu peso 20 veces', icon: '📊', xp: 100, check: (c) => c.bodyLogs.length >= 20 },
  { id: 'medidas_primera', name: 'Cinta métrica', desc: 'Registra tus medidas corporales', icon: '📏', xp: 25, check: (c) => c.measurements.length >= 1 },
  { id: 'foto_primera', name: 'Día uno', desc: 'Guarda tu primera foto de progreso', icon: '📸', xp: 25, check: (c) => c.photos.length >= 1 },
  { id: 'fotos_10', name: 'Álbum del héroe', desc: 'Guarda 10 fotos de progreso', icon: '🖼️', xp: 100, check: (c) => c.photos.length >= 10 },
  { id: 'objetivo_1', name: 'Misión cumplida', desc: 'Completa tu primer objetivo', icon: '🏆', xp: 150, check: (c) => c.goals.some((g) => g.doneAt) },
  { id: 'objetivos_5', name: 'Cazador de misiones', desc: 'Completa 5 objetivos', icon: '🎖️', xp: 300, check: (c) => c.goals.filter((g) => g.doneAt).length >= 5 },
  { id: 'duo', name: 'Dúo dinámico', desc: 'Entrenad los dos el mismo día', icon: '🤝', xp: 100, check: (c) => c.bothTrainedToday },
  {
    id: 'semana_perfecta', name: 'Semana perfecta', desc: 'Entrena 4 o más veces en 7 días', icon: '✨', xp: 150,
    check: (c) => {
      const days = c.sessions.map((s) => new Date(s.startedAt).getTime()).sort((a, b) => a - b)
      for (let i = 0; i + 3 < days.length; i++) {
        if (days[i + 3] - days[i] <= 7 * 86400_000) return true
      }
      return false
    },
  },
]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
