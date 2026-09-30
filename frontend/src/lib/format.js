import { Droplets, Route, Zap, HeartPulse, GraduationCap, Recycle, CircleHelp } from 'lucide-react'

export const SECTORS = {
  water: { label: 'Drinking water', short: 'Water', color: 'var(--sector-water)', hex: '#2a78d6', Icon: Droplets, sdg: 'SDG 6' },
  roads: { label: 'Roads & connectivity', short: 'Roads', color: 'var(--sector-roads)', hex: '#eb6834', Icon: Route, sdg: 'SDG 9' },
  electricity: { label: 'Electricity & lighting', short: 'Power', color: 'var(--sector-electricity)', hex: '#eda100', Icon: Zap, sdg: 'SDG 7' },
  health: { label: 'Health facilities', short: 'Health', color: 'var(--sector-health)', hex: '#e87ba4', Icon: HeartPulse, sdg: 'SDG 3' },
  education: { label: 'Schools & childcare', short: 'Education', color: 'var(--sector-education)', hex: '#4a3aa7', Icon: GraduationCap, sdg: 'SDG 4' },
  sanitation: { label: 'Sanitation & drainage', short: 'Sanitation', color: 'var(--sector-sanitation)', hex: '#1baf7a', Icon: Recycle, sdg: 'SDG 6' },
  other: { label: 'Other', short: 'Other', color: 'var(--sector-other)', hex: '#475569', Icon: CircleHelp, sdg: 'SDG 16' },
}
// Fixed categorical order (validated with the dataviz palette validator: CVD + normal-vision separation pass)
export const SECTOR_KEYS = ['water', 'roads', 'sanitation', 'electricity', 'health', 'education']

// India-only deployment: five pilot states across Telugu, Hindi, Odia and Bhojpuri regions
export const STATES = ['Telangana', 'Odisha', 'Delhi', 'Bihar', 'Uttar Pradesh', 'Maharashtra', 'Karnataka']
export const DISTRICTS = { Telangana: ['Adilabad', 'Hyderabad'], Odisha: ['Koraput'], Delhi: ['North East Delhi', 'North West Delhi', 'South Delhi', 'East Delhi', 'South West Delhi'], Bihar: ['Gaya'], 'Uttar Pradesh': ['Bahraich'] }
export const COUNTRIES = { IN: 'India' } // kept for older imports

export const LANG_NAMES = {
  en: 'English', hi: 'Hindi', bho: 'Bhojpuri', te: 'Telugu', or: 'Odia', ta: 'Tamil', bn: 'Bengali', mr: 'Marathi',
  ur: 'Urdu', kn: 'Kannada', ml: 'Malayalam', gu: 'Gujarati', pa: 'Punjabi', gon: 'Gondi',
}
export const SPEECH_TAGS = { en: 'en-IN', hi: 'hi-IN', bho: 'hi-IN', te: 'te-IN', or: 'or-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', ur: 'ur-IN', kn: 'kn-IN', ml: 'ml-IN', gu: 'gu-IN', pa: 'pa-IN', gon: 'te-IN' }

const nf = new Intl.NumberFormat('en-IN')
export const fmt = (n, d = 0) => (n === null || n === undefined || Number.isNaN(n) ? '–' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: 0 }))
export const pct = (x, d = 0) => (x === null || x === undefined ? '–' : `${(x * 100).toFixed(d)}%`)
export const compact = (n) => {
  if (n === null || n === undefined) return '–'
  const a = Math.abs(n)
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (a >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return nf.format(Math.round(n))
}
// Indian rupees in lakh / crore (the second argument is ignored; kept for older calls)
export const money = (amount) => {
  if (amount === null || amount === undefined) return '–'
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`
  return `₹${nf.format(Math.round(amount))}`
}
export const inr = money
export const date = (iso) => (iso ? new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
// Pass the t() function from useT() to get the text in the user's language.
export const ago = (iso, t = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k])) => {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()) / 86400000
  if (d < 1) return t('today', {})
  if (d < 2) return t('yesterday', {})
  if (d < 45) return t('{n} days ago', { n: Math.floor(d) })
  return t('{n} months ago', { n: Math.floor(d / 30) })
}
export const ngiColor = (v) => (v >= 75 ? '#7f1d1d' : v >= 62 ? '#dc2626' : v >= 50 ? '#f59e0b' : v >= 38 ? '#fcd34d' : '#fef3c7')
export const STATUS_LABEL = {
  received: 'Received', needs_review: 'Needs review', clustered: 'In demand cluster', in_plan: 'In plan', in_progress: 'Work in progress',
  resolved_pending_verification: 'Awaiting citizen check', closed: 'Closed (verified)', reopened: 'Reopened',
  recommended: 'Awaiting decision', approved: 'Approved', deferred: 'Deferred', rejected: 'Rejected', completed: 'Completed', planned: 'Planned', sanctioned: 'Sanctioned',
  open: 'Open', resolved: 'Resolved',
  assigned: 'Assigned', proposed: 'Proposed', district_approved: 'Approved by district', state_approved: 'Approved by state',
  funded: 'Money released', in_execution: 'Work in progress', escalated: 'Escalated',
}
export const STATUS_TONE = {
  needs_review: 'amber', reopened: 'red', closed: 'green', completed: 'green', approved: 'green', in_progress: 'blue', in_plan: 'blue',
  resolved_pending_verification: 'amber', rejected: 'red', deferred: 'amber', recommended: 'amber', sanctioned: 'blue', planned: '', clustered: 'blue', resolved: 'green',
}
export const CHANNEL_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', ivr: 'IVR voice call', sms: 'SMS', web: 'Web / app', assisted: 'Assisted (CSC/ASHA)', community: 'Community meeting', import: 'Portal import', simulator: 'Simulator' }
export const usd = money // legacy alias: pass cost_local (INR)
