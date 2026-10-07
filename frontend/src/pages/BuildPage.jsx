import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const COLUMNS = [
  { code: 'build_in_progress', label: 'Build in Progress', next: 'show_and_tell' },
  { code: 'show_and_tell', label: 'Show & Tell', next: 'feedback' },
  { code: 'feedback', label: 'Feedback / Refinement', next: 'prototype_ready' },
]

export default function BuildPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const data = await api.getBuildQueue()
    setItems(data.items || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  const columns = useMemo(() => {
    return COLUMNS.map((col) => ({
      ...col,
      items: items.filter((i) => i.stage_code === col.code),
    }))
  }, [items])

  async function move(ideaId, target) {
    setMessage('')
    try {
      await api.advanceStage(ideaId, {
        actor: 'Solution Lead',
        target_stage: target,
        comment: `Moved to ${target}`,
      })
      setMessage(`${ideaId} → ${target}`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="panel">
      <h2>Build</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Move initiatives through build, Show & Tell, and refinement.
      </p>
      {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
      {message && <div className="success-banner">{message}</div>}
      <div className="kanban" style={{ gridTemplateColumns: 'repeat(3, minmax(240px, 1fr))' }}>
        {columns.map((col) => (
          <div className="kanban-col" key={col.code}>
            <h3>
              {col.label} ({col.items.length})
            </h3>
            {col.items.map((item) => (
              <div className="kanban-card" key={item.idea_id}>
                <strong
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                >
                  {item.title}
                </strong>
                <div className="meta">
                  {item.idea_id} · {item.solution_team || 'Unassigned'}
                </div>
                <div style={{ marginTop: '0.55rem' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => move(item.idea_id, col.next)}
                  >
                    Advance
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
