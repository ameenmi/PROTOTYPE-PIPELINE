import { useEffect, useState } from 'react'
import { api } from '../api/client'

export default function NotificationsPage() {
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState('')

  async function load(recipient) {
    const result = await api.getNotifications(recipient || undefined)
    setData(result)
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [])

  async function markRead(id) {
    await api.markNotificationRead(id)
    await load(filter)
  }

  async function markAll() {
    await api.markAllNotificationsRead(filter || undefined)
    await load(filter)
  }

  if (error) return <div className="error">{error}</div>
  if (!data) return <div className="loading">Loading notifications…</div>

  return (
    <section className="panel">
      <div className="panel-header-row">
        <div>
          <h2>Notification Center</h2>
          <p className="muted" style={{ margin: 0 }}>
            {data.unread} unread of {data.count} notifications
          </p>
        </div>
        <div className="topbar-actions">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              load(e.target.value).catch((err) => setError(err.message))
            }}
          >
            <option value="">All recipients</option>
            <option>Vijay</option>
            <option>Raghu</option>
            <option>Solution Team 3</option>
            <option>Priya Shah</option>
          </select>
          <button className="btn secondary" type="button" onClick={markAll}>
            Mark all read
          </button>
        </div>
      </div>

      <div className="attention-list" style={{ marginTop: '0.9rem' }}>
        {data.items.length === 0 && <div className="muted">No notifications.</div>}
        {data.items.map((item) => (
          <div
            className={`attention-item${item.is_read ? '' : ' unread-note'}`}
            key={item.id}
          >
            <span className={`dot ${item.is_read ? 'Green' : 'Amber'}`} />
            <div style={{ flex: 1 }}>
              <strong>{item.recipient}</strong>
              <div>{item.message}</div>
              <div className="meta">{item.created_at || ''}</div>
            </div>
            {!item.is_read && (
              <button className="btn secondary" type="button" onClick={() => markRead(item.id)}>
                Mark read
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
