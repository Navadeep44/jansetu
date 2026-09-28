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
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Seg({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function PageHead({ title, children, actions }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
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

export function Modal({ isOpen, onClose, title, children, maxWidth = 600 }) {
  if (!isOpen) return null
  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16
    }} onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card card" style={{
        maxWidth, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{title}</h3>
          <button className="btn btn-sm" onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}


