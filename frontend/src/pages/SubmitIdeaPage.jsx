import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const DOC_TYPES = ['PowerPoint', 'Word', 'PDF', 'Excel', 'Image', 'Other']

const emptyForm = {
  title: '',
  value_stream_id: '',
  owner_id: '',
  business_problem: '',
  proposed_concept: '',
  business_value: '',
  priority: 'Medium',
  target_users: '',
  expected_outcome: '',
  initiative_type: 'Rapid Prototype',
}

export default function SubmitIdeaPage() {
  const navigate = useNavigate()
  const [reference, setReference] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [documents, setDocuments] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getReference().then(setReference).catch((err) => setError(err.message))
  }, [])

  const leads = useMemo(
    () => reference?.users?.filter((u) => u.role === 'Value Stream Lead') || [],
    [reference],
  )

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const ownerName =
      leads.find((u) => String(u.id) === String(form.owner_id))?.name || 'Value Stream Lead'
    const next = files.map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      let document_type = 'Other'
      if (['ppt', 'pptx'].includes(ext)) document_type = 'PowerPoint'
      else if (['doc', 'docx'].includes(ext)) document_type = 'Word'
      else if (ext === 'pdf') document_type = 'PDF'
      else if (['xls', 'xlsx', 'csv'].includes(ext)) document_type = 'Excel'
      else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) document_type = 'Image'
      return {
        filename: file.name,
        document_type,
        uploaded_by: ownerName,
        version: '1.0',
      }
    })
    setDocuments((prev) => [...prev, ...next])
  }

  function removeDoc(index) {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const created = await api.createInitiative({
        ...form,
        value_stream_id: Number(form.value_stream_id),
        owner_id: Number(form.owner_id),
        documents,
      })
      navigate(`/initiatives/${created.idea_id}`)
    } catch (err) {
      setError(err.message || 'Unable to submit idea')
    } finally {
      setSaving(false)
    }
  }

  if (!reference && !error) return <div className="loading">Loading submission form…</div>

  return (
    <section className="panel">
      <h2>Submit New Idea</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Capture the business problem, proposed concept, and supporting material for management
        review.
      </p>

      {error && <div className="error" style={{ padding: '0.5rem 0' }}>{error}</div>}

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Idea title
          <input
            required
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g. AI Credit Risk Early Warning Prototype"
          />
        </label>

        <div className="form-row">
          <label>
            Risk Value Stream
            <select
              required
              value={form.value_stream_id}
              onChange={(e) => updateField('value_stream_id', e.target.value)}
            >
              <option value="">Select…</option>
              {reference?.value_streams
                ?.filter((vs) => vs.is_active)
                .map((vs) => (
                  <option key={vs.id} value={vs.id}>
                    {vs.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Submitted by
            <select
              required
              value={form.owner_id}
              onChange={(e) => updateField('owner_id', e.target.value)}
            >
              <option value="">Select…</option>
              {leads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Priority
            <select value={form.priority} onChange={(e) => updateField('priority', e.target.value)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
          <label>
            Proposed classification
            <select
              value={form.initiative_type}
              onChange={(e) => updateField('initiative_type', e.target.value)}
            >
              <option>Rapid Prototype</option>
              <option>MVP</option>
            </select>
          </label>
        </div>

        <label>
          Business problem
          <textarea
            required
            rows={3}
            value={form.business_problem}
            onChange={(e) => updateField('business_problem', e.target.value)}
          />
        </label>
        <label>
          Proposed concept
          <textarea
            required
            rows={3}
            value={form.proposed_concept}
            onChange={(e) => updateField('proposed_concept', e.target.value)}
          />
        </label>
        <label>
          Business value / expected benefit
          <textarea
            required
            rows={2}
            value={form.business_value}
            onChange={(e) => updateField('business_value', e.target.value)}
          />
        </label>

        <div className="form-row">
          <label>
            Target users
            <input
              value={form.target_users}
              onChange={(e) => updateField('target_users', e.target.value)}
            />
          </label>
          <label>
            Expected outcome
            <input
              value={form.expected_outcome}
              onChange={(e) => updateField('expected_outcome', e.target.value)}
            />
          </label>
        </div>

        <div>
          <div className="section-label">Supporting material</div>
          <div
            className={`dropzone${dragOver ? ' active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
          >
            <p>Drag and drop PowerPoint, Word, PDF, Excel, or images here</p>
            <label className="btn secondary" style={{ display: 'inline-block' }}>
              Browse files
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          <div className="doc-cards">
            {documents.map((doc, index) => (
              <div className="doc-card" key={`${doc.filename}-${index}`}>
                <strong>{doc.filename}</strong>
                <div className="meta">
                  <select
                    value={doc.document_type}
                    onChange={(e) => {
                      const value = e.target.value
                      setDocuments((prev) =>
                        prev.map((d, i) => (i === index ? { ...d, document_type: value } : d)),
                      )
                    }}
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="meta">
                  {doc.uploaded_by} · v{doc.version} · {new Date().toISOString().slice(0, 10)}
                </div>
                <button type="button" className="btn secondary" onClick={() => removeDoc(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn secondary" type="button" onClick={() => navigate('/ideas')}>
            Cancel
          </button>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit for Management Review'}
          </button>
        </div>
      </form>
    </section>
  )
}
