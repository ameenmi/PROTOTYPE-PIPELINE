import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useRole } from '../role/RoleContext'

export default function PortfolioPage() {
  const navigate = useNavigate()
  const { persona } = useRole()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [reference, setReference] = useState(null)
  const [error, setError] = useState('')

  const filters = useMemo(
    () => ({
      value_stream_id: params.get('value_stream_id') || '',
      solution_team_id: params.get('solution_team_id') || '',
      initiative_type: params.get('initiative_type') || '',
      stage_code: params.get('stage_code') || '',
      status: params.get('status') || '',
      priority: params.get('priority') || '',
      search: params.get('search') || '',
    }),
    [params],
  )

  useEffect(() => {
    api.getReference().then(setReference).catch(() => {})
  }, [])

  useEffect(() => {
    api
      .getInitiatives(filters)
      .then(setItems)
      .catch((err) => setError(err.message || 'Failed to load portfolio'))
  }, [filters, persona?.id])

  function updateFilter(key, value) {
    const next = new URLSearchParams(params)
    if (!value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  if (error) return <div className="error">{error}</div>

  return (
    <div>
      <section className="panel">
        <h2>Portfolio</h2>
        <div className="filters">
          <input
            placeholder="Search ID or title"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
          />
          <select
            value={filters.value_stream_id}
            onChange={(e) => updateFilter('value_stream_id', e.target.value)}
          >
            <option value="">All Value Streams</option>
            {reference?.value_streams?.map((vs) => (
              <option key={vs.id} value={vs.id}>
                {vs.name}
              </option>
            ))}
          </select>
          <select
            value={filters.solution_team_id}
            onChange={(e) => updateFilter('solution_team_id', e.target.value)}
          >
            <option value="">All Solution Teams</option>
            {reference?.solution_teams?.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
          <select
            value={filters.initiative_type}
            onChange={(e) => updateFilter('initiative_type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="Rapid Prototype">Rapid Prototype</option>
            <option value="MVP">MVP</option>
          </select>
          <select
            value={filters.stage_code}
            onChange={(e) => updateFilter('stage_code', e.target.value)}
          >
            <option value="">All Stages</option>
            {reference?.stages?.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Blocked">Blocked</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => updateFilter('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Initiative</th>
                <th>Risk Value Stream</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Solution Team</th>
                <th>Stage</th>
                <th>Readiness %</th>
                <th>Mgmt Approval</th>
                <th>Solution Approval</th>
                <th>IPSAFE %</th>
                <th>Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.idea_id}
                  className="clickable"
                  onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                >
                  <td>{item.idea_id}</td>
                  <td>{item.title}</td>
                  <td>{item.value_stream}</td>
                  <td>{item.owner}</td>
                  <td>{item.initiative_type}</td>
                  <td>{item.solution_team || '—'}</td>
                  <td>{item.stage_name}</td>
                  <td>{item.readiness_pct}%</td>
                  <td>
                    <span className={`badge ${item.vijay_approval}`}>
                      V:{item.vijay_approval} / R:{item.raghu_approval}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${item.solution_approval}`}>
                      {item.solution_approval}
                    </span>
                  </td>
                  <td>{item.ipsafe_pct}%</td>
                  <td>{item.age_days}d</td>
                  <td>
                    <span className={`badge ${item.status}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
