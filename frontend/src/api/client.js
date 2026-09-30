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
  citizenLogin: (body) => request('/api/auth/citizen/login', { method: 'POST', body }),
  citizenRegister: (body) => request('/api/auth/citizen/register', { method: 'POST', body }),
  officerLogin: (body) => request('/api/auth/officer/login', { method: 'POST', body }),
  authMe: () => request('/api/auth/me'),
  rolesAndJurisdictions: () => request('/api/auth/roles-jurisdictions'),
  demoAccounts: () => request('/api/auth/demo-accounts'),
  adminUsers: (params) => request('/api/admin/users' + qs(params)),
  createOfficer: (body) => request('/api/admin/users', { method: 'POST', body }),
  updateOfficer: (id, body) => request(`/api/admin/users/${id}`, { method: 'PUT', body }),
  deleteOfficer: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminStats: () => request('/api/admin/stats'),
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
  track: (tid, phone_last4) => request(`/api/track/${encodeURIComponent(tid)}` + qs({ phone_last4 })),
  verify: (tid, body) => request(`/api/track/${encodeURIComponent(tid)}/verify`, { method: 'POST', body }),
  confirmResolution: (tid, body = {}) => request(`/api/track/${encodeURIComponent(tid)}/confirm`, { method: 'POST', body }),
  disputeResolution: (tid, body) => request(`/api/track/${encodeURIComponent(tid)}/dispute`, { method: 'POST', body }),
  reply: (tid, body) => request(`/api/track/${encodeURIComponent(tid)}/reply`, { method: 'POST', body }),
  erase: (tid) => request(`/api/track/${encodeURIComponent(tid)}`, { method: 'DELETE' }),
  simulate: (body) => request('/api/channels/simulate', { method: 'POST', body }),
  requests: (params) => request('/api/requests' + qs(params)),
  reviewQueue: () => request('/api/review-queue'),
  review: (id, body) => request(`/api/requests/${id}/review`, { method: 'POST', body }),
  closeAudit: (id, closure_note) => request(`/api/requests/${id}/close/audit`, { method: 'POST', body: { closure_note } }),
  close: (id, closure_note, force = false) => request(`/api/requests/${id}/close`, { method: 'POST', body: { closure_note, force } }),
  resolveWithProof: (id, body) => request(`/api/requests/${id}/resolve-with-proof`, { method: 'POST', body }),
  assignOfficer: (id, body) => request(`/api/requests/${id}/assign`, { method: 'POST', body }),
  markInProgress: (id, body) => request(`/api/requests/${id}/in-progress`, { method: 'POST', body }),
  pendingProofReview: (params) => request('/api/admin/pending-proof-review' + qs(params)),
  flagProofSuspicious: (proofId, body) => request(`/api/admin/proof/${proofId}/flag-suspicious`, { method: 'POST', body }),
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

  // Hierarchical Officer Dashboards & Pipeline
  officerDashboard: (params) => request('/api/officer/dashboard' + qs(params)),
  officerDepartments: (params) => request('/api/officer/departments' + qs(params)),
  officerDistricts: (params) => request('/api/officer/districts' + qs(params)),
  officerStates: (params) => request('/api/officer/states' + qs(params)),
  officerTeam: (params) => request('/api/officer/team' + qs(params)),
  assignFieldOfficer: (requestId, body) => request(`/api/requests/${requestId}/assign`, { method: 'POST', body }),
  escalateComplaint: (requestId, body) => request(`/api/requests/${requestId}/escalate`, { method: 'POST', body }),
  reviewProofDecision: (requestId, body) => request(`/api/requests/${requestId}/proof/review`, { method: 'POST', body }),
  reassignDepartment: (requestId, body) => request(`/api/requests/${requestId}/reassign-department`, { method: 'POST', body }),
  proposeProject: (body) => request('/api/projects/propose', { method: 'POST', body }),
  approveProject: (projectId, body) => request(`/api/projects/${projectId}/approve`, { method: 'POST', body }),
  rejectProject: (projectId, body) => request(`/api/projects/${projectId}/reject`, { method: 'POST', body }),
  fundProject: (projectId, body) => request(`/api/projects/${projectId}/fund`, { method: 'POST', body }),
  recordExpenditure: (projectId, body) => request(`/api/projects/${projectId}/expenditure`, { method: 'POST', body }),
  completeProject: (projectId, body) => request(`/api/projects/${projectId}/complete`, { method: 'POST', body }),
  budgetSummary: (params) => request('/api/budget/summary' + qs(params)),
  createSubordinateOfficer: (body) => request('/api/officer/accounts', { method: 'POST', body }),
  deactivateSubordinateOfficer: (id) => request(`/api/officer/accounts/${id}/deactivate`, { method: 'PATCH' }),

  // V2 Addendum: Cross-Cutting, Field, Dept, District, State, National APIs
  officerNotifications: () => request('/api/officer/notifications'),
  markNotificationRead: (id) => request(`/api/officer/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/api/officer/notifications/read-all', { method: 'POST' }),
  officerSearch: (q) => request('/api/officer/search' + qs({ q })),
  officerProfile: () => request('/api/officer/profile'),
  updateOfficerProfile: (body) => request('/api/officer/profile', { method: 'PUT', body }),
  publicOfficerProfile: (userId) => request(`/api/officer/profile/${userId}`),
  officerActivity: (params) => request('/api/officer/activity' + qs(params)),
  officerResources: () => request('/api/officer/resources'),

  getVerification: (id) => request(`/api/cases/${id}/verification`),
  submitVerification: (id, body) => request(`/api/cases/${id}/verification`, { method: 'POST', body }),
  getCaseMessages: (id) => request(`/api/cases/${id}/messages`),
  sendCaseMessage: (id, body) => request(`/api/cases/${id}/messages`, { method: 'POST', body }),
  getCaseDocuments: (id) => request(`/api/cases/${id}/documents`),
  updateCaseDocument: (id, docId, body) => request(`/api/cases/${id}/documents/${docId}`, { method: 'PATCH', body }),
  optimiseRoute: () => request('/api/officer/route-optimise'),

  deptBoard: () => request('/api/dept/board'),
  assignSuggestions: (caseId) => request(`/api/dept/assign-suggestions/${caseId}`),
  deptWorkload: () => request('/api/dept/workload'),
  deptHotspots: () => request('/api/dept/hotspots'),
  deptScorecard: () => request('/api/dept/scorecard'),
  verifyDocumentRegistry: (id, body) => request(`/api/dept/documents/${id}/verify`, { method: 'POST', body }),

  districtCommand: () => request('/api/district/command'),
  districtRanking: () => request('/api/district/ranking'),
  getShowCauseNotices: () => request('/api/district/show-cause'),
  issueShowCause: (body) => request('/api/district/show-cause', { method: 'POST', body }),
  respondShowCause: (id, action, body) => request(`/api/district/show-cause/${id}` + qs({ action }), { method: 'PATCH', body }),
  districtHearings: () => request('/api/district/hearings'),
  createHearing: (body) => request('/api/district/hearings', { method: 'POST', body }),
  districtEmergency: () => request('/api/district/emergency'),
  declareEmergency: (body) => request('/api/district/emergency', { method: 'POST', body }),
  uploadUC: (projectId, body) => request(`/api/projects/${projectId}/uc`, { method: 'POST', body }),

  stateCommand: () => request('/api/state/command'),
  stateBenchmark: () => request('/api/state/benchmark'),
  stateCirculars: () => request('/api/state/circulars'),
  publishCircular: (body) => request('/api/state/circulars', { method: 'POST', body }),
  ackCircular: (id) => request(`/api/state/circulars/${id}/ack`, { method: 'POST' }),
  stateAppeals: () => request('/api/state/appeals'),
  adjudicateAppeal: (id, body) => request(`/api/state/appeals/${id}/decide`, { method: 'POST', body }),
  stateUC: () => request('/api/state/uc'),
  verifyUC: (id, body) => request(`/api/state/uc/${id}/verify`, { method: 'POST', body }),
  generateStateReport: (template) => request(`/api/state/reports/${template}`, { method: 'POST' }),
  citizenAppeal: (id, body) => request(`/api/citizen/requests/${id}/appeal`, { method: 'POST', body }),

  nationalCommand: () => request('/api/national/command'),
  nationalHealth: () => request('/api/national/health'),
  nationalSlaRules: () => request('/api/national/sla-rules'),
  previewSlaRule: (body) => request('/api/national/sla-rules/preview', { method: 'POST', body }),
  updateSlaRule: (body) => request('/api/national/sla-rules', { method: 'POST', body }),
  nationalAudit: (params) => request('/api/national/audit' + qs(params)),
  verifyAuditChain: () => request('/api/national/audit/verify-chain'),
  nationalIntegrations: () => request('/api/national/integrations'),
  toggleIntegration: (id) => request(`/api/national/integrations/${id}`, { method: 'PATCH' }),
  nationalAccessReview: () => request('/api/national/access-review'),
}
