import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

const SUGGESTIONS = [
  'How many Climate Risk initiatives are currently active?',
  'Which Value Stream has submitted the most ideas?',
  "Show initiatives waiting for Vijay's approval.",
  'Which initiatives have been stuck for more than 10 days?',
  'How many MVPs are currently in build?',
  'Show initiatives that are ready to build.',
  'Which Solution Team has the largest workload?',
  'Give me a management summary of the pipeline.',
]

export default function CopilotPage() {
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function ask(q) {
    const text = (q || question).trim()
    if (!text) return
    setLoading(true)
    setError('')
    setQuestion(text)
    try {
      const result = await api.askCopilot(text)
      setHistory((prev) => [{ question: text, ...result }, ...prev])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <h2>Innovation Pipeline Copilot</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Ask portfolio questions in natural language. Uses Azure OpenAI when configured; otherwise
          answers from live portfolio data.
        </p>
        {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            ask()
          }}
        >
          <label>
            Your question
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which initiatives are ready to build?"
            />
          </label>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Thinking…' : 'Ask Copilot'}
            </button>
          </div>
        </form>
        <div className="suggestion-list">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="suggestion-chip"
              onClick={() => ask(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Responses</h2>
        {history.length === 0 && <p className="muted">Ask a question to see answers here.</p>}
        <div className="attention-list">
          {history.map((item, idx) => (
            <div className="attention-item" key={`${item.question}-${idx}`}>
              <span className="dot Green" />
              <div>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
                {item.warning && <div className="meta">{item.warning}</div>}
                <div className="meta">Source: {item.source}</div>
                {(item.links || []).length > 0 && (
                  <div className="link-list">
                    {item.links.map((link) => (
                      <Link key={link.idea_id} to={`/initiatives/${link.idea_id}`}>
                        {link.idea_id}: {link.title}
                      </Link>
                    ))}
                  </div>
                )}
                {(item.recommendations || []).length > 0 && (
                  <ul>
                    {item.recommendations.map((rec) => (
                      <li key={rec}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
