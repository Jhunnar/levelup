import { useState } from 'react'
import { buildClaudePrompt, type PromptOptions } from '../game/prompt'

const OPTION_LABELS: { key: keyof PromptOptions; label: string }[] = [
  { key: 'includeSessions', label: '🏋️ Entrenamientos (últimas 4 semanas)' },
  { key: 'includePRs', label: '📈 Récords personales' },
  { key: 'includeBody', label: '⚖️ Evolución de peso corporal' },
  { key: 'includeMeasures', label: '📏 Medidas corporales' },
  { key: 'includeGoals', label: '🎯 Objetivos actuales' },
]

const SUGGESTIONS = [
  '¿Cómo puedo progresar más rápido en press banca?',
  '¿Está bien equilibrada mi rutina semanal?',
  'Llevo 2 semanas estancado, ¿qué cambio?',
  '¿Cuántas calorías debería comer según mi progreso?',
  'Me molesta el hombro en el press, ¿alternativas?',
]

export function AskClaude({ profileId }: { profileId: string }) {
  const [question, setQuestion] = useState('')
  const [opts, setOpts] = useState<PromptOptions>({
    includeSessions: true,
    includePRs: true,
    includeBody: true,
    includeMeasures: false,
    includeGoals: true,
  })
  const [copied, setCopied] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  async function copyAndOpen() {
    if (!question.trim()) return
    const prompt = await buildClaudePrompt(profileId, question, opts)
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {
      setPreview(prompt) // fallback: mostrar para copiar a mano
      return
    }
    setCopied(true)
    setTimeout(() => {
      window.open('https://claude.ai/new', '_blank')
      setCopied(false)
    }, 900)
  }

  return (
    <div>
      <div className="card hero">
        <div className="row" style={{ gap: 12 }}>
          <span style={{ fontSize: 32 }}>🧙‍♂️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>El Oráculo</div>
            <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>
              Pregunta a Claude con tus datos reales. Copio tu progreso + tu duda, y solo tienes que pegarlo
              en tu app de Claude (Ctrl/Cmd+V o mantener pulsado → pegar).
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Tu pregunta</div>
        <textarea
          rows={3}
          placeholder="Ej: ¿cómo rompo el estancamiento en sentadilla?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 10 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="btn small ghost"
              style={{ flexShrink: 0, fontSize: 12 }}
              onClick={() => setQuestion(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Datos que incluyo</div>
        {OPTION_LABELS.map(({ key, label }) => (
          <label
            key={key}
            className="list-item"
            style={{ cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              style={{ width: 20, height: 20 }}
              checked={opts[key]}
              onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })}
            />
            <span style={{ fontSize: 14 }}>{label}</span>
          </label>
        ))}
      </div>

      <button className="btn purple" onClick={copyAndOpen} disabled={!question.trim()}>
        {copied ? '✅ ¡Copiado! Abriendo Claude...' : '🔮 Copiar y abrir Claude'}
      </button>

      {preview && (
        <div className="card mt">
          <div className="card-title">No pude copiar automáticamente — copia esto:</div>
          <textarea rows={10} readOnly value={preview} onFocus={(e) => e.target.select()} />
        </div>
      )}
    </div>
  )
}
