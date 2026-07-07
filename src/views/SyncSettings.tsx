import { useEffect, useState } from 'react'
import { Modal } from '../components/ui'
import { clearCreds, getCreds, isConfigured, saveCreds } from '../sync/client'
import { getLastResult, resetSyncWatermark, runSync, type SyncResult } from '../sync/engine'

export function SyncSettings({ onClose }: { onClose: () => void }) {
  const existing = getCreds()
  const [url, setUrl] = useState(existing?.url ?? '')
  const [key, setKey] = useState(existing?.key ?? '')
  const [configured, setConfigured] = useState(isConfigured())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<SyncResult | null>(getLastResult())

  useEffect(() => {
    const h = () => setLast(getLastResult())
    window.addEventListener('levelup-sync', h)
    return () => window.removeEventListener('levelup-sync', h)
  }, [])

  async function connect() {
    setError(null)
    if (!/^https:\/\/.+\.supabase\.co$/.test(url.trim().replace(/\/+$/, ''))) {
      setError('La URL debe tener el formato https://xxxx.supabase.co')
      return
    }
    if (key.trim().length < 30) {
      setError('La clave anon parece incompleta')
      return
    }
    setBusy(true)
    saveCreds({ url, key })
    try {
      const r = await runSync()
      setConfigured(true)
      setLast(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      clearCreds()
      setConfigured(false)
    } finally {
      setBusy(false)
    }
  }

  async function syncNow() {
    setError(null)
    setBusy(true)
    try {
      setLast(await runSync())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  function disconnect() {
    if (!confirm('¿Desconectar la sincronización en este dispositivo? Tus datos locales no se borran.')) return
    clearCreds()
    resetSyncWatermark()
    setConfigured(false)
    setUrl('')
    setKey('')
  }

  return (
    <Modal onClose={onClose}>
      <h3>☁️ Sincronización</h3>

      {configured ? (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ fontWeight: 700 }}>Conectado</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {getCreds()?.url.replace('https://', '')}
                </div>
              </div>
            </div>
            {last && (
              <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                Última sincronización:{' '}
                {new Date(last.at).toLocaleString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · ↓{last.pulled} ↑{last.pushed}
              </div>
            )}
          </div>

          <button className="btn primary" onClick={syncNow} disabled={busy}>
            {busy ? '🔄 Sincronizando...' : '🔄 Sincronizar ahora'}
          </button>
          <button className="btn ghost mt" onClick={disconnect} disabled={busy}>
            Desconectar este dispositivo
          </button>
        </>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, marginBottom: 14 }}>
            Pega la <b>URL del proyecto</b> y la <b>clave anon (public)</b> de Supabase. Las dos personas
            debéis usar el <b>mismo proyecto</b> para ver el progreso del otro. Las claves se guardan solo en
            este dispositivo.
          </p>
          <div className="field">
            <label>URL del proyecto</label>
            <input placeholder="https://xxxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="field">
            <label>Clave anon (public)</label>
            <input placeholder="eyJhbGci..." value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <button className="btn primary" onClick={connect} disabled={busy}>
            {busy ? '🔄 Conectando...' : '🔌 Conectar y sincronizar'}
          </button>
        </>
      )}

      {error && (
        <div className="card mt" style={{ borderColor: 'var(--red)' }}>
          <div className="red-text" style={{ fontSize: 13 }}>
            ⚠️ {error}
          </div>
        </div>
      )}
    </Modal>
  )
}
