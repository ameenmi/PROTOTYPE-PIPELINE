import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const ACTIONS = ['Accept', 'Request More Information', 'Return to Value Stream']

function statusGlyph(status) {
  if (status === 'pass') return '✓'
  if (status === 'partial') return '△'
  return '✕'
}

export default function SolutionReviewPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [reference, setReference] = useState(null)
  const [action, setAction] = useState('Accept')
  const [solutionTeamId, setSolutionTeamId] = useState('')
  const [comment, setComment] = useState('')
  const [checklist, setChecklist] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadQueue(preferId) {
    const [data, ref] = await Promise.all([
      api.getSolutionReviewQueue(),
      api.getReference(),
    ])
    setQueue(data.items || [])
    setReference(ref)
    const nextId = preferId && data.items?.some((i) => i.idea_id === preferId)
      ? preferId
      : data.items?.[0]?.idea_id || ''
    setSelectedId(nextId)
    if (nextId) {
      const item = data.items.find((i) => i.idea_id === nextId) || (await api.getInitiative(nextId))
      setDetail(item)
      setChecklist(item.readiness?.items || [])
      setSolutionTeamId(item.solution_team_id ? String(item.solution_team_id) : '')
    } else {
      setDetail(null)
      setChecklist([])
    }
  }

  useEffect(() => {
    loadQueue().catch((err) => setError(err.message))
  }, [])

  async function selectItem(ideaId) {
    setSelectedId(ideaId)
    setMessage('')
    setError('')
    const item = await api.getInitiative(ideaId)
    setDetail(item)
    setChecklist(item.readiness?.items || [])
    setSolutionTeamId(item.solution_team_id ? String(item.solution_team_id) : '')
  }

  function updateChecklistStatus(key, status) {
    setChecklist((prev) => prev.map((item) => (item.key === key ? { ...item, status } : item)))
  }

  const score = checklist.length
    ? Math.round(
        (100 *
          checklist.reduce(
            (sum, item) =>
              sum + (item.status === 'pass' ? 1 : item.status === 'partial' ? 0.5 : 0),
            0,
          )) /
          checklist.length,
      )
    : 0

  async function submitDecision(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const checklistPayload = Object.fromEntries(checklist.map((i) => [i.key, i.status]))
      const updated = await api.solutionReadiness(selectedId, {
        actor: 'Solution Lead',
        action,
        comment,
        solution_team_id: solutionTeamId ? Number(solutionTeamId) : null,
        checklist: checklistPayload,
      })
      setMessage(`Solution readiness recorded: ${action}`)
      setComment('')
      await loadQueue(updated.stage_code === 'solution_review' ? updated.idea_id : undefined)
    } catch (err) {
      setError(err.message || 'Unable to record solution decision')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <h2>Solution Readiness Review</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Solution Leads assess whether approved concepts are ready to enter design/build.
        </p>
        {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Initiative</th>
                <th>Type</th>
                <th>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No initiatives in Solution Review.
                  </td>
                </tr>
              )}
              {queue.map((item) => (
                <tr
                  key={item.idea_id}
                  className={`clickable${selectedId === item.idea_id ? ' leader' : ''}`}
                  onClick={() => selectItem(item.idea_id)}
                >
                  <td>{item.idea_id}</td>
                  <td>{item.title}</td>
                  <td>{item.initiative_type}</td>
                  <td>{item.readiness?.score ?? item.readiness_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Readiness checklist</h2>
        {!detail && <p className="muted">Select an initiative to assess.</p>}
        {detail && (
          <>
            <h3 style={{ marginBottom: '0.35rem' }}>{detail.title}</h3>
            <div className="meta" style={{ marginBottom: '0.8rem' }}>
              {detail.idea_id} · {detail.value_stream} · {detail.initiative_type}
            </div>
            <div className="readiness-score">Readiness Score: {score}%</div>
            <div className="checklist">
              {checklist.map((item) => (
                <div className="checklist-row" key={item.key}>
                  <span className={`check-glyph ${item.status}`}>{statusGlyph(item.status)}</span>
                  <span className="check-label">{item.label}</span>
                  <select
                    value={item.status}
                    onChange={(e) => updateChecklistStatus(item.key, e.target.value)}
                  >
                    <option value="pass">Complete</option>
                    <option value="partial">Partial</option>
                    <option value="fail">Missing</option>
                  </select>
                </div>
              ))}
            </div>

            <form className="form-grid" onSubmit={submitDecision} style={{ marginTop: '1rem' }}>
              <label>
                Assign Solution Team
                <select
                  value={solutionTeamId}
                  onChange={(e) => setSolutionTeamId(e.target.value)}
                  required={action === 'Accept'}
                >
                  <option value="">Select…</option>
                  {reference?.solution_teams
                    ?.filter((t) => t.is_active)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Action
                <select value={action} onChange={(e) => setAction(e.target.value)}>
                  {ACTIONS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label>
                Comment
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate(`/initiatives/${detail.idea_id}`)}
                >
                  Open detail
                </button>
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Record decision'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
