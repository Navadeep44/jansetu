// Who does what. One place that decides which pages and buttons each designation sees.
// The backend enforces the same rules (jurisdiction + decision rights); this file only shapes the UI.
import { BarChart3, ClipboardList, FileText, HandCoins, Inbox, Layers, ListOrdered, Sparkles, TrendingUp, Users } from 'lucide-react'

// Map old / alias role names to the real ones.
export function normRole(r) {
  const x = (r || '').toLowerCase()
  if (['national', 'admin'].includes(x)) return 'admin'
  if (['district', 'district_officer', 'collector'].includes(x)) return 'district_officer'
  if (['state', 'state_officer'].includes(x)) return 'state_officer'
  if (['officer', 'field_officer'].includes(x)) return 'field_officer'
  if (['dept_officer', 'department'].includes(x)) return 'dept_officer'
  return x
}

// All workspace pages. `inbox` label changes with the role (see ROLES[..].inboxLabel).
export const PAGES = {
  officer: { to: '/officer', label: 'Inbox', Icon: Inbox },
  dashboard: { to: '/dashboard', label: 'Dashboard', Icon: BarChart3 },
  priorities: { to: '/priorities', label: 'Priorities', Icon: ListOrdered },
  clusters: { to: '/clusters', label: 'Grouped needs', Icon: Layers },
  projects: { to: '/projects', label: 'Projects & budget', Icon: HandCoins },
  ask: { to: '/ask', label: 'Ask', Icon: Sparkles },
  brief: { to: '/brief', label: 'Brief', Icon: FileText },
  impact: { to: '/impact', label: 'Impact', Icon: TrendingUp },
  audit: { to: '/audit', label: 'Decision log', Icon: ClipboardList },
  users: { to: '/admin/users', label: 'Users', Icon: Users },
}

export const ROLES = {
  field_officer: {
    label: 'Field officer', level: 'block',
    job: 'Fix the cases given to you and upload photo proof.',
    duties: ['See only the cases assigned to you', 'Start work and update the status', 'Upload photo proof to close a case', 'Escalate if you are stuck'],
    pages: ['officer'], home: '/officer', inboxLabel: 'My tasks',
    can: {},
  },
  dept_officer: {
    label: 'Department officer', level: 'department',
    job: 'Run your department in your district: give cases to field staff and check their proof.',
    duties: ['See cases of your department only', 'Assign cases to field officers', 'Accept or send back proof of work', 'Propose new works'],
    pages: ['officer', 'clusters', 'projects'], home: '/officer', inboxLabel: 'Department queue',
    can: { assign: true, reviewProof: true, propose: true },
  },
  district_officer: {
    label: 'District Collector', level: 'district',
    job: 'Decide what your district builds first, and check that work is really done.',
    duties: ['See the whole district', 'Approve or reject projects in your district', 'Catch fake closures and urgent cases', 'Make the Gram Sabha plan'],
    pages: ['dashboard', 'officer', 'priorities', 'clusters', 'projects', 'ask', 'brief', 'impact', 'audit'], home: '/dashboard', inboxLabel: 'Checks',
    can: { decide: true, gramSabha: true, review: true, closureAudit: true },
  },
  state_officer: {
    label: 'State officer', level: 'state',
    job: 'Compare districts, fix wrong spending, and approve state projects.',
    duties: ['See all districts of your state', 'Approve or reject projects in your state', 'Find money going to low-need places', 'Brief the state government'],
    pages: ['dashboard', 'priorities', 'clusters', 'projects', 'ask', 'brief', 'impact', 'audit'], home: '/dashboard',
    can: { decide: true, budget: true },
  },
  admin: {
    label: 'National planner', level: 'nation',
    job: 'See all of India, compare states and plan the national budget.',
    duties: ['See every state', 'Plan the budget across India', 'Find silent areas and wrong spending', 'Brief the ministry'],
    pages: ['dashboard', 'priorities', 'clusters', 'projects', 'ask', 'brief', 'impact', 'audit'], home: '/dashboard',
    can: { decide: true, budget: true, pickState: true },
  },
  super_admin: {
    label: 'Super admin', level: 'nation',
    job: 'Manage officer accounts and see everything.',
    duties: ['Create and switch off officer accounts', 'See every page and every state', 'Check the decision log'],
    pages: ['dashboard', 'officer', 'priorities', 'clusters', 'projects', 'ask', 'brief', 'impact', 'audit', 'users'], home: '/dashboard',
    can: { decide: true, budget: true, pickState: true, gramSabha: true, review: true, closureAudit: true, assign: true, reviewProof: true, manageUsers: true },
  },
}

export const roleInfo = (r) => ROLES[normRole(r)] || null
export const canSee = (r, page) => !!roleInfo(r)?.pages.includes(page)
export const can = (r, action) => !!roleInfo(r)?.can?.[action]

// Human text for the officer's area, e.g. "Water · Utnoor mandal · Adilabad · Telangana".
export function jurisdictionText(user, t = (s) => s) {
  if (!user) return ''
  const parts = []
  if (user.department) parts.push(t(DEPT_LABEL[user.department] || user.department))
  const mandal = user.mandal || user.block
  if (mandal) parts.push(`${mandal} ${t('mandal')}`)
  if (user.district) parts.push(t(user.district))
  if (user.state) parts.push(t(user.state))
  if (parts.length === 0) return t('All India')
  return parts.join(' · ')
}

export const DEPT_LABEL = { water: 'Water', roads: 'Roads', electricity: 'Electricity', health: 'Health', education: 'Education', sanitation: 'Sanitation' }
