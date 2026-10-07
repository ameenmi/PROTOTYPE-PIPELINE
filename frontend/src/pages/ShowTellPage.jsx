import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function ShowTellPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({
    facilitator: 'Solution Lead',
    audience: 'Risk Value Stream Leads',
    summary: '',
    feedback: '',
    decision: 'Proceed',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadQueue(preferId) {
    const data = await api.getShowTellQueue()
    setQueue(data.items || [])
    const nextId =
      preferId && data.items?.some((i) => i.idea_id === preferId)
        ? preferId
        : data.items?.[0]?.idea_id || ''
    setSelectedId(nextId)
    if (nextId) await selectItem(nextId)
    else setDetail(null)
  }

  async function selectItem(ideaId) {
    setSelectedId(ideaId)
    setMessage('')
    const item = await api.getShowTell(ideaId)
    setDetail(item)
  }

  useEffect(() => {
    loadQueue().catch((err) => setError(err.message))
  }, [])

  async function submit(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      await api.addShowTell(selectedId, { ...form, advance: true })
      setMessage('Show & Tell feedback recorded')
      setForm((prev) => ({ ...prev, summary: '', feedback: '' }))
      await loadQueue()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function promote() {
    if (!selectedId) return
    try {
      await api.promoteMvp(selectedId, {
        actor: 'Administrator',
        comment: 'Promoted after successful demonstration',
      })
      setMessage(`${selectedId} promoted to MVP / IPSAFE path`)
      await loadQueue()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <h2>Show & Tell / Feedback</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Capture demonstration outcomes and refinement decisions.
        </p>
        {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Initiative</th>
                <th>Stage</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => (
                <tr
                  key={item.idea_id}
                  className={`clickable${selectedId === item.idea_id ? ' leader' : ''}`}
                  onClick={() => selectItem(item.idea_id)}
                >
                  <td>{item.idea_id}</td>
                  <td>{item.title}</td>
                  <td>{item.stage_code}</td>
                  <td>{item.initiative_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Session notes</h2>
        {!detail && <p className="muted">Select an initiative.</p>}
        {detail && (
          <>
            <h3 style={{ marginBottom: '0.35rem' }}>{detail.title}</h3>
            <div className="meta" style={{ marginBottom: '0.8rem' }}>
              {detail.idea_id} · {detail.stage_code} · {detail.initiative_type}
            </div>
            <form className="form-grid" onSubmit={submit}>
              <div className="form-row">
                <label>
                  Facilitator
                  <input
                    value={form.facilitator}
                    onChange={(e) => setForm((p) => ({ ...p, facilitator: e.target.value }))}
                  />
                </label>
                <label>
                  Audience
                  <input
                    value={form.audience}
                    onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Summary
                <textarea
                  required
                  rows={2}
                  value={form.summary}
                  onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                />
              </label>
              <label>
                Feedback
                <textarea
                  required
                  rows={3}
                  value={form.feedback}
                  onChange={(e) => setForm((p) => ({ ...p, feedback: e.target.value }))}
                />
              </label>
              <label>
                Decision
                <select
                  value={form.decision}
                  onChange={(e) => setForm((p) => ({ ...p, decision: e.target.value }))}
                >
                  <option>Proceed</option>
                  <option>Refine</option>
                  <option>Hold</option>
                </select>
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
                  Record feedback
                </button>
              </div>
            </form>

            {detail.initiative_type === 'Rapid Prototype' &&
              detail.stage_code === 'prototype_ready' && (
                <div style={{ marginTop: '0.9rem' }}>
                  <button className="btn secondary" type="button" onClick={promote}>
                    Promote to MVP
                  </button>
                </div>
              )}

            <div style={{ marginTop: '1rem' }}>
              <h3>Prior feedback</h3>
              {(detail.show_tell || []).length === 0 && (
                <p className="muted">No Show & Tell entries yet.</p>
              )}
              <div className="attention-list">
                {(detail.show_tell || []).map((entry) => (
                  <div className="attention-item" key={entry.id}>
                    <span className="dot Green" />
                    <div>
                      <strong>
                        {entry.session_date} — {entry.decision}
                      </strong>
                      <div className="meta">
                        {entry.facilitator} · {entry.audience}
                      </div>
                      <div>{entry.summary}</div>
                      <div className="meta">{entry.feedback}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
