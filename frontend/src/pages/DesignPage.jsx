import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const DESIGN_FIELDS = [
  ['solution_architecture', 'Solution architecture'],
  ['functional_design', 'Functional design'],
  ['technical_design', 'Technical design'],
  ['data_architecture', 'Data architecture'],
  ['upstream_systems', 'Upstream systems'],
  ['downstream_systems', 'Downstream systems'],
  ['api_integration', 'API / integration requirements'],
  ['synthetic_data', 'Data manufacturing / synthetic data'],
  ['models', 'Models'],
  ['methodologies', 'Methodologies'],
  ['security_considerations', 'Security considerations'],
  ['deployment_considerations', 'Deployment considerations'],
  ['dependencies', 'Dependencies'],
]

const emptyDesign = Object.fromEntries(DESIGN_FIELDS.map(([k]) => [k, '']))

export default function DesignPage() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(emptyDesign)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadQueue(preferId) {
    const data = await api.getDesignQueue()
    setQueue(data.items || [])
    const nextId =
      preferId && data.items?.some((i) => i.idea_id === preferId)
        ? preferId
        : data.items?.[0]?.idea_id || ''
    setSelectedId(nextId)
    if (nextId) await selectItem(nextId)
    else {
      setDetail(null)
      setForm(emptyDesign)
    }
  }

  async function selectItem(ideaId) {
    setSelectedId(ideaId)
    setMessage('')
    const item = await api.getDesign(ideaId)
    setDetail(item)
    const design = item.design || {}
    setForm(
      Object.fromEntries(DESIGN_FIELDS.map(([k]) => [k, design[k] || ''])),
    )
  }

  useEffect(() => {
    loadQueue().catch((err) => setError(err.message))
  }, [])

  async function saveDesign(e) {
    e.preventDefault()
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      const updated = await api.saveDesign(selectedId, { ...form, actor: 'Solution Lead' })
      setDetail(updated)
      setMessage('Design package saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function approveDesign() {
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      await api.approveDesign(selectedId, { actor: 'Solution Lead', comment })
      setMessage('Design approved — Ready to Build')
      setComment('')
      await loadQueue()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="split-layout">
      <section className="panel">
        <h2>Design / Ready to Build</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Capture architecture and design details, then approve to mark Ready to Build.
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
                <th>Team</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    No initiatives in Design or Ready to Build.
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
                  <td>{item.stage_code}</td>
                  <td>{item.solution_team || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Design package</h2>
        {!detail && <p className="muted">Select an initiative.</p>}
        {detail && (
          <>
            <h3 style={{ marginBottom: '0.35rem' }}>{detail.title}</h3>
            <div className="meta" style={{ marginBottom: '0.8rem' }}>
              {detail.idea_id} · {detail.stage_name || detail.stage_code} ·{' '}
              {detail.design?.design_approved ? 'Design approved' : 'Design in progress'}
            </div>
            <form className="form-grid" onSubmit={saveDesign}>
              {DESIGN_FIELDS.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    rows={2}
                    value={form[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <div className="form-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate(`/initiatives/${detail.idea_id}`)}
                >
                  Open detail
                </button>
                <button className="btn secondary" type="submit" disabled={saving}>
                  Save design
                </button>
              </div>
            </form>
            <div className="form-grid" style={{ marginTop: '0.8rem' }}>
              <label>
                Approval comment
                <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
              </label>
              <div className="form-actions">
                <button
                  className="btn"
                  type="button"
                  disabled={saving || detail.stage_code === 'ready_to_build'}
                  onClick={approveDesign}
                >
                  Approve design → Ready to Build
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
