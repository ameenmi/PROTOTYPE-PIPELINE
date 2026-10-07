import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function IdeasPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .getInitiatives()
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <div className="error">{error}</div>

  return (
    <section className="panel">
      <div className="panel-header-row">
        <div>
          <h2>Ideas</h2>
          <p className="muted" style={{ margin: 0 }}>
            All submitted ideas across Risk Value Streams.
          </p>
        </div>
        <button className="btn" type="button" onClick={() => navigate('/ideas/new')}>
          + Submit New Idea
        </button>
      </div>
      <div className="table-wrap" style={{ marginTop: '0.9rem' }}>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Value Stream</th>
              <th>Owner</th>
              <th>Stage</th>
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
                <td>{item.stage_name}</td>
                <td>
                  <span className={`badge ${item.status}`}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta" style={{ marginTop: '0.8rem' }}>
        New submissions enter Management Review. Track decisions in{' '}
        <Link to="/approvals">Approvals</Link>.
      </p>
    </section>
  )
}
