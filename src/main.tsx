import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// PWA: registrar service worker (solo web en producción).
// En la APK (Capacitor sirve desde localhost) no hace falta: ya es offline.
const isCapacitor = location.protocol === 'capacitor:' || location.hostname === 'localhost'
if ('serviceWorker' in navigator && import.meta.env.PROD && !isCapacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // sin SW no pasa nada: la app sigue funcionando online
    })
  })
}
