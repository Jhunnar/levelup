import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, initDB } from './db'
import { ProfileSelect } from './views/ProfileSelect'
import { Dashboard } from './views/Dashboard'
import { Workout } from './views/Workout'
import { Body } from './views/Body'
import { Achievements } from './views/Achievements'
import { AskClaude } from './views/AskClaude'
import { SyncSettings } from './views/SyncSettings'
import { Toast } from './components/ui'
import { isConfigured } from './sync/client'
import { runSync } from './sync/engine'

type View = 'inicio' | 'entreno' | 'cuerpo' | 'logros' | 'oraculo'

const NAV: { key: View; icon: string; label: string }[] = [
  { key: 'inicio', icon: '🏰', label: 'Inicio' },
  { key: 'entreno', icon: '⚔️', label: 'Entreno' },
  { key: 'cuerpo', icon: '🛡️', label: 'Cuerpo' },
  { key: 'logros', icon: '🏅', label: 'Logros' },
  { key: 'oraculo', icon: '🔮', label: 'Oráculo' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(() => localStorage.getItem('levelup.profile'))
  const [view, setView] = useState<View>('inicio')
  const [toast, setToast] = useState<string | null>(null)
  const [showSync, setShowSync] = useState(false)

  useEffect(() => {
    initDB().then(() => setReady(true))
  }, [])

  const profile = useLiveQuery(async () => (profileId ? db.profiles.get(profileId) : undefined), [profileId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Auto-sync: al abrir la app, cada 60s, y al volver a ella (foco/visibilidad).
  useEffect(() => {
    if (!ready) return
    const trigger = () => {
      if (isConfigured() && navigator.onLine) runSync().catch(() => {})
    }
    trigger()
    const interval = setInterval(trigger, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') trigger()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', trigger)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', trigger)
    }
  }, [ready])

  if (!ready) return null

  if (!profileId) {
    return (
      <ProfileSelect
        onSelect={(id) => {
          localStorage.setItem('levelup.profile', id)
          setProfileId(id)
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">LEVEL UP</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="icon-btn" onClick={() => setShowSync(true)} title="Sincronización">
            ☁️
          </button>
          <button
            className="profile-chip"
            onClick={() => {
              localStorage.removeItem('levelup.profile')
              setProfileId(null)
              setView('inicio')
            }}
            title="Cambiar de personaje"
          >
            <span className="avatar">{profile?.emoji ?? '⚔️'}</span>
            {profile?.name ?? ''}
            <span className="muted" style={{ fontSize: 11 }}>⇄</span>
          </button>
        </div>
      </header>

      {view === 'inicio' && <Dashboard profileId={profileId} />}
      {view === 'entreno' && <Workout profileId={profileId} />}
      {view === 'cuerpo' && <Body profileId={profileId} onXp={setToast} />}
      {view === 'logros' && <Achievements profileId={profileId} />}
      {view === 'oraculo' && <AskClaude profileId={profileId} />}

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item${view === n.key ? ' active' : ''}`}
            onClick={() => setView(n.key)}
          >
            <span className="ico">{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>

      {showSync && <SyncSettings onClose={() => setShowSync(false)} />}
      {toast && <Toast message={toast} />}
    </div>
  )
}
