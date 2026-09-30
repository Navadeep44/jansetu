// Small building blocks shared by the role work screens (My tasks, Department queue, Checks) and Grouped needs.
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Hammer, Lightbulb, MapPin, Siren, X } from 'lucide-react'
import { api } from '../../api/client'
import { useT } from '../../i18n'
import { Badge, ErrorBox, SectorTag } from '../ui'
import { LANG_NAMES, SECTORS, SECTOR_KEYS, money } from '../../lib/format'

export const toDate = (iso) => (iso ? new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z') : null)
const DAY = 86400000

// Work stage of a case, the same words for every officer.
export const DONE = ['closed', 'closed_verified']
export const proofAccepted = (r) => {
  if (DONE.includes(r.status)) return true
  const h = r.status_history || []
  return r.status === 'resolved_pending_verification' && h.length > 0 && h[h.length - 1].stage_label === 'Proof Accepted by Department'
}
export function stage(r) {
  if (DONE.includes(r.status) || proofAccepted(r)) return 'done'
  if (r.status === 'resolved_pending_verification') return 'proof'
  if (r.status === 'in_progress' || r.status === 'escalated') return 'working'
  return 'start'
}

const STAGE_LABEL = { start: 'To start', working: 'In progress', proof: 'Sent for proof check', done: 'Done' }
const STAGE_TONE = { start: 'amber', working: 'blue', proof: 'violet', done: 'green' }
export function StageBadge({ r }) {
  const t = useT()
  const s = stage(r)
  if (s === 'done' && r.status === 'resolved_pending_verification') return <Badge tone="green">{t('Done · citizen to confirm')}</Badge>
  if (s === 'start' && !r.assigned_field_officer_id) return <Badge tone="amber">{t('Not given yet')}</Badge>
  return <Badge tone={STAGE_TONE[s]}>{t(STAGE_LABEL[s])}</Badge>
}

// "Due in 2 days" / "Due today" / "Late by 3 days". Only for open cases that have a due date.
export function SlaBadge({ r }) {
  const t = useT()
  const due = toDate(r.sla_due_at)
  if (!due || ['proof', 'done'].includes(stage(r))) return null
  const days = Math.floor((due.getTime() - Date.now()) / DAY)
  if (r.is_overdue || days < 0) {
    const late = Math.max(1, Math.ceil((Date.now() - due.getTime()) / DAY))
    return <Badge tone="red"><Siren size={12} aria-hidden="true" />{t(late === 1 ? 'Late by 1 day' : 'Late by {n} days', { n: late })}</Badge>
  }
  if (days === 0) return <Badge tone="amber"><Clock size={12} aria-hidden="true" />{t('Due today')}</Badge>
  return <Badge><Clock size={12} aria-hidden="true" />{t(days === 1 ? 'Due in 1 day' : 'Due in {n} days', { n: days })}</Badge>
}

// Top of a case card: ID, place, problem type, citizen's words (their language + English).
export function CaseHead({ r, extra, hideOwner }) {
  const t = useT()
  return (
    <>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 8 }}>
          <SectorTag sector={r.category} short />
          <span className="row small" style={{ gap: 4 }}><MapPin size={14} aria-hidden="true" /><strong>{r.area || r.block || t('No place given')}</strong></span>
        </div>
        <span className="xs muted mono">{r.tracking_id}</span>
      </div>
      <div className="row mt" style={{ gap: 6 }}>
        <StageBadge r={r} /><SlaBadge r={r} />
        {r.severity >= 4 && <Badge tone="red"><AlertTriangle size={12} aria-hidden="true" />{t('Serious')}</Badge>}
        {r.escalated && <Badge tone="amber">{t('Escalated')}</Badge>}
        {r.status === 'reopened' && <Badge tone="red">{t('Citizen said not fixed')}</Badge>}
        {extra}
      </div>
      <p className="quote mt" style={{ marginBottom: 0 }}>
        <span className="orig">{r.text}</span>
        {r.translated_text && r.translated_text !== r.text && <span className="en" style={{ display: 'block' }}>{r.translated_text}</span>}
      </p>
      <div className="xs muted mt">{t(LANG_NAMES[r.language] || r.language || '')}{r.assigned_officer && !hideOwner ? <> · {t('With')}: {r.assigned_officer}</> : null}</div>
      {r.rework_note && stage(r) !== 'done' && (
        <div className="alert alert-warn mt"><AlertTriangle size={18} aria-hidden="true" /><div className="small"><strong>{t('Sent back')}:</strong> {r.rework_note}</div></div>
      )}
      {r.escalated && r.escalation_reason && <div className="xs muted mt">{t('Reason given')}: {r.escalation_reason}</div>}
    </>
  )
}

// Counts strip: big numbers the officer can tap.
export function CountStrip({ items, value, onPick }) {
  const t = useT()
  return (
    <section className="card" aria-label={t('Counts')}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))', gap: 8 }}>
        {items.map(({ key, icon: Icon, tone, label, n }) => {
          const Tag = onPick && key ? 'button' : 'div'
          return (
            <Tag key={label} type={Tag === 'button' ? 'button' : undefined} onClick={Tag === 'button' ? () => onPick(key) : undefined}
              aria-pressed={Tag === 'button' ? value === key : undefined} className={`card stat tile-${tone}`}
              style={{ textAlign: 'left', font: 'inherit', cursor: Tag === 'button' ? 'pointer' : 'default', minHeight: 76, padding: 12, boxShadow: 'none',
                outline: value && value === key ? '3px solid var(--color-accent)' : undefined, outlineOffset: 2 }}>
              <div className="stat-label"><Icon size={18} aria-hidden="true" />{label}</div>
              <div className="stat-value" style={{ fontSize: '1.8rem' }}>{n ?? '…'}</div>
            </Tag>
          )
        })}
      </div>
    </section>
  )
}

// Shrink a phone photo to a small JPEG data URL (fits the proof endpoint, quick on slow networks).
export function photoToDataUrl(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this photo')) }
    img.src = url
  })
}

// Inline "Propose a work" form for a grouped need (department officer only).
export function ProposeWork({ cluster, onDone }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [lakh, setLakh] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)
  if (done) return <div className="alert alert-success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><div className="small">{t('Work proposed. The District Collector will decide.')} <span className="mono">{done.code}</span> · {money(done.cost_local)}</div></div>
  if (!open) return <button type="button" className="btn btn-primary" onClick={() => { setTitle(cluster.title); setOpen(true) }}><Lightbulb size={16} aria-hidden="true" />{t('Propose a work')}</button>
  const send = async () => {
    setBusy(true); setErr(null)
    try {
      const r = await api.post('/api/projects/propose', {
        cluster_id: cluster.id, area_id: cluster.area_id, sector: cluster.category, title: title.trim(),
        estimated_cost_inr: lakh ? Math.round(Number(lakh) * 100000) : undefined,
      })
      setDone(r.project); onDone?.(r.project)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const idp = `pw-${cluster.id}`
  return (
    <div className="stack" style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', paddingTop: 10 }}>
      <div className="field"><label htmlFor={`${idp}-t`}>{t('What work?')}</label>
        <input id={`${idp}-t`} className="input" style={{ minHeight: 44 }} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="field"><label htmlFor={`${idp}-c`}>{t('Cost (₹ lakh)')}</label>
        <input id={`${idp}-c`} className="input" style={{ minHeight: 44 }} type="number" min="0" step="0.5" inputMode="decimal" value={lakh} onChange={(e) => setLakh(e.target.value)} placeholder="12" /></div>
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={busy || title.trim().length < 5} onClick={send}><Hammer size={16} aria-hidden="true" />{t('Send proposal')}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}><X size={16} aria-hidden="true" />{t('Cancel')}</button>
      </div>
      <ErrorBox error={err} />
    </div>
  )
}

// Move a case to the right department (District Collector / super admin only — the backend refuses others).
export function MoveDept({ r, onDone }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [dept, setDept] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  if (!open) return <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>{t('Wrong department?')}</button>
  const send = async () => {
    setErr(null)
    try { await api.post(`/api/requests/${r.id}/reassign-department`, { new_department: dept, note }); onDone?.() } catch (e) { setErr(e) }
  }
  return (
    <div className="stack" style={{ width: '100%' }}>
      <div className="grid g-2">
        <div className="field"><label htmlFor={`md-${r.id}`}>{t('Move to')}</label>
          <select id={`md-${r.id}`} className="select" style={{ minHeight: 44 }} value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">—</option>{SECTOR_KEYS.filter((s) => s !== r.category).map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}
          </select></div>
        <div className="field"><label htmlFor={`mn-${r.id}`}>{t('Why?')}</label>
          <input id={`mn-${r.id}`} className="input" style={{ minHeight: 44 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('E.g. This is a road problem')} /></div>
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={!dept || note.trim().length < 5} onClick={send}>{t('Move case')}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>{t('Cancel')}</button>
      </div>
      <ErrorBox error={err} />
    </div>
  )
}
