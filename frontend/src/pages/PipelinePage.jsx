import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const BOARD_COLUMNS = [
  { code: 'idea_submitted', label: 'Idea Submitted' },
  { code: 'management_review', label: 'Management Review' },
  { code: 'solution_review', label: 'Solution Review' },
  { code: 'design', label: 'Design' },
  { code: 'ready_to_build', label: 'Ready to Build' },
  { code: 'build_in_progress', label: 'Build in Progress' },
  { code: 'show_and_tell', label: 'Show & Tell' },
  { code: 'prototype_ready', label: 'Prototype Ready' },
  { code: 'ipsafe_cd', label: 'IPSAFE / CD' },
  { code: 'deployable_solution', label: 'Solution' },
]

export default function PipelinePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getInitiatives()
      .then(setItems)
      .catch((err) => setError(err.message || 'Failed to load pipeline'))
  }, [])

  const columns = useMemo(() => {
    const map = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.code, []]))
    items.forEach((item) => {
      if (map[item.stage_code]) map[item.stage_code].push(item)
    })
    return BOARD_COLUMNS.map((col) => ({ ...col, items: map[col.code] || [] }))
  }, [items])

  if (error) return <div className="error">{error}</div>

  return (
    <section className="panel">
      <h2>Innovation Pipeline</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: '0.9rem' }}>
        Kanban view of initiatives across the governance funnel.
      </p>
      <div className="kanban">
        {columns.map((col) => (
          <div className="kanban-col" key={col.code}>
            <h3>
              {col.label} ({col.items.length})
            </h3>
            {col.items.map((item) => (
              <div
                className="kanban-card"
                key={item.idea_id}
                onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
              >
                <strong>{item.title}</strong>
                <div className="meta">{item.idea_id}</div>
                <div className="meta">
                  {item.value_stream} · {item.initiative_type}
                </div>
                <div style={{ marginTop: '0.45rem' }}>
                  <span className={`badge ${item.status}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
