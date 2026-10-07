import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useRole } from '../role/RoleContext'

const KPI_ORDER = [
  ['total_ideas', 'Total Ideas'],
  ['active_initiatives', 'Active Initiatives'],
  ['awaiting_management_approval', 'Awaiting Management Approval'],
  ['awaiting_solution_review', 'Awaiting Solution Review'],
  ['ready_to_build', 'Ready to Build'],
  ['build_in_progress', 'Build in Progress'],
  ['rapid_prototypes', 'Rapid Prototypes'],
  ['mvps', 'MVPs'],
  ['capability_demonstrators', 'Capability Demonstrators'],
  ['solutions', 'Solutions'],
  ['completed', 'Completed'],
  ['blocked_attention_required', 'Blocked / Attention Required'],
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { persona } = useRole()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('ideas')
  const [sortDir, setSortDir] = useState('desc')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    setData(null)
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
  }, [persona?.id])

  const leaderboard = useMemo(() => {
    if (!data) return []
    const rows = [...data.leaderboard]
    rows.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [data, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  async function generateSummary() {
    setSummaryLoading(true)
    try {
      const result = await api.generateExecutiveSummary()
      setSummary(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSummaryLoading(false)
    }
  }

  if (error) return <div className="error">Unable to load dashboard. {error}</div>
  if (!data) return <div className="loading">Loading executive dashboard…</div>

  return (
    <div>
      <div className="kpi-grid">
        {KPI_ORDER.map(([key, label]) => (
          <div className="kpi-card" key={key}>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{data.kpis[key]}</div>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Innovation by Risk Value Stream</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                    Risk Value Stream
                  </th>
                  {['ideas', 'active', 'ready_to_build', 'building', 'completed', 'solutions'].map(
                    (col) => (
                      <th key={col} onClick={() => toggleSort(col)} style={{ cursor: 'pointer' }}>
                        {col.replaceAll('_', ' ')}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`clickable${idx < 3 ? ' leader' : ''}`}
                    onClick={() => navigate(`/portfolio?value_stream_id=${row.id}`)}
                  >
                    <td>{row.name}</td>
                    <td>{row.ideas}</td>
                    <td>{row.active}</td>
                    <td>{row.ready_to_build}</td>
                    <td>{row.building}</td>
                    <td>{row.completed}</td>
                    <td>{row.solutions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2>Pipeline Funnel</h2>
          <div className="funnel">
            {data.funnel.map((stage) => (
              <button
                key={stage.stage_code}
                type="button"
                className="funnel-row"
                onClick={() => navigate(`/portfolio?stage_code=${stage.stage_code}`)}
              >
                <span className="funnel-track">
                  <span className="funnel-meta">
                    <span className="funnel-label">{stage.label}</span>
                    <strong className="funnel-count">{stage.count}</strong>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Attention Required</h2>
          <div className="attention-list">
            {data.attention_required.length === 0 && (
              <div className="muted">No aging or blocked items at this time.</div>
            )}
            {data.attention_required.map((item) => (
              <div
                key={item.idea_id}
                className="attention-item clickable"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                onKeyDown={() => {}}
                role="button"
                tabIndex={0}
              >
                <span className={`dot ${item.attention_level}`} />
                <div>
                  <strong>
                    {item.title} — {item.reason}
                  </strong>
                  <div className="meta">
                    {item.value_stream} · {item.idea_id} · Age {item.age_days} days
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>AI Portfolio Insights</h2>
          <div className="insights">
            {(summary?.insights || data.ai_insights).map((insight) => (
              <div className="insight" key={insight}>
                {insight}
              </div>
            ))}
          </div>
          {summary?.summary && (
            <div className="exec-summary">
              <strong>Executive summary</strong>
              <p>{summary.summary}</p>
              {summary.warning && <div className="meta">{summary.warning}</div>}
              <div className="meta">Source: {summary.source}</div>
            </div>
          )}
          <div style={{ marginTop: '0.9rem' }}>
            <button
              className="btn secondary"
              type="button"
              disabled={summaryLoading}
              onClick={generateSummary}
            >
              {summaryLoading ? 'Generating…' : 'Generate Executive Summary'}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
