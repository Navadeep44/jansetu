// Thin API client. VITE_API_URL lets the frontend talk to a remote node; defaults to same origin (/api via Vite proxy).
const BASE = import.meta.env.VITE_API_URL || ''

let authToken = null
let onUnauthorised = () => {}
export const setToken = (t) => { authToken = t }
export const setOnUnauthorised = (fn) => { onUnauthorised = fn }

async function request(path, { method = 'GET', body, form, headers = {} } = {}) {
  const opts = { method, headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...headers } }
  if (form) opts.body = form
  else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (res.status === 401 && authToken) onUnauthorised()
  if (!res.ok) {
    const detail = data?.detail
    const msg = typeof detail === 'string' ? detail : detail?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = detail
    throw err
  }
  return data
}

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  return p.length ? '?' + new URLSearchParams(p).toString() : ''
}

export const api = {
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  citizenSendCode: (phone) => request('/api/auth/citizen/send-code', { method: 'POST', body: { phone } }),
  citizenVerify: (phone, code) => request('/api/auth/citizen/verify', { method: 'POST', body: { phone, code } }),
  citizenMe: () => request('/api/citizen/me/requests'),
  demoAccounts: () => request('/api/auth/demo-accounts'),
  myRequests: (phone) => request('/api/citizen/requests' + qs({ phone })),
  nearby: (params) => request('/api/nearby' + qs(params)),
  support: (clusterId, phone, language) => request(`/api/clusters/${clusterId}/support`, { method: 'POST', body: { phone: phone || null, language } }),
  board: (country) => request('/api/public/board' + qs({ country })),
  exportUrl: (country) => `${BASE}/api/export/need-gap.csv${qs({ country })}`,
  meta: () => request('/api/meta'),
  areas: (country) => request('/api/areas' + qs({ country })),
  preview: (text, language) => request('/api/intake/preview', { method: 'POST', body: { text, language } }),
  intakeForm: (form) => request('/api/intake/form', { method: 'POST', form }),
  intakeText: (body) => request('/api/intake/text', { method: 'POST', body }),
  community: (body) => request('/api/intake/community', { method: 'POST', body }),
  track: (tid) => request(`/api/track/${encodeURIComponent(tid)}`),
  verify: (tid, body) => request(`/api/track/${encodeURIComponent(tid)}/verify`, { method: 'POST', body }),
  reply: (tid, body) => request(`/api/track/${encodeURIComponent(tid)}/reply`, { method: 'POST', body }),
  erase: (tid) => request(`/api/track/${encodeURIComponent(tid)}`, { method: 'DELETE' }),
  simulate: (body) => request('/api/channels/simulate', { method: 'POST', body }),
  requests: (params) => request('/api/requests' + qs(params)),
  reviewQueue: () => request('/api/review-queue'),
  review: (id, body) => request(`/api/requests/${id}/review`, { method: 'POST', body }),
  closeAudit: (id, closure_note) => request(`/api/requests/${id}/close/audit`, { method: 'POST', body: { closure_note } }),
  close: (id, closure_note, force = false) => request(`/api/requests/${id}/close`, { method: 'POST', body: { closure_note, force } }),
  auditLog: () => request('/api/audit-log'),
  overview: (country) => request('/api/analytics/overview' + qs({ country })),
  needGap: (params) => request('/api/analytics/need-gap' + qs(params)),
  mapAreas: (params) => request('/api/analytics/areas' + qs(params)),
  silent: (country) => request('/api/analytics/silent-zones' + qs({ country })),
  alignment: (country) => request('/api/analytics/alignment' + qs({ country })),
  trends: (params) => request('/api/analytics/trends' + qs(params)),
  alerts: (country) => request('/api/analytics/alerts' + qs({ country })),
  sectors: (country) => request('/api/analytics/sectors' + qs({ country })),
  clusters: (params) => request('/api/clusters' + qs(params)),
  cluster: (id) => request(`/api/clusters/${id}`),
  projects: (params) => request('/api/projects' + qs(params)),
  project: (id) => request(`/api/projects/${id}`),
  decide: (id, decision, reason) => request(`/api/projects/${id}/decision`, { method: 'POST', body: { decision, reason } }),
  regenerate: () => request('/api/projects/regenerate', { method: 'POST' }),
  optimise: (country, budget) => request('/api/projects/optimise', { method: 'POST', body: { country, budget } }),
  ask: (question) => request('/api/query', { method: 'POST', body: { question } }),
  brief: (params) => request('/api/briefs' + qs(params)),
  impactProjects: (country) => request('/api/impact/projects' + qs({ country })),
  kpis: (country) => request('/api/impact/kpis' + qs({ country })),
  brics: () => request('/api/brics/exchange'),
}
