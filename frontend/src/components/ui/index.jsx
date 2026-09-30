import { useId } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Loader2, Square, Volume2 } from 'lucide-react'
import { useState as useStateR, useEffect as useEffectR } from 'react'
import { useApp } from '../../context/AppContext'
import { SPEECH_TAG, useT } from '../../i18n'
import { useLocation } from 'react-router-dom'
import RoleCard, { DeniedNotice } from '../layout/RoleCard'
import { SECTORS, STATUS_LABEL, STATUS_TONE, ngiColor } from '../../lib/format'

export function Card({ title, sub, actions, children, className = '', ...rest }) {
  const t = useT()
  if (typeof title === 'string') title = t(title)
  if (typeof sub === 'string') sub = t(sub)
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
  const t = useT()
  if (typeof label === 'string') label = t(label)
  if (typeof note === 'string') note = t(note)
  return (
    <div className={`card stat ${tone ? 'tile-' + tone : ''}`}>
      <div className="stat-label">{Icon && <Icon size={16} aria-hidden="true" />}{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

export const Badge = ({ tone = '', children, title }) => <span className={`badge ${tone ? 'badge-' + tone : ''}`} title={title}>{children}</span>

export function StatusBadge({ status }) {
  const t = useT()
  return <Badge tone={STATUS_TONE[status] || ''}>{t(STATUS_LABEL[status] || status)}</Badge>
}

export function SectorTag({ sector, short = false }) {
  const t = useT()
  const s = SECTORS[sector] || SECTORS.other
  const Icon = s.Icon
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <Icon size={16} color={s.hex} aria-hidden="true" />
      <span>{t(short ? s.short : s.label)}</span>
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

export function Loading({ label = 'Loading', height = 120 }) {
  const t = useT()
  return <div className="skeleton" style={{ height }} role="status" aria-live="polite"><span className="sr-only">{t(label)}…</span></div>
}

export const Spinner = () => <Loader2 size={18} className="spin" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }} />

export function ErrorBox({ error }) {
  const t = useT()
  if (!error) return null
  return <div className="alert alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /><div>{t(error.message || String(error))}</div></div>
}

export function Empty({ children = 'Nothing to show yet.' }) {
  const t = useT()
  return <div className="empty">{typeof children === 'string' ? t(children) : children}</div>
}

// Reads text aloud in the chosen UI language (for people who find reading hard). Uses the phone's own voice.
export function ListenButton({ text, className = 'btn btn-sm', label }) {
  const t = useT()
  const { uiLang } = useApp()
  const [on, setOn] = useStateR(false)
  useEffectR(() => () => { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }, [])
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const toggle = () => {
    const ss = window.speechSynthesis
    if (on) { ss.cancel(); setOn(false); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = SPEECH_TAG[uiLang] || 'en-IN'
    const v = ss.getVoices().find((x) => x.lang?.toLowerCase().startsWith(u.lang.slice(0, 2)))
    if (v) u.voice = v
    u.rate = 0.92
    u.onend = () => setOn(false)
    ss.cancel(); ss.speak(u); setOn(true)
  }
  return (
    <button type="button" className={className} onClick={toggle} aria-pressed={on}>
      {on ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}{on ? t('Stop') : (label || t('Listen'))}
    </button>
  )
}

export function Tabs({ tabs, value, onChange, label = 'Sections' }) {
  const uid = useId()
  const tt = useT()
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} role="tab" className="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)}>
          {value === t.value && <motion.span layoutId={`tab-${uid}`} className="tab-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="tab-label">{typeof t.label === 'string' ? tt(t.label) : t.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Seg({ options, value, onChange, label }) {
  const uid = useId()
  const tt = useT()
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.span layoutId={`seg-${uid}`} className="seg-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="tab-label">{typeof o.label === 'string' ? tt(o.label) : o.label}</span>
        </button>
      ))}
    </div>
  )
}

// Dark hero band at the top of every page (matches the landing page).
// steps: 2-4 very short "how to use this page" hints shown as numbered chips.
export function PageHead(props) {
  // On an officer's own home page, show "your job" right under the header (and a notice if they were redirected).
  const { isOfficial, roleInfo: ri } = useApp()
  const loc = useLocation()
  const atHome = isOfficial && ri && loc.pathname === ri.home
  const denied = isOfficial && new URLSearchParams(loc.search).get('denied')
  if (!atHome && !denied) return <PageHeadInner {...props} />
  return (
    <>
      <PageHeadInner {...props} />
      <div className="stack">
        {atHome ? <RoleCard /> : <DeniedNotice />}
      </div>
    </>
  )
}

function PageHeadInner({ title, children, actions, eyebrow, steps, icon: Icon, overlap = true, listen = true }) {
  const t = useT()
  const T = (x) => (typeof x === 'string' ? t(x) : x)
  const spoken = [title, children, ...(steps || [])].map(T).filter((x) => typeof x === 'string').join('. ')
  return (
    <header className={`page-hero ${overlap ? 'overlap' : ''}`}>
      <div className="page-hero-inner">
        <div className="page-hero-text">
          <div className="page-hero-top">
            {eyebrow && <span className="page-eyebrow">{Icon && <Icon size={14} aria-hidden="true" />}{T(eyebrow)}</span>}
            {listen && <ListenButton text={spoken} className="page-listen" />}
          </div>
          <h1>{T(title)}</h1>
          {children && <p className="page-sub">{T(children)}</p>}
          {steps?.length > 0 && (
            <ol className="page-steps" aria-label={t('How to use this page')}>
              {steps.map((s, i) => <li key={s}><span>{i + 1}</span>{T(s)}</li>)}
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
  const t = useT()
  return (
    <ul className={`color-guide ${compact ? 'compact' : ''}`}>
      {COLOR_MEANING.map((c) => (
        <li key={c.tone}><span className={`badge badge-${c.tone}`}>{t(c.label)}</span><span className="small">{t(c.meaning)}</span></li>
      ))}
    </ul>
  )
}
