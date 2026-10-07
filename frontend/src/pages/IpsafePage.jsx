import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

function ViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export default function IpsafePage({ mode = 'ipsafe' }) {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [checklistOpen, setChecklistOpen] = useState(false)

  const isCd = mode === 'cd'

  const title =
    mode === 'solutions'
      ? 'Solutions'
      : isCd
        ? 'Capability Demonstrators'
        : 'IPSAFE Progress'

  async function loadQueue(preferId) {
    const data = await api.getIpsafeQueue()
    let list = data.items || []
    if (isCd) {
      list = list.filter((i) =>
        ['prototype_ready', 'ipsafe_cd', 'cd_approved'].includes(i.stage_code),
      )
    } else if (mode === 'solutions') {
      list = list.filter((i) =>
        ['solution_candidate', 'deployable_solution'].includes(i.stage_code),
      )
    }
    setQueue(list)
    const nextId =
      preferId && list.some((i) => i.idea_id === preferId)
        ? preferId
        : list[0]?.idea_id || ''

    if (isCd) {
      if (preferId && list.some((i) => i.idea_id === preferId)) {
        setSelectedId(preferId)
        await selectItem(preferId)
      } else if (!preferId) {
        setSelectedId('')
        setDetail(null)
        setItems([])
      }
      return
    }

    setSelectedId(nextId)
    if (nextId) await selectItem(nextId)
    else {
      setDetail(null)
      setItems([])
    }
  }

  async function selectItem(ideaId, { openChecklist = false } = {}) {
    setSelectedId(ideaId)
    setMessage('')
    const item = await api.getIpsafe(ideaId)
    setDetail(item)
    setItems(item.ipsafe?.items || [])
    if (isCd && openChecklist) setChecklistOpen(true)
  }

  useEffect(() => {
    setChecklistOpen(false)
    setSelectedId('')
    setDetail(null)
    setItems([])
    loadQueue().catch((err) => setError(err.message))
  }, [mode])

  useEffect(() => {
    if (!checklistOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.classList.add('drawer-open')
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.classList.remove('drawer-open')
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = ''
    }
  }, [checklistOpen])

  function updateStatus(activityId, status) {
    setItems((prev) =>
      prev.map((row) => (row.activity_id === activityId ? { ...row, status } : row)),
    )
  }

  async function saveProgress() {
    if (!selectedId) return
    setSaving(true)
    setError('')
    try {
      const updated = await api.updateIpsafe(selectedId, {
        actor: 'Solution Lead',
        updates: items.map((row) => ({
          activity_id: row.activity_id,
          status: row.status,
          notes: row.notes,
        })),
      })
      setDetail(updated)
      setItems(updated.ipsafe?.items || [])
      setMessage(
        `Saved — CD ${updated.ipsafe.cd_pct}% / Solution ${updated.ipsafe.solution_pct}%`,
      )
      await loadQueue(selectedId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function convert() {
    if (!selectedId) return
    try {
      await api.convertSolution(selectedId, {
        actor: 'Administrator',
        comment: 'Convert Capability Demonstrator toward deployable solution',
      })
      setMessage('Converted to Solution Candidate')
      await loadQueue(selectedId)
    } catch (err) {
      setError(err.message)
    }
  }

  function closeChecklist() {
    setChecklistOpen(false)
  }

  async function openChecklist(ideaId, event) {
    event.stopPropagation()
    await selectItem(ideaId, { openChecklist: true })
  }

  const checklistBody = detail ? (
    <>
      <h3 style={{ marginBottom: '0.35rem' }}>{detail.title}</h3>
      <div className="meta" style={{ marginBottom: '0.55rem' }}>
        {detail.idea_id} · {detail.stage_code} · {detail.initiative_type}
      </div>
      <div className="progress-pair">
        <div className="progress-metric">
          <div className="kpi-label">Capability Demonstrator IPSAFE</div>
          <div className="readiness-score">{detail.ipsafe?.cd_pct ?? 0}%</div>
          <div className="funnel-bar">
            <span
              className="funnel-fill"
              style={{ width: `${detail.ipsafe?.cd_pct || 0}%` }}
            />
          </div>
        </div>
        <div className="progress-metric">
          <div className="kpi-label">Solution IPSAFE</div>
          <div className="readiness-score">{detail.ipsafe?.solution_pct ?? 0}%</div>
          <div className="funnel-bar">
            <span
              className="funnel-fill"
              style={{ width: `${detail.ipsafe?.solution_pct || 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="checklist" style={{ marginTop: '0.9rem' }}>
        {items.map((row) => (
          <div className="checklist-row" key={row.activity_id}>
            <span className="check-glyph pass">
              {row.required_for_cd ? 'CD' : 'SOL'}
            </span>
            <div>
              <div className="check-label">{row.name}</div>
              <div className="meta">{row.description}</div>
            </div>
            <select
              value={row.status}
              onChange={(e) => updateStatus(row.activity_id, e.target.value)}
            >
              <option>Not Started</option>
              <option>In Progress</option>
              <option>Complete</option>
              <option>Blocked</option>
            </select>
          </div>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: '0.9rem' }}>
        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate(`/initiatives/${detail.idea_id}`)}
        >
          Open detail
        </button>
        {(detail.ipsafe?.cd_pct || 0) >= 50 &&
          detail.stage_code !== 'deployable_solution' && (
            <button className="btn secondary" type="button" onClick={convert}>
              Convert to Solution
            </button>
          )}
        <button className="btn" type="button" disabled={saving} onClick={saveProgress}>
          {saving ? 'Saving…' : 'Save IPSAFE progress'}
        </button>
      </div>
    </>
  ) : (
    <p className="muted">Select an initiative.</p>
  )

  return (
    <div className={isCd ? 'cd-layout' : 'split-layout'}>
      <section className="panel">
        <h2>{title}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Track configurable IPSAFE activities for Capability Demonstrator and Solution readiness.
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
                <th>CD %</th>
                <th>Solution %</th>
                {isCd && <th className="col-actions">View</th>}
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 && (
                <tr>
                  <td colSpan={isCd ? 6 : 5} className="muted">
                    No matching initiatives.
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
                  <td>{item.ipsafe?.cd_pct ?? '—'}%</td>
                  <td>{item.ipsafe?.solution_pct ?? '—'}%</td>
                  {isCd && (
                    <td className="col-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="View activity checklist"
                        aria-label={`View checklist for ${item.idea_id}`}
                        onClick={(e) => openChecklist(item.idea_id, e)}
                      >
                        <ViewIcon />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {!isCd && (
        <section className="panel">
          <h2>Activity checklist</h2>
          {checklistBody}
        </section>
      )}

      {isCd && checklistOpen && (
        <div className="checklist-drawer-root">
          <button
            type="button"
            className="checklist-drawer-backdrop"
            aria-label="Close checklist"
            onClick={closeChecklist}
          />
          <aside className="checklist-drawer panel" role="dialog" aria-modal="true">
            <div className="checklist-drawer-header">
              <h2>Activity checklist</h2>
              <button
                type="button"
                className="icon-btn drawer-close"
                aria-label="Close"
                onClick={closeChecklist}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path
                    d="M3 3l8 8M11 3 3 11"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="checklist-drawer-body">{checklistBody}</div>
          </aside>
        </div>
      )}
    </div>
  )
}
