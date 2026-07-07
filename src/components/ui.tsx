import { useEffect, type ReactNode } from 'react'

// ---- Componentes básicos reutilizables ----

export function Modal({
  onClose,
  children,
}: {
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal">{children}</div>
    </div>
  )
}

export function XPBar({ current, needed }: { current: number; needed: number }) {
  const pct = Math.min(100, (current / needed) * 100)
  return (
    <div className="xpbar-wrap">
      <div className="xpbar-labels">
        <span>XP</span>
        <span>
          {current} / {needed}
        </span>
      </div>
      <div className="xpbar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export interface ChartPoint {
  label: string
  value: number
}

/** Gráfica de línea SVG minimalista con relleno degradado */
export function LineChart({
  points,
  color = '#e0b252',
  height = 140,
  unit = '',
}: {
  points: ChartPoint[]
  color?: string
  height?: number
  unit?: string
}) {
  if (points.length === 0) return null
  const W = 320
  const H = height
  const PAD = { t: 18, r: 10, b: 22, l: 34 }
  const vals = points.map((p) => p.value)
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  min -= span * 0.12
  max += span * 0.12

  const x = (i: number) =>
    points.length === 1
      ? W / 2
      : PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${path} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`
  const gid = `g${color.replace(/[^a-z0-9]/gi, '')}`

  const last = points[points.length - 1]
  const first = points[0]

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={PAD.t + f * (H - PAD.t - PAD.b)}
            y2={PAD.t + f * (H - PAD.t - PAD.b)}
            stroke="#2c2745"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 20 &&
          points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill={color} />)}
        {/* etiquetas min/max */}
        <text x={4} y={y(vals.reduce((a, b) => Math.max(a, b)) )+ 4} fontSize="10" fill="#8d86a8">
          {Math.max(...vals)}
        </text>
        <text x={4} y={y(Math.min(...vals)) + 4} fontSize="10" fill="#8d86a8">
          {Math.min(...vals)}
        </text>
        <text x={PAD.l} y={H - 6} fontSize="9.5" fill="#8d86a8">
          {first.label}
        </text>
        <text x={W - PAD.r} y={H - 6} fontSize="9.5" fill="#8d86a8" textAnchor="end">
          {last.label}
        </text>
        <text x={x(points.length - 1)} y={y(last.value) - 8} fontSize="11" fontWeight="700" fill={color} textAnchor="end">
          {last.value}
          {unit}
        </text>
      </svg>
    </div>
  )
}

export function Toast({ message }: { message: string }) {
  return <div className="toast">{message}</div>
}
