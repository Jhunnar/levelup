import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { levelFromXp, titleForLevel } from '../game/xp'

export function ProfileSelect({ onSelect }: { onSelect: (id: string) => void }) {
  const profiles = useLiveQuery(() => db.profiles.toArray(), [])
  const xpByProfile = useLiveQuery(async () => {
    const events = await db.xpEvents.toArray()
    const map = new Map<string, number>()
    for (const e of events) map.set(e.profileId, (map.get(e.profileId) ?? 0) + e.amount)
    return map
  }, [])

  if (!profiles) return null

  return (
    <div className="select-screen">
      <div>
        <div className="select-title">LEVEL UP</div>
        <div className="select-sub">⚔️ Elige tu personaje ⚔️</div>
      </div>
      {profiles.map((p) => {
        const info = levelFromXp(xpByProfile?.get(p.id) ?? 0)
        return (
          <button key={p.id} className="char-select-card" onClick={() => onSelect(p.id)}>
            <span className="em">{p.emoji}</span>
            <span className="info">
              <div className="nm">{p.name}</div>
              <div className="lv">
                Nivel {info.level} · {titleForLevel(info.level)}
              </div>
            </span>
            <span style={{ fontSize: 22, color: 'var(--muted)' }}>›</span>
          </button>
        )
      })}
    </div>
  )
}
