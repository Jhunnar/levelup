import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { computeStats, weekStreak } from '../game/stats'
import { levelFromXp, titleForLevel } from '../game/xp'
import { XPBar } from '../components/ui'

export function Dashboard({ profileId }: { profileId: string }) {
  const profile = useLiveQuery(() => db.profiles.get(profileId), [profileId])
  const data = useLiveQuery(async () => {
    const [sessions, bodyLogs, measurements, photos, xpEvents] = await Promise.all([
      db.sessions.where('profileId').equals(profileId).toArray(),
      db.bodyLogs.where('profileId').equals(profileId).toArray(),
      db.measurements.where('profileId').equals(profileId).toArray(),
      db.photos.where('profileId').equals(profileId).toArray(),
      db.xpEvents.where('profileId').equals(profileId).toArray(),
    ])
    return { sessions, bodyLogs, measurements, photos, xpEvents }
  }, [profileId])

  if (!profile || !data) return null

  const totalXp = data.xpEvents.reduce((a, e) => a + e.amount, 0)
  const info = levelFromXp(totalXp)
  const stats = computeStats(data.sessions, data.bodyLogs, data.measurements, data.photos)
  const streak = weekStreak(data.sessions)
  const finished = data.sessions.filter((s) => s.finishedAt)

  let totalVolume = 0
  for (const s of finished)
    for (const ex of s.exercises)
      for (const set of ex.sets) if (set.done) totalVolume += (set.weight ?? 0) * (set.reps ?? 0)

  const recentXp = [...data.xpEvents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)

  return (
    <div>
      <div className="card hero">
        <div className="char-top">
          <div className="char-avatar">{profile.emoji}</div>
          <div>
            <div className="char-name">{profile.name}</div>
            <div className="char-title">{titleForLevel(info.level)}</div>
          </div>
          <div className="char-level">
            <div className="n">{info.level}</div>
            <div className="l">Nivel</div>
          </div>
        </div>
        <XPBar current={info.currentXp} needed={info.neededXp} />
      </div>

      <div className="card">
        <div className="card-title">Atributos</div>
        {stats.map((s) => (
          <div className="stat-row" key={s.key} title={s.hint}>
            <span className="ico">{s.icon}</span>
            <span className="name">{s.name}</span>
            <div className="bar">
              <div style={{ width: `${s.value}%` }} />
            </div>
            <span className="val">{s.value}</span>
          </div>
        ))}
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          Tus atributos suben automáticamente con tus datos reales de entrenamiento.
        </div>
      </div>

      <div className="grid2" style={{ marginBottom: 14 }}>
        <div className="mini-stat">
          <div className="v gold">{streak} 🔥</div>
          <div className="k">Racha de semanas</div>
        </div>
        <div className="mini-stat">
          <div className="v">{finished.length}</div>
          <div className="k">Entrenos totales</div>
        </div>
        <div className="mini-stat">
          <div className="v">{(totalVolume / 1000).toFixed(1)} t</div>
          <div className="k">Peso total movido</div>
        </div>
        <div className="mini-stat">
          <div className="v">{totalXp}</div>
          <div className="k">XP total</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Diario de aventuras</div>
        {recentXp.length === 0 ? (
          <div className="empty">
            <div className="big">📜</div>
            Tu historia aún no ha comenzado.
            <br />
            ¡Completa tu primer entrenamiento para ganar XP!
          </div>
        ) : (
          recentXp.map((e) => (
            <div className="list-item" key={e.id}>
              <span style={{ fontSize: 20 }}>{e.icon}</span>
              <div className="grow">
                <div className="t">{e.reason}</div>
                <div className="s">
                  {new Date(e.date).toLocaleDateString('es-ES', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
              </div>
              <span className="gold-text" style={{ fontWeight: 800 }}>
                +{e.amount} XP
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
