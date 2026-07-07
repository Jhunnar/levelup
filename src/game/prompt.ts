import { db } from '../db'
import type { Session } from '../types'

// ---- Construye el resumen de datos para pegar en Claude ----

export interface PromptOptions {
  includeSessions: boolean
  includePRs: boolean
  includeBody: boolean
  includeMeasures: boolean
  includeGoals: boolean
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export async function buildClaudePrompt(
  profileId: string,
  question: string,
  opts: PromptOptions
): Promise<string> {
  const profile = await db.profiles.get(profileId)
  const parts: string[] = []

  parts.push(
    `Soy ${profile?.name ?? 'un usuario'} y uso una app de seguimiento de gym. Estos son mis datos reales de entrenamiento. Actúa como mi entrenador personal y responde a mi pregunta al final.`
  )

  if (opts.includeSessions) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 28)
    const sessions = (await db.sessions.where('profileId').equals(profileId).toArray())
      .filter((s): s is Session & { finishedAt: string } => !!s.finishedAt && s.startedAt >= cutoff.toISOString())
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))

    if (sessions.length > 0) {
      const exNames = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]))
      const lines: string[] = [`\n## Entrenamientos (últimas 4 semanas, ${sessions.length} sesiones)`]
      for (const s of sessions) {
        const exLines = s.exercises.map((ex) => {
          const sets = ex.sets
            .filter((st) => st.done)
            .map((st) => `${st.weight ?? 0}kg x ${st.reps ?? 0}`)
            .join(', ')
          return `  - ${exNames.get(ex.exerciseId) ?? '?'}: ${sets}`
        })
        lines.push(`- ${fmtDate(s.startedAt)}${s.routineName ? ` (${s.routineName})` : ''}:\n${exLines.join('\n')}`)
      }
      parts.push(lines.join('\n'))
    }
  }

  if (opts.includePRs) {
    const sessions = (await db.sessions.where('profileId').equals(profileId).toArray()).filter((s) => s.finishedAt)
    const best = new Map<string, number>()
    for (const s of sessions)
      for (const ex of s.exercises)
        for (const set of ex.sets)
          if (set.done && set.weight && set.weight > (best.get(ex.exerciseId) ?? 0))
            best.set(ex.exerciseId, set.weight)
    if (best.size > 0) {
      const exNames = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]))
      const sorted = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
      parts.push(
        `\n## Mis récords personales\n` + sorted.map(([id, w]) => `- ${exNames.get(id) ?? '?'}: ${w} kg`).join('\n')
      )
    }
  }

  if (opts.includeBody) {
    const logs = (await db.bodyLogs.where('profileId').equals(profileId).toArray()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    if (logs.length > 0) {
      const recent = logs.slice(-10)
      parts.push(
        `\n## Evolución de peso corporal\n` +
          recent.map((l) => `- ${l.date}: ${l.weightKg} kg`).join('\n') +
          (logs.length > 1
            ? `\n(Cambio total desde el primer registro: ${(logs[logs.length - 1].weightKg - logs[0].weightKg).toFixed(1)} kg)`
            : '')
      )
    }
  }

  if (opts.includeMeasures) {
    const ms = (await db.measurements.where('profileId').equals(profileId).toArray()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    if (ms.length > 0) {
      const last = ms[ms.length - 1]
      const first = ms[0]
      const lines = Object.entries(last.values).map(([k, v]) => {
        const prev = first.values[k as keyof typeof first.values]
        const delta = prev != null && ms.length > 1 ? ` (${v! - prev > 0 ? '+' : ''}${(v! - prev).toFixed(1)} cm desde ${first.date})` : ''
        return `- ${k}: ${v} cm${delta}`
      })
      parts.push(`\n## Medidas corporales (${last.date})\n` + lines.join('\n'))
    }
  }

  if (opts.includeGoals) {
    const goals = await db.goals.where('profileId').equals(profileId).toArray()
    const pending = goals.filter((g) => !g.doneAt)
    if (pending.length > 0) {
      parts.push(
        `\n## Mis objetivos actuales\n` +
          pending.map((g) => `- ${g.title} (meta: ${g.target} kg)`).join('\n')
      )
    }
  }

  parts.push(`\n## Mi pregunta\n${question.trim()}`)
  return parts.join('\n')
}
