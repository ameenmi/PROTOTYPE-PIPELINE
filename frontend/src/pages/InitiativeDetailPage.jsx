import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'

const TABS = [
  'Overview',
  'Documents',
  'Requirements',
  'User Stories',
  'Data',
  'Architecture & Design',
  'AI Analysis',
  'Approvals',
  'Build',
  'Show & Tell',
  'IPSAFE',
  'Activity / Audit Trail',
]

export default function InitiativeDetailPage() {
  const { ideaId } = useParams()
  const [item, setItem] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [error, setError] = useState('')
  const [extra, setExtra] = useState({})

  useEffect(() => {
    api
      .getInitiative(ideaId)
      .then(setItem)
      .catch((err) => setError(err.message || 'Failed to load initiative'))
  }, [ideaId])

  useEffect(() => {
    if (!ideaId) return
    if (tab === 'Architecture & Design') {
      api.getDesign(ideaId).then((data) => setExtra((e) => ({ ...e, design: data.design })))
    }
    if (tab === 'Show & Tell') {
      api.getShowTell(ideaId).then((data) => setExtra((e) => ({ ...e, show_tell: data.show_tell })))
    }
    if (tab === 'IPSAFE') {
      api.getIpsafe(ideaId).then((data) => setExtra((e) => ({ ...e, ipsafe: data.ipsafe })))
    }
    if (tab === 'AI Analysis' || tab === 'Requirements' || tab === 'User Stories' || tab === 'Data') {
      api
        .getAiAnalysis(ideaId)
        .then((data) => setExtra((e) => ({ ...e, ai_analysis: data.ai_analysis })))
        .catch(() => {})
    }
  }, [tab, ideaId])

  async function runAiAnalyze() {
    const data = await api.analyzeInitiative(ideaId)
    setItem(data)
    setExtra((e) => ({ ...e, ai_analysis: data.ai_analysis }))
  }

  async function saveAiEdits() {
    if (!extra.ai_analysis) return
    const data = await api.updateAiAnalysis(ideaId, {
      actor: 'User',
      ...extra.ai_analysis,
    })
    setExtra((e) => ({ ...e, ai_analysis: data.ai_analysis }))
  }

  if (error) return <div className="error">{error}</div>
  if (!item) return <div className="loading">Loading initiative…</div>

  return (
    <div>
      <section className="detail-hero">
        <h1>{item.title}</h1>
        <div className="detail-meta">
          <span>Status: {item.stage_name}</span>
          <span>Type: {item.initiative_type}</span>
          <span>Risk Value Stream: {item.value_stream}</span>
          <span>Solution Team: {item.solution_team || 'Unassigned'}</span>
          <span>Owner: {item.owner}</span>
          <span>Readiness: {item.readiness_pct}%</span>
          <span>IPSAFE: {item.ipsafe_pct > 0 ? `${item.ipsafe_pct}%` : 'Not Started'}</span>
        </div>
      </section>

      {item.approval_timeline?.length > 0 && (
        <section className="panel">
          <h2>Approval Timeline</h2>
          <div className="timeline">
            {item.approval_timeline.map((step) => (
              <div className={`timeline-step ${step.state}`} key={step.key}>
                <div className="timeline-marker" />
                <div className="timeline-body">
                  <strong>{step.label}</strong>
                  <div className="meta">
                    {step.state === 'done'
                      ? '✓'
                      : step.state === 'current'
                        ? '●'
                        : step.state === 'blocked'
                          ? '!'
                          : '○'}{' '}
                    {step.detail || step.state}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="tabs">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            className={`tab${tab === name ? ' active' : ''}`}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <section className="panel">
        {tab === 'Overview' && (
          <div>
            <h2>Overview</h2>
            <p>
              <strong>Business problem:</strong> {item.business_problem || '—'}
            </p>
            <p>
              <strong>Proposed concept:</strong> {item.proposed_concept || '—'}
            </p>
            <p>
              <strong>Business value:</strong> {item.business_value || '—'}
            </p>
            <p className="meta">
              Priority {item.priority} · Age {item.age_days} days · Last updated{' '}
              {item.last_updated || '—'}
            </p>
          </div>
        )}

        {tab === 'Documents' && (
          <div>
            <h2>Documents</h2>
            {(!item.documents || item.documents.length === 0) && (
              <p className="muted">No documents uploaded yet.</p>
            )}
            <div className="insights">
              {item.documents?.map((doc) => (
                <div
                  className="insight"
                  key={doc.id}
                  style={{ background: '#f4f8fb', color: 'inherit', borderColor: 'var(--line)' }}
                >
                  <strong>{doc.filename}</strong>
                  <div className="meta">
                    {doc.document_type} · v{doc.version} · {doc.uploaded_by} · {doc.uploaded_at}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Architecture & Design' && (
          <div>
            <h2>Architecture & Design</h2>
            <p className="meta">
              Manage full design package in <Link to="/design">Design</Link>.
            </p>
            {!extra.design && <p className="muted">No design package saved yet.</p>}
            {extra.design && (
              <div className="form-grid">
                {Object.entries(extra.design)
                  .filter(([k, v]) => typeof v === 'string' && v && !['approved_by'].includes(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <strong>{k.replaceAll('_', ' ')}</strong>
                      <div>{v}</div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Approvals' && (
          <div>
            <h2>Approvals</h2>
            <p>
              Raghu: <span className={`badge ${item.raghu_approval}`}>{item.raghu_approval}</span>
            </p>
            <p>
              Vijay: <span className={`badge ${item.vijay_approval}`}>{item.vijay_approval}</span>
            </p>
            <p>
              Solution Lead:{' '}
              <span className={`badge ${item.solution_approval}`}>{item.solution_approval}</span>
            </p>
            {item.readiness && (
              <div style={{ marginTop: '1rem' }}>
                <div className="readiness-score">Readiness Score: {item.readiness.score}%</div>
                <div className="checklist">
                  {item.readiness.items.map((row) => (
                    <div className="checklist-row" key={row.key}>
                      <span className={`check-glyph ${row.status}`}>
                        {row.status === 'pass' ? '✓' : row.status === 'partial' ? '△' : '✕'}
                      </span>
                      <span className="check-label">{row.label}</span>
                      <span className="meta">{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Build' && (
          <div>
            <h2>Build</h2>
            <p>
              Current stage: <strong>{item.stage_name || item.stage_code}</strong>
            </p>
            <p className="muted">
              Advance build status from <Link to="/build">Build</Link> or{' '}
              <Link to="/ready-to-build">Ready to Build</Link>.
            </p>
          </div>
        )}

        {tab === 'Show & Tell' && (
          <div>
            <h2>Show & Tell</h2>
            <p className="meta">
              Capture sessions in <Link to="/show-and-tell">Show & Tell</Link>.
            </p>
            {(extra.show_tell || []).length === 0 && (
              <p className="muted">No Show & Tell entries yet.</p>
            )}
            <div className="attention-list">
              {(extra.show_tell || []).map((entry) => (
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'IPSAFE' && (
          <div>
            <h2>IPSAFE</h2>
            <p className="meta">
              Update progress in <Link to="/ipsafe">IPSAFE</Link>.
            </p>
            {extra.ipsafe && (
              <>
                <div className="progress-pair">
                  <div>
                    <div className="kpi-label">Capability Demonstrator</div>
                    <div className="readiness-score">{extra.ipsafe.cd_pct}%</div>
                  </div>
                  <div>
                    <div className="kpi-label">Solution</div>
                    <div className="readiness-score">{extra.ipsafe.solution_pct}%</div>
                  </div>
                </div>
                <div className="checklist" style={{ marginTop: '0.8rem' }}>
                  {extra.ipsafe.items.map((row) => (
                    <div className="checklist-row" key={row.activity_id}>
                      <span className="check-glyph pass">{row.required_for_cd ? 'CD' : 'SOL'}</span>
                      <span className="check-label">{row.name}</span>
                      <span className="meta">{row.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'AI Analysis' && (
          <div>
            <div className="panel-header-row">
              <h2>AI Analysis / Readiness Assessment</h2>
              <button className="btn" type="button" onClick={runAiAnalyze}>
                Run AI analysis
              </button>
            </div>
            {!extra.ai_analysis && (
              <p className="muted">
                No AI analysis yet. Run analysis to extract requirements, dependencies, and readiness.
              </p>
            )}
            {extra.ai_analysis && (
              <>
                <div className="ai-readiness-panel">
                  <div className="readiness-score">
                    {extra.ai_analysis.readiness_summary ||
                      `Requirements completeness: ${extra.ai_analysis.readiness_score}%`}
                  </div>
                  <div>
                    <strong>Overall readiness:</strong> {extra.ai_analysis.overall_readiness}
                  </div>
                  <div>
                    <strong>AI recommendation:</strong> {extra.ai_analysis.recommendation}
                  </div>
                  <div className="meta">Source: {extra.ai_analysis.source}</div>
                </div>
                <div className="form-grid" style={{ marginTop: '0.9rem' }}>
                  {[
                    ['problem_statement', 'Problem statement'],
                    ['proposed_solution', 'Proposed solution'],
                    ['business_objective', 'Business objective'],
                    ['functional_requirements', 'Functional requirements'],
                    ['non_functional_requirements', 'Non-functional requirements'],
                    ['user_stories', 'User stories'],
                    ['data_requirements', 'Data requirements'],
                    ['upstream_systems', 'Upstream systems'],
                    ['downstream_systems', 'Downstream systems'],
                    ['dependencies', 'Dependencies'],
                    ['models_required', 'Models required'],
                    ['methodologies_required', 'Methodologies required'],
                    ['risks', 'Risks'],
                    ['assumptions', 'Assumptions'],
                    ['open_questions', 'Open questions'],
                    ['missing_information', 'Missing information'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <textarea
                        rows={2}
                        value={extra.ai_analysis[key] || ''}
                        onChange={(e) =>
                          setExtra((prev) => ({
                            ...prev,
                            ai_analysis: { ...prev.ai_analysis, [key]: e.target.value },
                          }))
                        }
                      />
                    </label>
                  ))}
                  <div className="form-actions">
                    <button className="btn" type="button" onClick={saveAiEdits}>
                      Save AI edits
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {['Requirements', 'User Stories', 'Data'].includes(tab) && (
          <div>
            <h2>{tab}</h2>
            {!extra.ai_analysis && (
              <p className="muted">
                Run AI analysis on the AI Analysis tab to populate extracted {tab.toLowerCase()}.
              </p>
            )}
            {extra.ai_analysis && tab === 'Requirements' && (
              <>
                <p>
                  <strong>Functional:</strong> {extra.ai_analysis.functional_requirements}
                </p>
                <p>
                  <strong>Non-functional:</strong> {extra.ai_analysis.non_functional_requirements}
                </p>
              </>
            )}
            {extra.ai_analysis && tab === 'User Stories' && (
              <p>{extra.ai_analysis.user_stories}</p>
            )}
            {extra.ai_analysis && tab === 'Data' && (
              <p>{extra.ai_analysis.data_requirements}</p>
            )}
          </div>
        )}

        {tab === 'Activity / Audit Trail' && (
          <div>
            <h2>Activity / Audit Trail</h2>
            {(!item.activities || item.activities.length === 0) && (
              <p className="muted">No activity recorded yet.</p>
            )}
            <div className="attention-list">
              {item.activities?.map((activity) => (
                <div className="attention-item" key={activity.id}>
                  <span className="dot Green" />
                  <div>
                    <strong>
                      {activity.actor} — {activity.action}
                    </strong>
                    <div className="meta">
                      {activity.detail || ''} {activity.created_at ? `· ${activity.created_at}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
