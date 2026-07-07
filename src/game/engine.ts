import { db } from '../db'
import type { Session, XpEvent } from '../types'
import { nowISO, todayStr, uid } from '../types'
import { ACHIEVEMENTS, getAchievement, type AchievementContext } from './achievements'
import { XP } from './xp'

// ---- Motor del juego: otorga XP, detecta PRs, desbloquea logros ----

export interface PRRecord {
  exerciseId: string
  exerciseName: string
  weight: number
  previous: number
}

export interface FinishResult {
  xpGained: number
  prs: PRRecord[]
  newAchievements: { id: string; name: string; icon: string; xp: number }[]
  goalsCompleted: string[]
  totalVolume: number
  totalSets: number
}

async function addXp(profileId: string, amount: number, reason: string, icon: string): Promise<void> {
  const ev: XpEvent = { id: uid(), profileId, amount, reason, icon, date: nowISO() }
  await db.xpEvents.add(ev)
}

export async function totalXp(profileId: string): Promise<number> {
  const events = await db.xpEvents.where('profileId').equals(profileId).toArray()
  return events.reduce((a, e) => a + e.amount, 0)
}

/** Mejor peso por ejercicio en sesiones TERMINADAS antes de la fecha dada */
function bestWeights(sessions: Session[], excludeId?: string): Map<string, number> {
  const best = new Map<string, number>()
  for (const s of sessions) {
    if (!s.finishedAt || s.id === excludeId) continue
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.done || !set.weight || !set.reps) continue
        if (set.weight > (best.get(ex.exerciseId) ?? 0)) best.set(ex.exerciseId, set.weight)
      }
    }
  }
  return best
}

async function checkAchievements(profileId: string): Promise<FinishResult['newAchievements']> {
  const [sessions, bodyLogs, measurements, photos, goals, unlocks, allProfiles] = await Promise.all([
    db.sessions.where('profileId').equals(profileId).toArray(),
    db.bodyLogs.where('profileId').equals(profileId).toArray(),
    db.measurements.where('profileId').equals(profileId).toArray(),
    db.photos.where('profileId').equals(profileId).toArray(),
    db.goals.where('profileId').equals(profileId).toArray(),
    db.unlocks.where('profileId').equals(profileId).toArray(),
    db.profiles.toArray(),
  ])
  const finished = sessions.filter((s) => s.finishedAt)

  let maxSetWeight = 0
  for (const s of finished)
    for (const ex of s.exercises)
      for (const set of ex.sets)
        if (set.done && set.weight && set.weight > maxSetWeight) maxSetWeight = set.weight

  // PRs acumulados: cuenta de eventos XP con motivo de récord
  const xpEvents = await db.xpEvents.where('profileId').equals(profileId).toArray()
  const totalPRs = xpEvents.filter((e) => e.reason.startsWith('Récord')).length

  // ¿Han entrenado los dos hoy?
  const today = todayStr()
  const others = allProfiles.filter((p) => p.id !== profileId)
  let bothTrainedToday = false
  if (finished.some((s) => s.startedAt.slice(0, 10) === today)) {
    for (const other of others) {
      const otherSessions = await db.sessions.where('profileId').equals(other.id).toArray()
      if (otherSessions.some((s) => s.finishedAt && s.startedAt.slice(0, 10) === today)) {
        bothTrainedToday = true
        break
      }
    }
  }

  const ctx: AchievementContext = {
    sessions: finished,
    bodyLogs,
    measurements,
    photos,
    goals,
    maxSetWeight,
    totalPRs,
    bothTrainedToday,
  }

  const unlockedIds = new Set(unlocks.map((u) => u.achievementId))
  const news: FinishResult['newAchievements'] = []
  for (const a of ACHIEVEMENTS) {
    if (unlockedIds.has(a.id)) continue
    if (a.check(ctx)) {
      await db.unlocks.add({ id: uid(), profileId, achievementId: a.id, date: nowISO() })
      await addXp(profileId, a.xp, `Logro: ${a.name}`, a.icon)
      news.push({ id: a.id, name: a.name, icon: a.icon, xp: a.xp })
    }
  }
  return news
}

async function checkGoals(profileId: string): Promise<string[]> {
  const goals = await db.goals.where('profileId').equals(profileId).toArray()
  const pending = goals.filter((g) => !g.doneAt)
  if (pending.length === 0) return []
  const completed: string[] = []

  for (const g of pending) {
    let reached = false
    if (g.type === 'body') {
      const logs = await db.bodyLogs.where('profileId').equals(profileId).toArray()
      if (logs.length > 0) {
        const latest = logs.sort((a, b) => a.date.localeCompare(b.date))[logs.length - 1]
        reached = g.direction === 'down' ? latest.weightKg <= g.target : latest.weightKg >= g.target
      }
    } else if (g.type === 'lift' && g.exerciseId) {
      const sessions = await db.sessions.where('profileId').equals(profileId).toArray()
      const best = bestWeights(sessions).get(g.exerciseId) ?? 0
      reached = best >= g.target
    }
    if (reached) {
      await db.goals.update(g.id, { doneAt: nowISO(), updatedAt: nowISO() })
      await addXp(profileId, XP.GOAL_DONE, `Objetivo: ${g.title}`, '🏆')
      completed.push(g.title)
    }
  }
  return completed
}

/** Termina la sesión activa: guarda, calcula XP, récords, logros y objetivos */
export async function finishSession(sessionId: string): Promise<FinishResult> {
  const session = await db.sessions.get(sessionId)
  if (!session) throw new Error('Sesión no encontrada')
  const profileId = session.profileId

  // limpia sets vacíos / ejercicios sin sets hechos
  const cleaned = session.exercises
    .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.done && s.reps) }))
    .filter((ex) => ex.sets.length > 0)

  const now = nowISO()
  await db.sessions.update(sessionId, { exercises: cleaned, finishedAt: now, updatedAt: now })

  let totalSets = 0
  let totalVolume = 0
  for (const ex of cleaned)
    for (const set of ex.sets) {
      totalSets++
      totalVolume += (set.weight ?? 0) * (set.reps ?? 0)
    }

  // XP base de la sesión
  let xpGained = 0
  if (totalSets > 0) {
    const setXp = Math.min(totalSets, XP.SESSION_CAP_SETS) * XP.PER_SET
    xpGained += XP.SESSION_BASE + setXp
    await addXp(profileId, XP.SESSION_BASE + setXp, 'Entrenamiento completado', '🏋️')
  }

  // Récords personales
  const allSessions = await db.sessions.where('profileId').equals(profileId).toArray()
  const previousBest = bestWeights(allSessions, sessionId)
  const prs: PRRecord[] = []
  for (const ex of cleaned) {
    let sessionMax = 0
    for (const set of ex.sets) if (set.weight && set.weight > sessionMax) sessionMax = set.weight
    const prev = previousBest.get(ex.exerciseId) ?? 0
    if (sessionMax > prev && sessionMax > 0) {
      const exercise = await db.exercises.get(ex.exerciseId)
      const name = exercise?.name ?? 'Ejercicio'
      prs.push({ exerciseId: ex.exerciseId, exerciseName: name, weight: sessionMax, previous: prev })
      xpGained += XP.PR
      await addXp(profileId, XP.PR, `Récord en ${name}: ${sessionMax} kg`, '📈')
    }
  }

  const goalsCompleted = await checkGoals(profileId)
  xpGained += goalsCompleted.length * XP.GOAL_DONE

  const newAchievements = await checkAchievements(profileId)
  xpGained += newAchievements.reduce((a, n) => a + n.xp, 0)

  return { xpGained, prs, newAchievements, goalsCompleted, totalVolume, totalSets }
}

/** Registrar peso corporal (max 1 recompensa XP por día) */
export async function logBodyWeight(profileId: string, weightKg: number): Promise<number> {
  const date = todayStr()
  const existing = await db.bodyLogs.where('[profileId+date]').equals([profileId, date]).first()
  const now = nowISO()
  if (existing) {
    await db.bodyLogs.update(existing.id, { weightKg, updatedAt: now })
  } else {
    await db.bodyLogs.add({ id: uid(), profileId, date, weightKg, updatedAt: now })
    await addXp(profileId, XP.BODY_LOG, 'Peso corporal registrado', '⚖️')
  }
  let gained = existing ? 0 : XP.BODY_LOG
  const goals = await checkGoals(profileId)
  gained += goals.length * XP.GOAL_DONE
  const news = await checkAchievements(profileId)
  gained += news.reduce((a, n) => a + n.xp, 0)
  return gained
}

export async function logMeasurement(
  profileId: string,
  values: Record<string, number>
): Promise<number> {
  const now = nowISO()
  await db.measurements.add({ id: uid(), profileId, date: todayStr(), values, updatedAt: now })
  await addXp(profileId, XP.MEASUREMENT, 'Medidas registradas', '📏')
  const news = await checkAchievements(profileId)
  return XP.MEASUREMENT + news.reduce((a, n) => a + n.xp, 0)
}

export async function addPhoto(profileId: string, blob: Blob): Promise<number> {
  const now = nowISO()
  await db.photos.add({ id: uid(), profileId, date: todayStr(), blob, updatedAt: now })
  await addXp(profileId, XP.PHOTO, 'Foto de progreso guardada', '📸')
  const news = await checkAchievements(profileId)
  return XP.PHOTO + news.reduce((a, n) => a + n.xp, 0)
}

export { getAchievement }
