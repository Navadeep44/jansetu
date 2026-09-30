// Field officer: "My tasks" — only the cases given to me. Start work, send photo proof, or escalate.
import { useMemo, useState } from 'react'
import { AlertOctagon, Camera, CheckCircle2, ClipboardList, Crosshair, Hammer, Play, Send, Siren, X } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'
import { ErrorBox, Loading, PageHead, Tabs } from '../ui'
import { CaseHead, CountStrip, photoToDataUrl, stage, toDate } from './shared'

function ProofForm({ r, onDone, onCancel }) {
  const t = useT()
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')
  const [gps, setGps] = useState(null)
  const [gpsMsg, setGpsMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const pick = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    try { setPhoto(await photoToDataUrl(f)) } catch (x) { setErr(x) }
  }
  const locate = () => {
    if (!navigator.geolocation) { setGpsMsg(t('This phone cannot share location.')); return }
    setGpsMsg(t('Finding your location…'))
    navigator.geolocation.getCurrentPosition(
      (p) => { setGps({ lat: p.coords.latitude, lng: p.coords.longitude }); setGpsMsg('') },
      () => setGpsMsg(t('Location not shared. You can still send.')),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }
  const send = async () => {
    setBusy(true); setErr(null)
    try {
      await api.post(`/api/requests/${r.id}/proof`, { proof_photo_url: photo, proof_notes: note.trim(), latitude: gps?.lat, longitude: gps?.lng })
      onDone()
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <div className="stack mt" style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', paddingTop: 12 }}>
      <div className="row">
        <label className="btn btn-lg" style={{ cursor: 'pointer' }}>
          <Camera size={18} aria-hidden="true" />{t(photo ? 'Change photo' : 'Take or choose photo')}
          <input type="file" accept="image/*" capture="environment" onChange={pick} className="sr-only" />
        </label>
        {photo && <img src={photo} alt={t('Photo of the finished work')} style={{ height: 88, borderRadius: 8, objectFit: 'cover' }} />}
      </div>
      <div className="field"><label htmlFor={`pn-${r.id}`}>{t('What did you do?')}</label>
        <textarea id={`pn-${r.id}`} className="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('E.g. Pipe joint fixed, clean water from 10 am.')} /></div>
      <div className="row">
        <button type="button" className="btn" onClick={locate}><Crosshair size={16} aria-hidden="true" />{t(gps ? 'Location added' : 'Add my location')}</button>
        {gps && <span className="xs muted mono">{gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>}
        {gpsMsg && <span className="xs muted">{gpsMsg}</span>}
      </div>
      <div className="row">
        <button type="button" className="btn btn-success btn-lg" disabled={!photo || note.trim().length < 5 || busy} onClick={send}><Send size={18} aria-hidden="true" />{t('Send proof')}</button>
        <button type="button" className="btn" onClick={onCancel}><X size={16} aria-hidden="true" />{t('Cancel')}</button>
      </div>
      {!photo && <div className="xs muted">{t('A photo is needed to close a case.')}</div>}
      <ErrorBox error={err} />
    </div>
  )
}

function EscalateForm({ r, onDone, onCancel }) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)
  const send = async () => {
    setErr(null)
    try { await api.post(`/api/requests/${r.id}/escalate`, { reason: reason.trim() }); onDone() } catch (e) { setErr(e) }
  }
  return (
    <div className="stack mt" style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', paddingTop: 12 }}>
      <div className="field"><label htmlFor={`es-${r.id}`}>{t('Why are you stuck?')}</label>
        <textarea id={`es-${r.id}`} className="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('E.g. Need a new motor. Not in my budget.')} /></div>
      <div className="row">
        <button type="button" className="btn btn-danger" disabled={reason.trim().length < 5} onClick={send}><AlertOctagon size={16} aria-hidden="true" />{t('Send to my officer')}</button>
        <button type="button" className="btn" onClick={onCancel}><X size={16} aria-hidden="true" />{t('Cancel')}</button>
      </div>
      <ErrorBox error={err} />
    </div>
  )
}

function TaskCard({ r, onChange }) {
  const t = useT()
  const [mode, setMode] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const s = stage(r)
  const start = async () => {
    setBusy(true); setErr(null)
    try { await api.post(`/api/requests/${r.id}/in-progress`, { note: 'Work started on site.' }); onChange() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const proof = r.proofs?.[r.proofs.length - 1]
  return (
    <article className="card" style={{ boxShadow: 'none', borderColor: r.is_overdue ? 'var(--color-destructive)' : undefined }}>
      <CaseHead r={r} hideOwner />
      {(s === 'proof' || s === 'done') && proof && (
        <div className="row mt small muted">
          {proof.file_url?.startsWith('data:') && <img src={proof.file_url} alt={t('Photo of the finished work')} style={{ height: 56, borderRadius: 6 }} />}
          <span>{t(s === 'done' ? 'Proof accepted. Citizen will confirm.' : 'Proof sent. Waiting for your officer.')}</span>
        </div>
      )}
      {(s === 'start' || s === 'working') && !mode && (
        <div className="row mt">
          {s === 'start' && <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={start}><Play size={18} aria-hidden="true" />{t('Start work')}</button>}
          <button type="button" className={`btn btn-lg ${s === 'working' ? 'btn-success' : ''}`} onClick={() => setMode('proof')}><Camera size={18} aria-hidden="true" />{t('Upload photo proof & close')}</button>
          {!r.escalated && <button type="button" className="btn" onClick={() => setMode('esc')}><AlertOctagon size={16} aria-hidden="true" />{t('Escalate')}</button>}
        </div>
      )}
      {mode === 'proof' && <ProofForm r={r} onDone={() => { setMode(null); onChange() }} onCancel={() => setMode(null)} />}
      {mode === 'esc' && <EscalateForm r={r} onDone={() => { setMode(null); onChange() }} onCancel={() => setMode(null)} />}
      <ErrorBox error={err} />
    </article>
  )
}

const GROUPS = [
  { key: 'start', label: 'To start', icon: ClipboardList, tone: 'amber' },
  { key: 'working', label: 'In progress', icon: Hammer, tone: 'blue' },
  { key: 'proof', label: 'Sent for proof check', icon: Send, tone: 'violet' },
  { key: 'done', label: 'Done', icon: CheckCircle2, tone: 'green' },
]

export default function FieldTasks() {
  const t = useT()
  const { user, roleInfo } = useApp()
  const q = useAsync(() => api.get('/api/officer/dashboard'), [])
  const [tab, setTab] = useState('start')
  const items = q.data?.inbox || []
  const by = useMemo(() => {
    const g = { start: [], working: [], proof: [], done: [] }
    for (const r of items) g[stage(r)].push(r)
    const due = (r) => toDate(r.sla_due_at)?.getTime() ?? Infinity
    g.start.sort((a, b) => due(a) - due(b) || b.severity - a.severity)
    g.working.sort((a, b) => due(a) - due(b) || b.severity - a.severity)
    return g
  }, [items])
  const now = new Date()
  const doneMonth = items.filter((r) => {
    const d = toDate(r.resolved_at)
    return d && ['proof', 'done'].includes(stage(r)) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const overdue = items.filter((r) => r.is_overdue).length
  const list = by[tab] || []
  return (
    <div className="stack-md">
      <PageHead title="My tasks" eyebrow={<>{jurisdictionText(user, t)}</>} steps={['Start work', 'Fix the problem', 'Send a photo to close']}>
        {roleInfo?.job || 'Fix the cases given to you and upload photo proof.'}
      </PageHead>
      <CountStrip items={[
        { icon: ClipboardList, tone: 'blue', label: t('Open cases'), n: q.data ? by.start.length + by.working.length : null },
        { icon: Siren, tone: 'red', label: t('Late'), n: q.data ? overdue : null },
        { icon: CheckCircle2, tone: 'green', label: t('Finished this month'), n: q.data ? doneMonth : null },
      ]} />
      <Tabs value={tab} onChange={setTab} label={t('My tasks')} tabs={GROUPS.map((g) => ({ value: g.key, label: <>{t(g.label)} ({by[g.key].length})</> }))} />
      <ErrorBox error={q.error} />
      {q.loading && !q.data ? <Loading height={260} /> : (
        <div className="stack">
          {list.map((r) => <TaskCard key={r.id} r={r} onChange={q.reload} />)}
          {list.length === 0 && <div className="empty">{t(tab === 'start' ? 'No new tasks. Well done.' : 'Nothing here.')}</div>}
        </div>
      )}
    </div>
  )
}
