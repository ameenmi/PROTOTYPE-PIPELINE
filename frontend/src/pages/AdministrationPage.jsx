import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'

const TABS = [
  'Value Streams',
  'Solution Teams',
  'Users',
  'Workflow',
  'IPSAFE Activities',
]

const TAB_BY_PATH = {
  '/value-streams': 'Value Streams',
  '/solution-teams': 'Solution Teams',
}

function singularLabel(tab) {
  if (tab === 'IPSAFE Activities') return 'IPSAFE Activity'
  if (tab.endsWith('s')) return tab.slice(0, -1)
  return tab
}

export default function AdministrationPage() {
  const location = useLocation()
  const [tab, setTab] = useState(() => TAB_BY_PATH[location.pathname] || 'Value Streams')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({})
  const [panelOpen, setPanelOpen] = useState(false)

  async function load() {
    const admin = await api.getAdmin()
    setData(admin)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const next = TAB_BY_PATH[location.pathname]
    if (next) setTab(next)
  }, [location.pathname])

  useEffect(() => {
    setForm({})
    setMessage('')
    setPanelOpen(false)
  }, [tab])

  function openAdd() {
    setForm({})
    setMessage('')
    setPanelOpen(true)
  }

  function openEdit(row) {
    setForm({ ...row })
    setMessage('')
    setPanelOpen(true)
  }

  function closePanel() {
    setForm({})
    setPanelOpen(false)
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      if (tab === 'Value Streams') {
        const payload = {
          name: form.name,
          code: form.code,
          description: form.description || '',
          is_active: form.is_active !== false,
          lead_user_id: form.lead_user_id ? Number(form.lead_user_id) : null,
        }
        if (form.id) await api.updateValueStream(form.id, payload)
        else await api.createValueStream(payload)
      }
      if (tab === 'Solution Teams') {
        const payload = {
          name: form.name,
          capacity: Number(form.capacity || 8),
          is_active: form.is_active !== false,
          lead_user_id: form.lead_user_id ? Number(form.lead_user_id) : null,
        }
        if (form.id) await api.updateSolutionTeam(form.id, payload)
        else await api.createSolutionTeam(payload)
      }
      if (tab === 'Users') {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role || 'Value Stream Lead',
          value_stream_id: form.value_stream_id ? Number(form.value_stream_id) : null,
          solution_team_id: form.solution_team_id ? Number(form.solution_team_id) : null,
          is_active: form.is_active !== false,
        }
        if (form.id) await api.updateUser(form.id, payload)
        else await api.createUser(payload)
      }
      if (tab === 'Workflow') {
        const payload = {
          name: form.name,
          code: form.code,
          sequence: Number(form.sequence || 99),
          is_active: form.is_active !== false,
        }
        if (form.id) await api.updateStage(form.id, payload)
        else await api.createStage(payload)
      }
      if (tab === 'IPSAFE Activities') {
        const payload = {
          code: form.code,
          name: form.name,
          description: form.description || '',
          sequence: Number(form.sequence || 99),
          required_for_cd: !!form.required_for_cd,
          required_for_solution: form.required_for_solution !== false,
          is_active: form.is_active !== false,
        }
        if (form.id) await api.updateIpsafeActivity(form.id, payload)
        else await api.createIpsafeActivity(payload)
      }
      setMessage('Saved')
      setForm({})
      setPanelOpen(false)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleActive(row) {
    try {
      if (tab === 'Value Streams') {
        await api.updateValueStream(row.id, { ...row, is_active: !row.is_active })
      } else if (tab === 'Solution Teams') {
        await api.updateSolutionTeam(row.id, { ...row, is_active: !row.is_active })
      } else if (tab === 'Users') {
        await api.updateUser(row.id, { ...row, is_active: !row.is_active })
      } else if (tab === 'Workflow') {
        await api.updateStage(row.id, { ...row, is_active: !row.is_active })
      } else if (tab === 'IPSAFE Activities') {
        await api.updateIpsafeActivity(row.id, { ...row, is_active: !row.is_active })
      }
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!data && !error) return <div className="loading">Loading administration…</div>

  const rows =
    tab === 'Value Streams'
      ? data?.value_streams
      : tab === 'Solution Teams'
        ? data?.solution_teams
        : tab === 'Users'
          ? data?.users
          : tab === 'Workflow'
            ? data?.stages
            : data?.ipsafe_activities

  return (
    <div className="admin-page">
      <section className="admin-shell panel">
        <div className="admin-shell-header">
          <div>
            <h2>Administration</h2>
            <p className="muted">
              Configure Risk Value Streams, Solution Teams, users, workflow stages, and IPSAFE
              activities.
            </p>
          </div>
          <button className="btn" type="button" onClick={openAdd}>
            Add New
          </button>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Administration sections">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={`admin-tab${tab === name ? ' active' : ''}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {(error || message) && (
          <div className="admin-alerts">
            {error && <div className="error" style={{ padding: '0.35rem 0' }}>{error}</div>}
            {message && <div className="success-banner">{message}</div>}
          </div>
        )}

        <div className={`admin-layout${panelOpen ? ' with-panel' : ''}`}>
          <div className="admin-list-panel" role="tabpanel">
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).map((row) => (
                    <tr key={row.id}>
                      <td>{row.name}</td>
                      <td className="meta">
                        {row.code || row.email || row.role || `seq ${row.sequence}`}
                        {row.capacity ? ` · capacity ${row.capacity}` : ''}
                      </td>
                      <td>
                        <span className={`badge ${row.is_active ? 'Active' : 'Blocked'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => toggleActive(row)}
                        >
                          {row.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {panelOpen && (
            <aside className="admin-form-panel">
              <div className="panel-header-row">
                <h3>
                  {form.id ? 'Edit' : 'Add'} {singularLabel(tab)}
                </h3>
                <button className="btn secondary" type="button" onClick={closePanel}>
                  Close
                </button>
              </div>
              <form className="form-grid admin-form-grid" onSubmit={save}>
                {(tab === 'Value Streams' || tab === 'Workflow' || tab === 'IPSAFE Activities') && (
                  <>
                    <label>
                      Name
                      <input
                        required
                        value={form.name || ''}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Code
                      <input
                        required
                        value={form.code || ''}
                        onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                      />
                    </label>
                  </>
                )}
                {tab === 'Value Streams' && (
                  <label>
                    Description
                    <textarea
                      rows={2}
                      value={form.description || ''}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </label>
                )}
                {tab === 'Solution Teams' && (
                  <>
                    <label>
                      Name
                      <input
                        required
                        value={form.name || ''}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Capacity
                      <input
                        type="number"
                        value={form.capacity ?? 8}
                        onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                      />
                    </label>
                  </>
                )}
                {tab === 'Users' && (
                  <>
                    <label>
                      Name
                      <input
                        required
                        value={form.name || ''}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        required
                        type="email"
                        value={form.email || ''}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      />
                    </label>
                    <label>
                      Role
                      <select
                        value={form.role || 'Value Stream Lead'}
                        onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        <option>Administrator</option>
                        <option>Value Stream Lead</option>
                        <option>Solution Lead</option>
                      </select>
                    </label>
                  </>
                )}
                {(tab === 'Workflow' || tab === 'IPSAFE Activities') && (
                  <label>
                    Sequence
                    <input
                      type="number"
                      value={form.sequence ?? 99}
                      onChange={(e) => setForm((p) => ({ ...p, sequence: e.target.value }))}
                    />
                  </label>
                )}
                {tab === 'IPSAFE Activities' && (
                  <>
                    <label>
                      Description
                      <textarea
                        rows={2}
                        value={form.description || ''}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      />
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={!!form.required_for_cd}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, required_for_cd: e.target.checked }))
                        }
                      />{' '}
                      Required for Capability Demonstrator
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.required_for_solution !== false}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, required_for_solution: e.target.checked }))
                        }
                      />{' '}
                      Required for Solution
                    </label>
                  </>
                )}
                <div className="form-actions">
                  <button type="button" className="btn secondary" onClick={closePanel}>
                    Cancel
                  </button>
                  <button className="btn" type="submit">
                    Save
                  </button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </section>
    </div>
  )
}
