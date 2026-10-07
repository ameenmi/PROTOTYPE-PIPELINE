import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useRole } from '../role/RoleContext'

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { persona } = useRole()
  const [data, setData] = useState(null)
  const [initiatives, setInitiatives] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    idea_id: '',
    filename: '',
    document_type: 'Word',
    replace_of_id: '',
  })

  async function load(q) {
    const [docs, inis] = await Promise.all([
      api.getDocuments(q || undefined),
      api.getInitiatives(),
    ])
    setData(docs)
    setInitiatives(inis)
    if (!form.idea_id && inis[0]) {
      setForm((prev) => ({ ...prev, idea_id: inis[0].idea_id }))
    }
  }

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [persona?.id])

  const versionGroups = useMemo(() => {
    const groups = {}
    for (const doc of data?.items || []) {
      const key = `${doc.idea_id}::${doc.filename}`
      if (!groups[key]) groups[key] = []
      groups[key].push(doc)
    }
    Object.values(groups).forEach((list) =>
      list.sort((a, b) => String(a.version).localeCompare(String(b.version))),
    )
    return groups
  }, [data])

  async function upload(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await api.uploadDocument(form.idea_id, {
        filename: form.filename,
        document_type: form.document_type,
        uploaded_by: persona?.name || 'User',
        replace_of_id: form.replace_of_id ? Number(form.replace_of_id) : null,
      })
      setMessage(`Uploaded ${form.filename}`)
      setForm((prev) => ({ ...prev, filename: '', replace_of_id: '' }))
      await load(search)
    } catch (err) {
      setError(err.message)
    }
  }

  if (error && !data) return <div className="error">{error}</div>
  if (!data) return <div className="loading">Loading documents…</div>

  return (
    <div>
      <section className="panel">
        <div className="panel-header-row">
          <div>
            <h2>Documents</h2>
            <p className="muted" style={{ margin: 0 }}>
              Supporting material with version history ({data.count})
            </p>
          </div>
          <form
            className="filters"
            style={{ marginBottom: 0 }}
            onSubmit={(e) => {
              e.preventDefault()
              load(search).catch((err) => setError(err.message))
            }}
          >
            <input
              placeholder="Search filename, ID, or title"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn secondary" type="submit">
              Search
            </button>
          </form>
        </div>
        {error && <div className="error" style={{ padding: '0.4rem 0' }}>{error}</div>}
        {message && <div className="success-banner">{message}</div>}
      </section>

      <div className="split-layout">
        <section className="panel">
          <h2>Library</h2>
          <div className="doc-cards">
            {Object.entries(versionGroups).map(([key, versions]) => {
              const latest = versions[versions.length - 1]
              return (
                <div className="doc-card" key={key}>
                  <strong>{latest.filename}</strong>
                  <div className="meta">
                    {latest.document_type} · latest v{latest.version}
                  </div>
                  <div className="meta">
                    {latest.idea_id} · {latest.value_stream}
                  </div>
                  <div className="version-list">
                    {versions.map((v) => (
                      <div className="meta" key={v.id}>
                        v{v.version} · {v.uploaded_by} · {v.uploaded_at}
                      </div>
                    ))}
                  </div>
                  <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => navigate(`/initiatives/${latest.idea_id}`)}
                    >
                      Open initiative
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() =>
                        setForm({
                          idea_id: latest.idea_id,
                          filename: latest.filename,
                          document_type: latest.document_type,
                          replace_of_id: String(latest.id),
                        })
                      }
                    >
                      New version
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="panel">
          <h2>{form.replace_of_id ? 'Upload new version' : 'Upload document'}</h2>
          <form className="form-grid" onSubmit={upload}>
            <label>
              Initiative
              <select
                required
                value={form.idea_id}
                onChange={(e) => setForm((p) => ({ ...p, idea_id: e.target.value }))}
              >
                {initiatives.map((i) => (
                  <option key={i.idea_id} value={i.idea_id}>
                    {i.idea_id} — {i.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Filename
              <input
                required
                value={form.filename}
                onChange={(e) => setForm((p) => ({ ...p, filename: e.target.value }))}
                placeholder="Requirements_v2.docx"
              />
            </label>
            <label>
              Document type
              <select
                value={form.document_type}
                onChange={(e) => setForm((p) => ({ ...p, document_type: e.target.value }))}
              >
                <option>PowerPoint</option>
                <option>Word</option>
                <option>PDF</option>
                <option>Excel</option>
                <option>Image</option>
                <option>Other</option>
              </select>
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setForm((p) => ({ ...p, filename: '', replace_of_id: '', document_type: 'Word' }))
                }
              >
                Clear
              </button>
              <button className="btn" type="submit">
                Upload
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
