import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

function BarChart({ rows, onSelect }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div className="chart-bars">
      {rows.map((row) => (
        <button
          key={row.label + (row.stage_code || '')}
          type="button"
          className="chart-bar-row"
          onClick={() => onSelect?.(row)}
        >
          <span className="chart-label">{row.label}</span>
          <span className="chart-track">
            <span className="chart-fill" style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <strong>{row.count}</strong>
        </button>
      ))}
    </div>
  )
}

export default function ReportsPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [drill, setDrill] = useState(null)
  const [drillItems, setDrillItems] = useState([])

  useEffect(() => {
    api.getAnalytics().then(setData).catch((err) => setError(err.message))
  }, [])

  async function openDrill(row, kind) {
    const filter = row.filter || {}
    setDrill({ title: row.label, kind })
    const params = {}
    if (filter.stage_code) params.stage_code = filter.stage_code
    if (filter.initiative_type) params.initiative_type = filter.initiative_type
    const all = await api.getInitiatives(params)
    let items = all
    if (filter.value_stream) {
      items = all.filter((i) => i.value_stream === filter.value_stream)
    }
    if (filter.solution_team) {
      items = all.filter((i) => (i.solution_team || 'Unassigned') === filter.solution_team)
    }
    setDrillItems(items)
  }

  async function downloadExport(format) {
    try {
      const result = await api.exportPortfolio(format)
      const blob =
        format === 'csv'
          ? new Blob([result], { type: 'text/csv;charset=utf-8' })
          : new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'csv' ? 'portfolio_export.csv' : 'portfolio_export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const conversionCards = useMemo(() => {
    if (!data) return []
    const c = data.conversion_rates
    return [
      ['Idea → Prototype', `${c.idea_to_prototype}%`],
      ['Prototype → MVP', `${c.prototype_to_mvp}%`],
      ['MVP → Capability Demonstrator', `${c.mvp_to_cd}%`],
      ['CD → Solution', `${c.cd_to_solution}%`],
    ]
  }, [data])

  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="loading">Loading analytics…</div>

  return (
    <div>
      <section className="panel">
        <div className="panel-header-row">
          <div>
            <h2>Reports & Analytics</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 0 }}>
              Interactive portfolio analytics. Click a bar to drill into matching initiatives.
            </p>
          </div>
          <div className="topbar-actions">
            <button className="btn secondary" type="button" onClick={() => downloadExport('csv')}>
              Export CSV
            </button>
            <button className="btn secondary" type="button" onClick={() => downloadExport('json')}>
              Export JSON
            </button>
          </div>
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
          {conversionCards.map(([label, value]) => (
            <div className="kpi-card" key={label}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="panel-grid">
        <section className="panel">
          <h2>Ideas by Value Stream</h2>
          <BarChart rows={data.ideas_by_value_stream} onSelect={(r) => openDrill(r, 'vs')} />
        </section>
        <section className="panel">
          <h2>Initiatives by Stage</h2>
          <BarChart rows={data.initiatives_by_stage} onSelect={(r) => openDrill(r, 'stage')} />
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Rapid Prototype vs MVP</h2>
          <BarChart rows={data.type_mix} onSelect={(r) => openDrill(r, 'type')} />
        </section>
        <section className="panel">
          <h2>Solution Team Workload</h2>
          <BarChart
            rows={data.solution_team_workload}
            onSelect={(r) => openDrill(r, 'team')}
          />
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Aging Analysis</h2>
          <BarChart rows={data.aging_analysis} />
          <div className="meta" style={{ marginTop: '0.7rem' }}>
            Approval turnaround — Raghu pending: {data.approval_turnaround.pending_raghu}, Vijay
            pending: {data.approval_turnaround.pending_vijay}, both approved:{' '}
            {data.approval_turnaround.both_approved}
          </div>
        </section>
        <section className="panel">
          <h2>Average Age by Stage</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Count</th>
                  <th>Avg Age (days)</th>
                </tr>
              </thead>
              <tbody>
                {data.avg_age_by_stage.map((row) => (
                  <tr
                    key={row.stage_code}
                    className="clickable"
                    onClick={() =>
                      openDrill(
                        {
                          label: row.label,
                          filter: { stage_code: row.stage_code },
                        },
                        'stage',
                      )
                    }
                  >
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                    <td>{row.avg_age_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>IPSAFE Progress</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Initiative</th>
                <th>Value Stream</th>
                <th>IPSAFE %</th>
              </tr>
            </thead>
            <tbody>
              {data.ipsafe_progress.map((row) => (
                <tr
                  key={row.idea_id}
                  className="clickable"
                  onClick={() => navigate(`/initiatives/${row.idea_id}`)}
                >
                  <td>{row.idea_id}</td>
                  <td>{row.title}</td>
                  <td>{row.value_stream}</td>
                  <td>
                    <div className="mini-progress">
                      <span style={{ width: `${row.ipsafe_pct}%` }} />
                      <em>{row.ipsafe_pct}%</em>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {drill && (
        <section className="panel">
          <div className="panel-header-row">
            <h2>Drill-down: {drill.title}</h2>
            <button className="btn secondary" type="button" onClick={() => setDrill(null)}>
              Close
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Value Stream</th>
                  <th>Stage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {drillItems.map((item) => (
                  <tr
                    key={item.idea_id}
                    className="clickable"
                    onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                  >
                    <td>{item.idea_id}</td>
                    <td>{item.title}</td>
                    <td>{item.value_stream}</td>
                    <td>{item.stage_name || item.stage_code}</td>
                    <td>
                      <span className={`badge ${item.status}`}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
