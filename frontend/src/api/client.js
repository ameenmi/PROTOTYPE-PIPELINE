const API_BASE = import.meta.env.VITE_API_BASE ?? ''

function currentUserId() {
  const saved = localStorage.getItem('pipeline_persona_id')
  return saved ? Number(saved) : null
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail
        ? typeof body.detail === 'string'
          ? body.detail
          : JSON.stringify(body.detail)
        : message
    } catch {
      const text = await res.text()
      if (text) message = text
    }
    throw new Error(message)
  }
  if (res.status === 204) return null
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('text/csv')) return res.text()
  return res.json()
}

function withUser(params = {}) {
  const userId = currentUserId()
  if (userId) return { ...params, user_id: userId }
  return params
}

export const api = {
  getPersonas: () => request('/api/personas'),
  getDashboard: () => {
    const qs = new URLSearchParams(withUser())
    const suffix = qs.toString() ? `?${qs}` : ''
    return request(`/api/dashboard${suffix}`)
  },
  getInitiatives: (params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(withUser(params)).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') qs.set(key, value)
    })
    const suffix = qs.toString() ? `?${qs}` : ''
    return request(`/api/initiatives${suffix}`)
  },
  getInitiative: (ideaId) => request(`/api/initiatives/${ideaId}`),
  createInitiative: (payload) =>
    request('/api/initiatives', { method: 'POST', body: JSON.stringify(payload) }),
  uploadDocument: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/documents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getDocumentVersions: (ideaId, filename) =>
    request(
      `/api/initiatives/${ideaId}/document-versions${
        filename ? `?filename=${encodeURIComponent(filename)}` : ''
      }`,
    ),
  exportPortfolio: async (format = 'json') => {
    const qs = new URLSearchParams(withUser({ format }))
    if (format === 'csv') {
      const text = await request(`/api/reports/export?${qs}`)
      return text
    }
    return request(`/api/reports/export?${qs}`)
  },
  managementApproval: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/management-approval`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  solutionReadiness: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/solution-readiness`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getPendingApprovals: () => request('/api/approvals/pending'),
  getSolutionReviewQueue: () => request('/api/solution-review/queue'),
  getDesignQueue: () => request('/api/design/queue'),
  getDesign: (ideaId) => request(`/api/initiatives/${ideaId}/design`),
  saveDesign: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/design`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  approveDesign: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/design/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getReadyToBuild: () => request('/api/ready-to-build'),
  getBuildQueue: () => request('/api/build/queue'),
  advanceStage: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/stage`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getShowTellQueue: () => request('/api/show-and-tell/queue'),
  getShowTell: (ideaId) => request(`/api/initiatives/${ideaId}/show-tell`),
  addShowTell: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/show-tell`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  promoteMvp: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/promote-mvp`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getIpsafeQueue: () => request('/api/ipsafe/queue'),
  getIpsafe: (ideaId) => request(`/api/initiatives/${ideaId}/ipsafe`),
  updateIpsafe: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/ipsafe`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  convertSolution: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/convert-solution`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  askCopilot: (question) =>
    request('/api/copilot/ask', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  generateExecutiveSummary: () =>
    request('/api/ai/executive-summary', { method: 'POST', body: '{}' }),
  analyzeInitiative: (ideaId) =>
    request(`/api/initiatives/${ideaId}/ai-analyze`, {
      method: 'POST',
      body: '{}',
    }),
  getAiAnalysis: (ideaId) => request(`/api/initiatives/${ideaId}/ai-analysis`),
  updateAiAnalysis: (ideaId, payload) =>
    request(`/api/initiatives/${ideaId}/ai-analysis`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAdmin: () => request('/api/admin'),
  createValueStream: (payload) =>
    request('/api/admin/value-streams', { method: 'POST', body: JSON.stringify(payload) }),
  updateValueStream: (id, payload) =>
    request(`/api/admin/value-streams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createSolutionTeam: (payload) =>
    request('/api/admin/solution-teams', { method: 'POST', body: JSON.stringify(payload) }),
  updateSolutionTeam: (id, payload) =>
    request(`/api/admin/solution-teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createUser: (payload) =>
    request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) =>
    request(`/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createStage: (payload) =>
    request('/api/admin/stages', { method: 'POST', body: JSON.stringify(payload) }),
  updateStage: (id, payload) =>
    request(`/api/admin/stages/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createIpsafeActivity: (payload) =>
    request('/api/admin/ipsafe-activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateIpsafeActivity: (id, payload) =>
    request(`/api/admin/ipsafe-activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAnalytics: () => request('/api/reports/analytics'),
  getDocuments: (search) =>
    request(`/api/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getNotifications: (recipient) =>
    request(
      `/api/notifications${recipient ? `?recipient=${encodeURIComponent(recipient)}` : ''}`,
    ),
  markNotificationRead: (id) =>
    request(`/api/notifications/${id}/read`, { method: 'POST', body: '{}' }),
  markAllNotificationsRead: (recipient) =>
    request(
      `/api/notifications/read-all${recipient ? `?recipient=${encodeURIComponent(recipient)}` : ''}`,
      { method: 'POST', body: '{}' },
    ),
  getReference: () => request('/api/reference'),
}
