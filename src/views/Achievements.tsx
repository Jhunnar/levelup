import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { ACHIEVEMENTS } from '../game/achievements'

export function Achievements({ profileId }: { profileId: string }) {
  const unlocks = useLiveQuery(() => db.unlocks.where('profileId').equals(profileId).toArray(), [profileId])
  if (!unlocks) return null

  const unlockedMap = new Map(unlocks.map((u) => [u.achievementId, u.date]))
  const unlocked = ACHIEVEMENTS.filter((a) => unlockedMap.has(a.id))
  const locked = ACHIEVEMENTS.filter((a) => !unlockedMap.has(a.id))

  return (
    <div>
      <div className="card hero center" style={{ padding: 18 }}>
        <div style={{ fontSize: 30 }}>🏅</div>
        <div style={{ fontWeight: 800, fontSize: 18, margin: '4px 0' }}>
          {unlocked.length} / {ACHIEVEMENTS.length}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          logros desbloqueados
        </div>
      </div>

      {unlocked.length > 0 && (
        <>
          <div className="card-title" style={{ margin: '4px 0 10px' }}>
            Desbloqueados
          </div>
          <div className="ach-grid" style={{ marginBottom: 18 }}>
            {unlocked.map((a) => (
              <div className="ach-card unlocked" key={a.id}>
                <div className="ico">{a.icon}</div>
                <div className="nm">{a.name}</div>
                <div className="ds">{a.desc}</div>
                <div className="xp">
                  +{a.xp} XP ·{' '}
                  {new Date(unlockedMap.get(a.id)!).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card-title" style={{ margin: '4px 0 10px' }}>
        Por conquistar
      </div>
      <div className="ach-grid">
        {locked.map((a) => (
          <div className="ach-card locked" key={a.id}>
            <div className="ico">{a.icon}</div>
            <div className="nm">{a.name}</div>
            <div className="ds">{a.desc}</div>
            <div className="xp">+{a.xp} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}
