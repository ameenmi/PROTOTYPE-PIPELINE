import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const ACTIONS = ['Approve', 'Reject', 'Request Clarification', 'Send Back']

export default function ApprovalsPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [approver, setApprover] = useState('Raghu')
  const [action, setAction] = useState('Approve')
  const [initiativeType, setInitiativeType] = useState('Rapid Prototype')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadQueue(preferId) {
    const data = await api.getPendingApprovals()
    setQueue(data.items || [])
    const nextId = preferId && data.items?.some((i) => i.idea_id === preferId)
      ? preferId
      : data.items?.[0]?.idea_id || ''
    setSelectedId(nextId)
    if (nextId) {
      const item = await api.getInitiative(nextId)
      setDetail(item)
      setInitiativeType(item.initiative_type || 'Rapid Prototype')
    } else {
      setDetail(null)
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
    setInitiativeType(item.initiative_type || 'Rapid Prototype')
  }

  async function submitDecision(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const updated = await api.managementApproval(selectedId, {
        approver,
        action,
        comment,
        initiative_type: initiativeType,
      })
      setMessage(`${approver} recorded: ${action}`)
      setComment('')
      await loadQueue(
        updated.stage_code === 'management_review' ? updated.idea_id : undefined,
      )
    } catch (err) {
      setError(err.message || 'Unable to record approval')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <h2>Management Approvals</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Vijay and Raghu review concepts awaiting management decision.
        </p>
        {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
        {message && <div className="success-banner">{message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Initiative</th>
                <th>Value Stream</th>
                <th>Raghu</th>
                <th>Vijay</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No initiatives awaiting management approval.
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
                  <td>{item.value_stream}</td>
                  <td>
                    <span className={`badge ${item.raghu_approval}`}>{item.raghu_approval}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.vijay_approval}`}>{item.vijay_approval}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Review decision</h2>
        {!detail && <p className="muted">Select an initiative to review.</p>}
        {detail && (
          <>
            <h3 style={{ marginBottom: '0.4rem' }}>{detail.title}</h3>
            <div className="meta" style={{ marginBottom: '0.8rem' }}>
              {detail.idea_id} · {detail.value_stream} · Owner {detail.owner}
            </div>
            <div className="approval-indicators">
              <div>
                Raghu — <span className={`badge ${detail.raghu_approval}`}>{detail.raghu_approval}</span>
              </div>
              <div>
                Vijay — <span className={`badge ${detail.vijay_approval}`}>{detail.vijay_approval}</span>
              </div>
            </div>
            <p>
              <strong>Problem:</strong> {detail.business_problem}
            </p>
            <p>
              <strong>Concept:</strong> {detail.proposed_concept}
            </p>
            <p>
              <strong>Value:</strong> {detail.business_value}
            </p>

            <form className="form-grid" onSubmit={submitDecision}>
              <div className="form-row">
                <label>
                  Approver
                  <select value={approver} onChange={(e) => setApprover(e.target.value)}>
                    <option>Raghu</option>
                    <option>Vijay</option>
                  </select>
                </label>
                <label>
                  Classification
                  <select
                    value={initiativeType}
                    onChange={(e) => setInitiativeType(e.target.value)}
                  >
                    <option>Rapid Prototype</option>
                    <option>MVP</option>
                  </select>
                </label>
              </div>
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
                  placeholder="Optional review comment"
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
            <p className="meta">
              Both approvals are normally required before Solution Review.{' '}
              <Link to="/solution-review">Go to Solution Readiness</Link>
            </p>
          </>
        )}
      </section>
    </div>
  )
}
