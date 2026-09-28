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

export const COUNTRIES = { IN: 'India', BR: 'Brazil', ZA: 'South Africa', RU: 'Russia', CN: 'China', EG: 'Egypt', ET: 'Ethiopia', IR: 'Iran', AE: 'UAE', ID: 'Indonesia' }
export const CURRENCY = { IN: 'INR', BR: 'BRL', ZA: 'ZAR' }

export const LANG_NAMES = {
  en: 'English', hi: 'Hindi (हिन्दी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)', bn: 'Bengali (বাংলা)',
  mr: 'Marathi (मराठी)', gu: 'Gujarati (ગુજરાતી)', kn: 'Kannada (ಕನ್ನಡ)', ml: 'Malayalam (മലയാളം)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', bho: 'Bhojpuri (भोजपुरी)', gon: 'Gondi',
}
export const SPEECH_TAGS = {
  en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', bn: 'bn-IN',
  mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN',
  or: 'or-IN', bho: 'hi-IN', gon: 'hi-IN',
}

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
export const money = (amount, country) => {
  if (amount === null || amount === undefined) return '–'
  if (country === 'IN') {
    if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(1)} Cr`
    if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`
    return `₹${nf.format(amount)}`
  }
  const sym = { BR: 'R$', ZA: 'R', USD: '$' }[country] || '$'
  if (amount >= 1e9) return `${sym}${(amount / 1e9).toFixed(1)}B`
  if (amount >= 1e6) return `${sym}${(amount / 1e6).toFixed(1)}M`
  if (amount >= 1e3) return `${sym}${(amount / 1e3).toFixed(0)}k`
  return `${sym}${nf.format(amount)}`
}
export const inr = (n) => money(n, 'IN')
export const usd = (n) => money(n, 'USD')
export const date = (iso) => (iso ? new Date(iso.endsWith('Z') ? iso : iso + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
export const ago = (iso) => {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()) / 86400000
  if (d < 1) return 'today'
  if (d < 2) return 'yesterday'
  if (d < 45) return `${Math.floor(d)} days ago`
  return `${Math.floor(d / 30)} months ago`
}
export const ngiColor = (v) => (v >= 75 ? '#7f1d1d' : v >= 62 ? '#dc2626' : v >= 50 ? '#f59e0b' : v >= 38 ? '#fcd34d' : '#fef3c7')
export const STATUS_LABEL = {
  received: '1. Received',
  needs_review: 'Under Review',
  assigned: '2. Assigned to Officer',
  clustered: 'In Demand Cluster',
  in_plan: 'Included in Scheme',
  in_progress: '3. Work In Progress',
  resolved_pending_verification: '4. Resolved (Pending Confirmation)',
  closed_verified: '5. Closed (Confirmed)',
  closed: '5. Closed (Confirmed)',
  reopened: 'Reopened (Disputed)',
  recommended: 'Awaiting Decision',
  approved: 'Approved',
  deferred: 'Deferred',
  rejected: 'Rejected',
  completed: 'Completed',
  planned: 'Planned',
  sanctioned: 'Sanctioned',
  open: 'Open',
  resolved: 'Resolved',
}
export const STATUS_TONE = {
  received: 'blue',
  needs_review: 'amber',
  assigned: 'blue',
  clustered: 'blue',
  in_plan: 'blue',
  in_progress: 'blue',
  resolved_pending_verification: 'amber',
  closed_verified: 'green',
  closed: 'green',
  reopened: 'red',
  completed: 'green',
  approved: 'green',
  rejected: 'red',
  deferred: 'amber',
  recommended: 'amber',
  sanctioned: 'blue',
  planned: '',
  resolved: 'green',
}
export const CHANNEL_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', ivr: 'IVR voice call', sms: 'SMS', web: 'Web / app', assisted: 'Assisted (CSC/ASHA)', community: 'Community meeting', import: 'Portal import', simulator: 'Simulator' }
