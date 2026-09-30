// Department Head: "Department queue"
// Workflows:
// 1. New (SUBMITTED) -> Verify or Reject with reason
// 2. Verified (VERIFIED) -> Assign to field officer for that department & mandal
// 3. Budget Requests (BUDGET_REQUESTED, NEGOTIATION) -> Forward to Collector, or respond to Collector counter-offer (Accept / Reply)
// 4. Proof to check (WORK_DONE) -> Accept proof or send back for rework
// 5. Team performance table: 1 row per field officer (open, overdue, allocated vs spent, avg days to close)
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle, AlertTriangle, ArrowRight, Award, Camera, CheckCircle2, ChevronDown,
  ChevronUp, Clock, DollarSign, FileCheck, FileText, Forward, HelpCircle, Image as ImageIcon,
  MapPin, MessageSquare, RefreshCw, Send, ShieldAlert, Siren, Undo2, UserCheck, UserPlus,
  Users, Wallet, X, XCircle,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, Tabs } from '../ui'
import { CaseHead, CountStrip, toDate } from './shared'

// 1. REJECT MODAL
function RejectModal({ r, onDone, onCancel }) {
  const t = useT()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submitReject = async (e) => {
    e.preventDefault()
    if (!reason.trim()) return
    setBusy(true)
    setErr(null)
    try {
      await api.verifyHead(r.id, { action: 'reject', reason: reason.trim() })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card highlight mt" style={{ border: '2px solid #ef4444', background: '#fef2f2' }}>
      <div className="row-between">
        <h4 style={{ margin: 0, color: '#b91c1c' }}>{t('Reject Proposal')}</h4>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={14} /></button>
      </div>
      <form onSubmit={submitReject} className="stack mt">
        <label htmlFor={`rej-${r.id}`} className="small">{t('Reason for Rejection (Citizen will be notified):')}</label>
        <textarea
          id={`rej-${r.id}`}
          className="textarea"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('E.g. Duplicate grievance already being addressed under Mission Bhagiratha project.')}
          required
        />
        <ErrorBox error={err} />
        <div className="row">
          <button type="submit" className="btn btn-danger" disabled={busy || !reason.trim()}>
            <XCircle size={16} />
            {busy ? t('Rejecting…') : t('Confirm Rejection')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 2. MANDAL-FILTERED ASSIGNMENT BOX
function AssignBox({ r, onDone }) {
  const t = useT()
  const [officers, setOfficers] = useState([])
  const [selectedFo, setSelectedFo] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.assignableOfficers({
      district: r.district,
      department: r.category,
      mandal: r.mandal,
    }).then((res) => {
      const list = res.officers || []
      setOfficers(list)
      if (list.length > 0) setSelectedFo(String(list[0].id))
    }).catch(() => {
      setOfficers([])
    }).finally(() => {
      setLoading(false)
    })
  }, [r.district, r.category, r.mandal])

  const submitAssign = async () => {
    if (!selectedFo) return
    setBusy(true)
    setErr(null)
    try {
      await api.assignCycle(r.id, { field_officer_id: Number(selectedFo) })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mt" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12 }}>
      <h4 style={{ margin: '0 0 6px' }}>{t('Assign Field Officer')} ({r.mandal} {t('mandal')})</h4>
      {loading ? (
        <span className="small muted">{t('Loading matching field officers…')}</span>
      ) : officers.length === 0 ? (
        <div className="alert alert-warn small">{t('No field officer registered for this department in {mandal}.', { mandal: r.mandal })}</div>
      ) : (
        <div className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
          <div className="field" style={{ flex: '1 1 240px' }}>
            <label htmlFor={`fo-sel-${r.id}`} className="sr-only">{t('Field Officer')}</label>
            <select
              id={`fo-sel-${r.id}`}
              className="select"
              value={selectedFo}
              onChange={(e) => setSelectedFo(e.target.value)}
              style={{ minHeight: 42 }}
            >
              {officers.map((fo) => (
                <option key={fo.id} value={fo.id}>
                  {fo.name} ({fo.mandal} {t('mandal')}) · {fo.open_cases} {t('open')}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary" disabled={!selectedFo || busy} onClick={submitAssign}>
            <UserCheck size={16} />
            {busy ? t('Assigning…') : t('Assign')}
          </button>
        </div>
      )}
      <ErrorBox error={err} />
    </div>
  )
}

// 3. FORWARD TO COLLECTOR MODAL
function ForwardModal({ r, onDone, onCancel }) {
  const t = useT()
  const [note, setNote] = useState('Site inspection verified. SSR rates and cost estimate checked. Forwarded for administrative sanction.')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submitForward = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await api.forwardCollector(r.id, { forward_note: note.trim() })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card highlight mt" style={{ border: '2px solid var(--color-primary)', background: '#f8fafc' }}>
      <div className="row-between">
        <h4 style={{ margin: 0 }}>{t('Forward to District Collector')}</h4>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={14} /></button>
      </div>

      <div className="row small mt" style={{ gap: 14 }}>
        <span>{t('Requested Budget')}: <strong className="mono font-bold">₹{Number(r.budget_requested || 0).toLocaleString('en-IN')}</strong></span>
        <span>{t('Line Items')}: <strong>{r.budget_line_items?.length || 0}</strong></span>
        <span>{t('Site Photos')}: <strong>{r.site_photos?.length || 0}</strong></span>
      </div>

      <form onSubmit={submitForward} className="stack mt">
        <label htmlFor={`fwd-note-${r.id}`} className="small">{t('Department Head Forwarding Note:')}</label>
        <textarea
          id={`fwd-note-${r.id}`}
          className="textarea"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <ErrorBox error={err} />
        <div className="row">
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            <Forward size={18} />
            {busy ? t('Forwarding…') : t('Forward with Evidence to Collector')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 4. NEGOTIATION RESPONSE CARD
function NegotiationResponseCard({ r, onDone }) {
  const t = useT()
  const [replyMode, setReplyMode] = useState(false)
  const [revisedAmount, setRevisedAmount] = useState(r.budget_requested || '')
  const [replyNote, setReplyNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const history = r.negotiation_history || []
  const lastRound = history[history.length - 1] || {}

  const handleAccept = async () => {
    setBusy(true)
    setErr(null)
    try {
      await api.respondNegotiation(r.id, {
        action: 'accept',
        reply_note: 'Accepted revised rate ceiling recommended by District Collector.',
      })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await api.respondNegotiation(r.id, {
        action: 'reply',
        revised_amount: parseFloat(revisedAmount),
        reply_note: replyNote.trim(),
      })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card highlight mt" style={{ border: '2px solid #8b5cf6', background: '#faf5ff' }}>
      <div className="row-between">
        <h4 style={{ margin: 0, color: '#7c3aed' }}>
          {t('Collector Counter-Offer (Round {n})', { n: history.length })}
        </h4>
        <Badge tone="violet">{t('Negotiation')}</Badge>
      </div>

      <div className="stack mt">
        <div className="row small" style={{ gap: 16 }}>
          <span>{t('Original Requested')}: <strong className="mono">₹{Number(r.budget_requested || 0).toLocaleString('en-IN')}</strong></span>
          <span>{t('Collector Counter Amount')}: <strong className="mono" style={{ color: '#7c3aed', fontSize: '1.05rem' }}>₹{Number(lastRound.proposed_amount || 0).toLocaleString('en-IN')}</strong></span>
        </div>

        {lastRound.justification && (
          <div className="alert alert-info mt">
            <span className="small"><strong>{t('Collector SSR Justification')}:</strong> {lastRound.justification}</span>
          </div>
        )}

        {!replyMode ? (
          <div className="row mt">
            <button type="button" className="btn btn-success btn-lg" disabled={busy} onClick={handleAccept}>
              <CheckCircle2 size={18} />
              {t('Accept Counter-Offer (₹{n})', { n: Number(lastRound.proposed_amount || 0).toLocaleString('en-IN') })}
            </button>
            <button type="button" className="btn btn-lg" onClick={() => setReplyMode(true)}>
              <MessageSquare size={16} />
              {t('Reply with Revised Proposal')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleReply} className="stack mt">
            <div className="grid g-2">
              <div className="field">
                <label htmlFor={`rev-amt-${r.id}`}>{t('Revised Proposed Amount (₹)')}</label>
                <input
                  id={`rev-amt-${r.id}`}
                  type="number"
                  className="input mono font-semibold"
                  value={revisedAmount}
                  onChange={(e) => setRevisedAmount(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor={`rev-note-${r.id}`}>{t('Reply Justification to Collector')}</label>
                <input
                  id={`rev-note-${r.id}`}
                  className="input"
                  value={replyNote}
                  onChange={(e) => setReplyNote(e.target.value)}
                  placeholder={t('E.g. Cannot reduce below ₹45,000 due to rocky terrain transport surcharge.')}
                  required
                />
              </div>
            </div>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                <Send size={16} />
                {busy ? t('Sending…') : t('Send Reply to Collector')}
              </button>
              <button type="button" className="btn" onClick={() => setReplyMode(false)}>{t('Cancel')}</button>
            </div>
          </form>
        )}
        <ErrorBox error={err} />
      </div>
    </div>
  )
}

// 5. PROOF REVIEW CARD
function ProofReviewCard({ r, onDone }) {
  const t = useT()
  const [reworkOpen, setReworkOpen] = useState(false)
  const [reworkNote, setReworkNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const handleReview = async (action) => {
    if (action === 'rework' && !reworkOpen) {
      setReworkOpen(true)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await api.reviewProofCycle(r.id, {
        action,
        note: action === 'rework' ? reworkNote.trim() : 'Completion proof verified on site.',
      })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card highlight mt" style={{ border: '2px solid #16a34a', background: '#f0fdf4' }}>
      <div className="row-between">
        <h4 style={{ margin: 0, color: '#15803d' }}>{t('Check Work Completion Proof')}</h4>
        <Badge tone="green">{t('Work Done')}</Badge>
      </div>

      <div className="grid g-2 mt">
        <div>
          <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Completion Photos')}</h5>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {(r.completion_photos && r.completion_photos.length > 0 ? r.completion_photos : ['/sample_photos/pipe_fixed.svg']).map((p, i) => (
              <img key={i} src={p} alt={t('Completion Proof')} style={{ width: 140, height: 100, objectFit: 'cover', borderRadius: 8, border: '2px solid #86efac' }} />
            ))}
          </div>
        </div>
        <div>
          <h5 className="small muted" style={{ margin: '0 0 4px' }}>{t('Field Engineer Note')}</h5>
          <p className="small quote" style={{ margin: 0 }}>{r.closure_note || t('Work completed according to approved budget.')}</p>
        </div>
      </div>

      {reworkOpen ? (
        <div className="stack mt">
          <label htmlFor={`rwk-${r.id}`} className="small font-semibold">{t('What needs rework?')}</label>
          <textarea
            id={`rwk-${r.id}`}
            className="textarea"
            rows={2}
            value={reworkNote}
            onChange={(e) => setReworkNote(e.target.value)}
            placeholder={t('E.g. Road surface patch is uneven. Re-roll the bituminous overlay.')}
            required
          />
          <div className="row">
            <button type="button" className="btn btn-danger" disabled={busy || reworkNote.trim().length < 5} onClick={() => handleReview('rework')}>
              <Undo2 size={16} />
              {t('Send Back to Field Officer')}
            </button>
            <button type="button" className="btn" onClick={() => setReworkOpen(false)}>{t('Cancel')}</button>
          </div>
        </div>
      ) : (
        <div className="row mt">
          <button type="button" className="btn btn-success btn-lg" disabled={busy} onClick={() => handleReview('accept')}>
            <CheckCircle2 size={18} />
            {t('Accept Proof (Send for Citizen Confirmation)')}
          </button>
          <button type="button" className="btn btn-lg" onClick={() => setReworkOpen(true)}>
            <Undo2 size={16} />
            {t('Send for Rework')}
          </button>
        </div>
      )}
      <ErrorBox error={err} />
    </div>
  )
}

// 6. DH CASE ITEM CARD
function DeptCaseCard({ r, tab, onChange }) {
  const t = useT()
  const [actionModal, setActionModal] = useState(null)
  const [showEvidence, setShowEvidence] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)

  const handleVerify = async () => {
    setVerifyBusy(true)
    try {
      await api.verifyHead(r.id, { action: 'verify' })
      onChange()
    } catch {
      /* ignore */
    } finally {
      setVerifyBusy(false)
    }
  }

  return (
    <article className="card" style={{ borderColor: r.is_overdue ? 'var(--color-destructive)' : undefined }}>
      <CaseHead r={r} />

      {/* Action Row */}
      {!actionModal && (
        <div className="row mt" style={{ flexWrap: 'wrap', gap: 8 }}>
          {/* New Queue: Verify or Reject */}
          {r.status === 'SUBMITTED' && (
            <>
              <button type="button" className="btn btn-success btn-lg" disabled={verifyBusy} onClick={handleVerify}>
                <CheckCircle2 size={18} />
                {verifyBusy ? t('Verifying…') : t('Verify Grievance')}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setActionModal('reject')}>
                <XCircle size={16} />
                {t('Reject with Reason')}
              </button>
            </>
          )}

          {/* Verified Queue: Assign */}
          {r.status === 'VERIFIED' && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setActionModal('assign')}>
              <UserPlus size={18} />
              {t('Assign to Field Officer')}
            </button>
          )}

          {/* Budget Review: Forward or Negotiate */}
          {r.status === 'BUDGET_REQUESTED' && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setActionModal('forward')}>
              <Forward size={18} />
              {t('Forward to Collector (₹{n})', { n: Number(r.budget_requested || 0).toLocaleString('en-IN') })}
            </button>
          )}

          {r.status === 'NEGOTIATION' && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setActionModal('negotiate')} style={{ background: '#7c3aed' }}>
              <MessageSquare size={18} />
              {t('Respond to Collector Negotiation')}
            </button>
          )}

          {/* Proof Review: Check Proof */}
          {r.status === 'WORK_DONE' && (
            <button type="button" className="btn btn-success btn-lg" onClick={() => setActionModal('proof')}>
              <FileCheck size={18} />
              {t('Review Completion Proof')}
            </button>
          )}

          <button type="button" className="btn btn-sm" onClick={() => setShowEvidence(!showEvidence)}>
            {showEvidence ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showEvidence ? t('Hide Evidence') : t('View Evidence')}
          </button>
        </div>
      )}

      {/* Sub-modals */}
      {actionModal === 'reject' && <RejectModal r={r} onDone={() => { setActionModal(null); onChange() }} onCancel={() => setActionModal(null)} />}
      {actionModal === 'assign' && <AssignBox r={r} onDone={() => { setActionModal(null); onChange() }} />}
      {actionModal === 'forward' && <ForwardModal r={r} onDone={() => { setActionModal(null); onChange() }} onCancel={() => setActionModal(null)} />}
      {actionModal === 'negotiate' && <NegotiationResponseCard r={r} onDone={() => { setActionModal(null); onChange() }} />}
      {actionModal === 'proof' && <ProofReviewCard r={r} onDone={() => { setActionModal(null); onChange() }} />}

      {/* Expandable Evidence View */}
      {showEvidence && (
        <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <div className="grid g-2">
            <div>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Citizen Photos')}</h5>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(r.photos || [r.photo_path || '/sample_photos/pipe_broken.svg']).map((p, i) => (
                  <img key={i} src={p} alt="Citizen" style={{ width: 110, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            </div>
            {r.site_photos && r.site_photos.length > 0 && (
              <div>
                <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Site Inspection Photos')}</h5>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {r.site_photos.map((p, i) => (
                    <img key={i} src={p} alt="Site" style={{ width: 110, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                  ))}
                </div>
                {r.inspection_notes && <p className="xs quote mt">{r.inspection_notes}</p>}
              </div>
            )}
          </div>

          {r.budget_line_items && r.budget_line_items.length > 0 && (
            <div className="mt">
              <h5 className="small muted" style={{ margin: '0 0 4px' }}>{t('Line Items')}</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr><th>{t('Item')}</th><th>{t('Qty')}</th><th>{t('Unit Cost')}</th><th>{t('Total')}</th></tr>
                  </thead>
                  <tbody>
                    {r.budget_line_items.map((it, i) => (
                      <tr key={i}>
                        <td>{it.item}</td>
                        <td>{it.quantity} {it.unit || ''}</td>
                        <td>₹{Number(it.unit_cost || 0).toLocaleString('en-IN')}</td>
                        <td className="mono font-semibold">₹{Number(it.total || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// 7. TEAM PERFORMANCE TABLE COMPONENT
function DhTeamTable({ data }) {
  const t = useT()
  const team = data?.team || []

  return (
    <Card title="Field Officer Performance Ledger" sub="One row per field officer in this district & department">
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>{t('Field Officer')}</th>
              <th>{t('Mandal')}</th>
              <th>{t('Open Cases')}</th>
              <th>{t('Overdue')}</th>
              <th>{t('Allocated')}</th>
              <th>{t('Spent')}</th>
              <th>{t('Average Days to Close')}</th>
            </tr>
          </thead>
          <tbody>
            {team.map((fo, idx) => (
              <tr key={idx}>
                <td><strong>{fo.officer_name}</strong></td>
                <td>{fo.mandal} {t('mandal')}</td>
                <td><Badge tone={fo.open_cases > 5 ? 'amber' : 'blue'}>{fo.open_cases}</Badge></td>
                <td>{fo.overdue_cases > 0 ? <Badge tone="red">{fo.overdue_cases}</Badge> : <Badge tone="green">0</Badge>}</td>
                <td className="mono">₹{Number(fo.allocated_inr || 0).toLocaleString('en-IN')}</td>
                <td className="mono">₹{Number(fo.spent_inr || 0).toLocaleString('en-IN')}</td>
                <td><strong className="mono">{fo.average_days_to_close}</strong> {t('days')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// 8. MAIN DEPARTMENT HEAD SCREEN
const DH_TABS = [
  { key: 'new', label: 'New / Verify', icon: AlertCircle, tone: 'amber' },
  { key: 'verified', label: 'Verified / Assign', icon: UserPlus, tone: 'blue' },
  { key: 'assigned', label: 'Assigned / In Field', icon: Clock, tone: 'blue' },
  { key: 'budget_review', label: 'Budget Requests', icon: DollarSign, tone: 'violet' },
  { key: 'proof_review', label: 'Proof to Check', icon: FileCheck, tone: 'green' },
  { key: 'team', label: 'Field Staff Performance', icon: Users, tone: 'blue' },
]

export default function DeptQueue() {
  const t = useT()
  const { user, roleInfo } = useApp()
  const [tab, setTab] = useState('new')

  const reqs = useAsync(() => api.get('/api/requests', { limit: 1000 }), [])
  const teamQ = useAsync(() => api.dhTeamSummary(), [])

  const reloadAll = () => {
    reqs.reload()
    teamQ.reload()
  }

  const items = reqs.data?.items || []

  const g = useMemo(() => {
    const res = { new: [], verified: [], assigned: [], budget_review: [], proof_review: [], all: items }
    for (const r of items) {
      if (r.status === 'SUBMITTED') res.new.push(r)
      else if (r.status === 'VERIFIED') res.verified.push(r)
      else if (['ASSIGNED', 'in_progress'].includes(r.status)) res.assigned.push(r)
      else if (['BUDGET_REQUESTED', 'SENT_TO_COLLECTOR', 'NEGOTIATION'].includes(r.status)) res.budget_review.push(r)
      else if (r.status === 'WORK_DONE') res.proof_review.push(r)
    }
    return res
  }, [items])

  const overdueCount = items.filter((r) => r.is_overdue).length

  return (
    <div className="stack-md">
      <PageHead
        title="Department queue"
        eyebrow={<>{jurisdictionText(user, t)}</>}
        steps={['Verify & assign to field officer', 'Review budget & forward to Collector', 'Check completion proof']}
      >
        {roleInfo?.job || 'Run your department in your district: give cases to field staff and check their proof.'}
      </PageHead>

      <CountStrip items={[
        { icon: AlertCircle, tone: 'amber', label: t('New to Verify'), n: g.new.length },
        { icon: UserPlus, tone: 'blue', label: t('Pending Assignment'), n: g.verified.length },
        { icon: DollarSign, tone: 'violet', label: t('Budget Requests'), n: g.budget_review.length },
        { icon: FileCheck, tone: 'green', label: t('Proof to Check'), n: g.proof_review.length },
        { icon: Siren, tone: 'red', label: t('SLA Overdue'), n: overdueCount },
      ]} />

      <Tabs
        value={tab}
        onChange={setTab}
        label={t('Department queue')}
        tabs={DH_TABS.map((tabItem) => ({
          value: tabItem.key,
          label: tabItem.key === 'team' ? t(tabItem.label) : <>{t(tabItem.label)} ({g[tabItem.key]?.length || 0})</>,
        }))}
      />

      <ErrorBox error={reqs.error} />

      {tab === 'team' ? (
        <DhTeamTable data={teamQ.data} />
      ) : reqs.loading && !reqs.data ? (
        <Loading height={240} />
      ) : (
        <div className="stack">
          {(g[tab] || []).map((r) => (
            <DeptCaseCard key={r.id} r={r} tab={tab} onChange={reloadAll} />
          ))}
          {(g[tab] || []).length === 0 && (
            <div className="empty">{t('No cases currently waiting in this queue.')}</div>
          )}
        </div>
      )}
    </div>
  )
}
