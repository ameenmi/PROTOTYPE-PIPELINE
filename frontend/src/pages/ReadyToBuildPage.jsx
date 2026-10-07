import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function ReadyToBuildPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const data = await api.getReadyToBuild()
    setItems(data.items || [])
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function startBuild(ideaId) {
    setMessage('')
    try {
      await api.advanceStage(ideaId, {
        actor: 'Solution Lead',
        target_stage: 'build_in_progress',
        comment: 'Build started',
      })
      setMessage(`${ideaId} moved to Build in Progress`)
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="panel">
      <h2>Ready to Build</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Design-approved initiatives waiting to enter build.
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
              <th>Team</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No initiatives are ready to build.
                </td>
              </tr>
            )}
            {items.map((item) => (
              <tr key={item.idea_id}>
                <td>{item.idea_id}</td>
                <td>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => navigate(`/initiatives/${item.idea_id}`)}
                  >
                    {item.title}
                  </button>
                </td>
                <td>{item.value_stream}</td>
                <td>{item.solution_team || '—'}</td>
                <td>{item.initiative_type}</td>
                <td>
                  <button className="btn" type="button" onClick={() => startBuild(item.idea_id)}>
                    Start build
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
