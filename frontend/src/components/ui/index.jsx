import { useId } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { SECTORS, STATUS_LABEL, STATUS_TONE, ngiColor } from '../../lib/format'

export function Card({ title, sub, actions, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, note, icon: Icon, tone }) {
  return (
    <div className={`card stat ${tone ? 'tile-' + tone : ''}`}>
      <div className="stat-label">{Icon && <Icon size={16} aria-hidden="true" />}{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

export const Badge = ({ tone = '', children, title }) => <span className={`badge ${tone ? 'badge-' + tone : ''}`} title={title}>{children}</span>

export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || ''}>{STATUS_LABEL[status] || status}</Badge>

export function SectorTag({ sector, short = false }) {
  const s = SECTORS[sector] || SECTORS.other
  const Icon = s.Icon
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <Icon size={16} color={s.hex} aria-hidden="true" />
      <span>{short ? s.short : s.label}</span>
    </span>
  )
}

export function NgiBar({ value }) {
  const v = Math.max(0, Math.min(100, value || 0))
  return (
    <div className="ngi-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label="Need-Gap Index">
      <div className="ngi-track"><div className="ngi-fill" style={{ width: `${v}%`, background: ngiColor(v) }} /></div>
      <span className="mono small" style={{ minWidth: 34, textAlign: 'right' }}>{v.toFixed(0)}</span>
    </div>
  )
}

export const Loading = ({ label = 'Loading', height = 120 }) => (
  <div className="skeleton" style={{ height }} role="status" aria-live="polite"><span className="sr-only">{label}…</span></div>
)

export const Spinner = () => <Loader2 size={18} className="spin" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />

export const ErrorBox = ({ error }) => error ? (
  <div className="alert alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div>{error.message || String(error)}</div></div>
) : null

export const Empty = ({ children = 'Nothing to show yet.' }) => <div className="empty">{children}</div>

export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  const uid = useId()
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {value === t.value && <motion.span layoutId={`tab-${uid}`} className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="tab-label">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Seg({ options, value, onChange, label }) {
  const uid = useId()
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${uid}`} className="seg-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="tab-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// Dark hero band at the top of every page (matches the landing page).
// steps: 2-4 very short "how to use this page" hints shown as numbered chips.
export function PageHead({ title, children, actions, eyebrow, steps, icon: Icon, overlap = true }) {
  return (
    <header className={`page-hero ${overlap ? 'overlap' : ''}`}>
      <div className="page-hero-inner">
        <div className="page-hero-text">
          {eyebrow && <span className="page-eyebrow">{Icon && <Icon size={14} aria-hidden="true" />}{eyebrow}</span>}
          <h1>{title}</h1>
          {children && <p className="page-sub">{children}</p>}
          {steps?.length > 0 && (
            <ol className="page-steps" aria-label="How to use this page">
              {steps.map((s, i) => <li key={s}><span>{i + 1}</span>{s}</li>)}
            </ol>
          )}
        </div>
        {actions && <div className="page-hero-actions">{actions}</div>}
      </div>
    </header>
  )
}

// One colour = one meaning, everywhere in the app (always shown with a word, never colour alone).
export const COLOR_MEANING = [
  { tone: 'blue', label: 'Blue', meaning: 'Action or in progress' },
  { tone: 'green', label: 'Green', meaning: 'Done or confirmed' },
  { tone: 'amber', label: 'Amber', meaning: 'Needs attention or a decision' },
  { tone: 'red', label: 'Red', meaning: 'Urgent or very high need' },
  { tone: 'violet', label: 'Purple', meaning: 'Silent area: high need, few voices' },
]

export function ColorGuide({ compact = false }) {
  return (
    <ul className={`color-guide ${compact ? 'compact' : ''}`}>
      {COLOR_MEANING.map((c) => (
        <li key={c.tone}><span className={`badge badge-${c.tone}`}>{c.label}</span><span className="small">{c.meaning}</span></li>
      ))}
    </ul>
  )
}
