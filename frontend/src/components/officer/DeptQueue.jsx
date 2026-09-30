// Department officer: "Department queue" — cases of my department in my district.
// New → assign to a field officer · Assigned → watch · Proof to check → accept or send back · Done.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ClipboardList, Hammer, ImageOff, Inbox, Layers, Siren, Undo2, UserPlus, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'
import { ErrorBox, Loading, PageHead, Tabs } from '../ui'
import { date } from '../../lib/format'
import { CaseHead, CountStrip, DONE, proofAccepted, toDate } from './shared'

const OPEN_WORK = ['assigned', 'in_progress', 'reopened', 'escalated']

function AssignBox({ r, team, onDone }) {
  const t = useT()
  const [who, setWho] = useState(team.length === 1 ? String(team[0].id) : '')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true); setErr(null)
    try { await api.post(`/api/requests/${r.id}/assign`, { field_officer_id: Number(who) }); onDone() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  if (!team.length) return <div className="xs muted mt">{t('No field officer in your team yet.')}</div>
  return (
    <div className="row mt" style={{ alignItems: 'end' }}>
      <div className="field" style={{ minWidth: 220, flex: '1 1 220px' }}><label htmlFor={`as-${r.id}`}>{t(r.assigned_field_officer_id ? 'Give to someone else' : 'Give to')}</label>
        <select id={`as-${r.id}`} className="select" style={{ minHeight: 44 }} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">{t('Choose field officer')}</option>
          {team.map((o) => <option key={o.id} value={o.id}>{o.name}{o.block ? ` · ${o.block}` : ''} · {t('{n} open', { n: o.open_workload })}</option>)}
        </select></div>
      <button type="button" className="btn btn-primary btn-lg" disabled={!who || busy || Number(who) === r.assigned_field_officer_id} onClick={send}><UserPlus size={18} aria-hidden="true" />{t('Assign')}</button>
      <ErrorBox error={err} />
    </div>
  )
}

function ProofReview({ item, onDone }) {
  const t = useT()
  const r = item.request
  const [back, setBack] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const decide = async (decision) => {
    setBusy(true); setErr(null)
    try { await api.post(`/api/requests/${r.id}/proof/review`, { decision, note: decision === 'rework' ? note.trim() : undefined }); onDone() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const proofs = item.proofs || []
  const last = proofs[proofs.length - 1]
  const note0 = (r.status_history || []).filter((h) => h.stage_label?.startsWith('Resolved')).slice(-1)[0]?.note?.replace(/^Resolution proof submitted: /, '') || r.closure_note
  return (
    <article className="card" style={{ boxShadow: 'none' }}>
      <CaseHead r={r} />
      <div className="grid g-2 mt" style={{ alignItems: 'start' }}>
        <div>
          {last?.file_url?.startsWith('data:') || last?.file_url?.startsWith('/') ? (
            <img src={last.file_url} alt={t('Photo of the finished work')} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10 }} />
          ) : last ? (
            <a href={last.file_url} target="_blank" rel="noreferrer" className="btn">{t('Open photo')}</a>
          ) : (
            <div className="empty row" style={{ justifyContent: 'center' }}><ImageOff size={18} aria-hidden="true" />{t('No photo was sent')}</div>
          )}
        </div>
        <div className="stack">
          <div className="small"><strong>{t('What was done')}:</strong> {note0 || '—'}</div>
          {last && <div className="xs muted">{last.officer_name} · {date(last.uploaded_at)}{last.lat ? ` · ${last.lat.toFixed(3)}, ${last.lng.toFixed(3)}` : ''}</div>}
          {item.has_suspicious_proof && <div className="alert alert-warn"><Siren size={18} aria-hidden="true" /><div className="small">{t('This proof looks doubtful. Check before accepting.')}</div></div>}
          {!back ? (
            <div className="row">
              <button type="button" className="btn btn-success btn-lg" disabled={busy} onClick={() => decide('accept')}><CheckCircle2 size={18} aria-hidden="true" />{t('Accept')}</button>
              <button type="button" className="btn btn-lg" onClick={() => setBack(true)}><Undo2 size={18} aria-hidden="true" />{t('Send back')}</button>
            </div>
          ) : (
            <div className="stack">
              <div className="field"><label htmlFor={`rb-${r.id}`}>{t('What is still wrong?')}</label>
                <textarea id={`rb-${r.id}`} className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('E.g. Photo does not show the tap. Send a clear photo.')} /></div>
              <div className="row">
                <button type="button" className="btn btn-danger" disabled={busy || note.trim().length < 5} onClick={() => decide('rework')}><Undo2 size={16} aria-hidden="true" />{t('Send back')}</button>
                <button type="button" className="btn" onClick={() => setBack(false)}>{t('Cancel')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ErrorBox error={err} />
    </article>
  )
}

const PAGE = 15

export default function DeptQueue() {
  const t = useT()
  const { user, roleInfo } = useApp()
  const [tab, setTab] = useState('new')
  const [show, setShow] = useState(PAGE)
  const reqs = useAsync(() => api.get('/api/requests', { limit: 1000 }), [])
  const proofQ = useAsync(() => api.get('/api/admin/pending-proof-review'), [])
  const teamQ = useAsync(() => api.get('/api/officer/team'), [])
  const reload = () => { reqs.reload(); proofQ.reload(); teamQ.reload() }
  const team = (teamQ.data?.team || []).filter((o) => o.role === 'field_officer')

  const g = useMemo(() => {
    const all = reqs.data?.items || []
    const pend = proofQ.data?.items || []
    const sev = (a, b) => b.severity - a.severity || (toDate(b.created_at) - toDate(a.created_at))
    return {
      new: all.filter((r) => !r.assigned_field_officer_id && !DONE.includes(r.status) && r.status !== 'resolved_pending_verification').sort(sev),
      assigned: all.filter((r) => r.assigned_field_officer_id && OPEN_WORK.includes(r.status))
        .sort((a, b) => (toDate(a.sla_due_at)?.getTime() ?? Infinity) - (toDate(b.sla_due_at)?.getTime() ?? Infinity)),
      proof: pend.filter((i) => !proofAccepted(i.request)),
      done: [...pend.filter((i) => proofAccepted(i.request)).map((i) => i.request), ...all.filter((r) => DONE.includes(r.status))],
      late: all.filter((r) => r.is_overdue).length,
    }
  }, [reqs.data, proofQ.data])
  const ready = reqs.data && proofQ.data
  const pick = (k) => { setTab(k); setShow(PAGE) }
  const list = tab === 'new' ? g.new : tab === 'assigned' ? g.assigned : tab === 'done' ? g.done : []

  return (
    <div className="stack-md">
      <PageHead title="Department queue" eyebrow={<>{jurisdictionText(user, t)}</>} steps={['Give new cases to your field officers', 'Check their photo proof', 'Accept or send back']}>
        {roleInfo?.job || 'Run your department in your district: give cases to field staff and check their proof.'}
      </PageHead>
      <CountStrip value={tab} onPick={pick} items={[
        { key: 'new', icon: Inbox, tone: 'amber', label: t('New'), n: ready ? g.new.length : null },
        { key: 'assigned', icon: Hammer, tone: 'blue', label: t('With field officers'), n: ready ? g.assigned.length : null },
        { key: 'proof', icon: ClipboardList, tone: 'violet', label: t('Proof to check'), n: ready ? g.proof.length : null },
        { key: 'late', icon: Siren, tone: 'red', label: t('Late'), n: ready ? g.late : null },
        { key: 'done', icon: CheckCircle2, tone: 'green', label: t('Done'), n: ready ? g.done.length : null },
      ].map((x) => (x.key === 'late' ? { ...x, key: undefined } : x))} />
      <Tabs value={tab} onChange={pick} label={t('Department queue')} tabs={[
        { value: 'new', label: <>{t('New')} ({ready ? g.new.length : '…'})</> },
        { value: 'assigned', label: <>{t('Assigned')} ({ready ? g.assigned.length : '…'})</> },
        { value: 'proof', label: <>{t('Proof to check')} ({ready ? g.proof.length : '…'})</> },
        { value: 'done', label: <>{t('Done')} ({ready ? g.done.length : '…'})</> },
      ]} />
      {team.length > 0 && (tab === 'new' || tab === 'assigned') && (
        <div className="card row small" style={{ boxShadow: 'none' }}>
          <Users size={18} aria-hidden="true" /><strong>{t('My team')}:</strong>
          {team.map((o) => <span key={o.id}>{o.name}{o.block ? ` (${o.block})` : ''} · {t('{n} open', { n: o.open_workload })}{o.overdue_count ? <> · <span style={{ color: 'var(--color-destructive)' }}>{t('{n} late', { n: o.overdue_count })}</span></> : null}</span>)}
          <Link to="/clusters" className="btn btn-sm" style={{ marginLeft: 'auto' }}><Layers size={14} aria-hidden="true" />{t('Grouped needs')}</Link>
        </div>
      )}
      <ErrorBox error={reqs.error || proofQ.error} />
      {!ready ? <Loading height={260} /> : tab === 'proof' ? (
        <div className="stack">
          {g.proof.map((i) => <ProofReview key={i.request.id} item={i} onDone={reload} />)}
          {g.proof.length === 0 && <div className="empty">{t('No proof waiting. All checked.')}</div>}
        </div>
      ) : (
        <div className="stack">
          {list.slice(0, show).map((r) => (
            <article key={r.id} className="card" style={{ boxShadow: 'none', borderColor: r.is_overdue ? 'var(--color-destructive)' : undefined }}>
              <CaseHead r={r} />
              {tab !== 'done' && <AssignBox r={r} team={team} onDone={reload} />}
            </article>
          ))}
          {list.length === 0 && <div className="empty">{t('Nothing here.')}</div>}
          {list.length > show && <button type="button" className="btn btn-lg" onClick={() => setShow(show + PAGE)}>{t('Show more ({n} left)', { n: list.length - show })}</button>}
        </div>
      )}
    </div>
  )
}
