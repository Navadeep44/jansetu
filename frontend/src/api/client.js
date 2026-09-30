// Thin API client. VITE_API_URL lets the frontend talk to a remote node; defaults to port 8000 when on Vite dev server (5173), or same origin in production.
const BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.port === '5173'
    ? `http://${window.location.hostname}:8000`
    : ''
)

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
  // India-only: any legacy `country` filter is really the selected state
  if (params && params.country !== undefined && params.state === undefined) { params = { ...params, state: params.country }; delete params.country }
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
  board: (state) => request('/api/public/board' + qs({ state })),
  exportUrl: (state) => `${BASE}/api/export/need-gap.csv${qs({ state })}`,
  meta: () => request('/api/meta'),
  areas: (state) => request('/api/areas' + qs({ state })),
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
  overview: (state) => request('/api/analytics/overview' + qs({ state })),
  states: () => request('/api/analytics/states'),
  districts: (state) => request('/api/analytics/districts' + qs({ state })),
  blocks: (district, state) => request('/api/analytics/blocks' + qs({ district, state })),
  needGap: (params) => request('/api/analytics/need-gap' + qs(params)),
  mapAreas: (params) => request('/api/analytics/areas' + qs(params)),
  silent: (state) => request('/api/analytics/silent-zones' + qs({ state })),
  alignment: (state, national) => request('/api/analytics/alignment' + qs({ state, national })),
  trends: (params) => request('/api/analytics/trends' + qs(params)),
  alerts: (state) => request('/api/analytics/alerts' + qs({ state })),
  sectors: (state) => request('/api/analytics/sectors' + qs({ state })),
  clusters: (params) => request('/api/clusters' + qs(params)),
  cluster: (id) => request(`/api/clusters/${id}`),
  projects: (params) => request('/api/projects' + qs(params)),
  project: (id) => request(`/api/projects/${id}`),
  decide: (id, decision, reason) => request(`/api/projects/${id}/decision`, { method: 'POST', body: { decision, reason } }),
  regenerate: () => request('/api/projects/regenerate', { method: 'POST' }),
  optimise: (state, budget) => request('/api/projects/optimise', { method: 'POST', body: { state: state || null, budget } }),
  ask: (question) => request('/api/query', { method: 'POST', body: { question } }),
  brief: (params) => request('/api/briefs' + qs(params)),
  impactProjects: (state) => request('/api/impact/projects' + qs({ state })),
  kpis: () => request('/api/impact/kpis'),
  gramSabha: (district, area) => request('/api/plans/gram-sabha' + qs({ district, area })),
  gramSabhaCsv: (district, area) => `${BASE}/api/plans/gram-sabha.csv${qs({ district, area })}`,
  // Complete grievance-to-budget cycle APIs
  geoHierarchy: () => request('/api/geo/hierarchy'),
  cycleIntake: (form) => request('/api/cycle/intake', { method: 'POST', form }),
  verifyHead: (id, form) => request(`/api/requests/${id}/verify-head`, { method: 'POST', form: toFormData(form) }),
  assignCycle: (id, form) => request(`/api/requests/${id}/assign-cycle`, { method: 'POST', form: toFormData(form) }),
  inspectAndBudget: (id, form) => request(`/api/requests/${id}/inspect-and-budget`, { method: 'POST', form: toFormData(form) }),
  forwardCollector: (id, form) => request(`/api/requests/${id}/forward-to-collector`, { method: 'POST', form: toFormData(form) }),
  collectorDecision: (id, form) => request(`/api/requests/${id}/budget/decision`, { method: 'POST', form: toFormData(form) }),
  respondNegotiation: (id, form) => request(`/api/requests/${id}/budget/respond-negotiation`, { method: 'POST', form: toFormData(form) }),
  logExpense: (id, form) => request(`/api/requests/${id}/expenses`, { method: 'POST', form: toFormData(form) }),
  completeWork: (id, form) => request(`/api/requests/${id}/complete-work`, { method: 'POST', form: toFormData(form) }),
  reviewProofCycle: (id, form) => request(`/api/requests/${id}/proof/review-cycle`, { method: 'POST', form: toFormData(form) }),
  citizenConfirmCycle: (tid, form) => request(`/api/requests/${encodeURIComponent(tid)}/citizen-confirm`, { method: 'POST', form: toFormData(form) }),
  assignableOfficers: (params) => request('/api/officer/assignable-officers' + qs(params)),
  collectorInbox: (params) => request('/api/cycle/collector-inbox' + qs(params)),
  collectorSummary: (params) => request('/api/cycle/collector-summary' + qs(params)),
  stateSummary: (params) => request('/api/cycle/state-summary' + qs(params)),
  dhTeamSummary: () => request('/api/cycle/dh-team-summary'),
  foWallet: () => request('/api/cycle/fo-wallet'),
  budgetFunnel: (params) => request('/api/analytics/budget-funnel' + qs(params)),
  cycleMetrics: (params) => request('/api/analytics/cycle-metrics' + qs(params)),
  negotiationStats: (params) => request('/api/analytics/negotiation-stats' + qs(params)),
  casesByMandal: (params) => request('/api/analytics/cases-by-mandal' + qs(params)),
  exportCycleCsvUrl: (params) => `${BASE}/api/analytics/export-cycle.csv${qs(params)}`,
  // Generic helpers for role-specific endpoints (officer workflows, admin). Path starts with /api/...
  get: (path, params) => request(path + qs(params || {})),
  post: (path, body) => request(path, { method: 'POST', body: body ?? {} }),
  postForm: (path, form) => request(path, { method: 'POST', form }),
  patch: (path, body) => request(path, { method: 'PATCH', body: body ?? {} }),
  put: (path, body) => request(path, { method: 'PUT', body: body ?? {} }),
  del: (path) => request(path, { method: 'DELETE' }),
}

export function toFormData(obj) {
  if (obj instanceof FormData) return obj
  const fd = new FormData()
  if (!obj) return fd
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) {
      if (Array.isArray(v)) {
        v.forEach((item) => fd.append(k, item))
      } else {
        fd.append(k, v)
      }
    }
  }
  return fd
}
