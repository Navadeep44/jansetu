// District Collector: Budget Approval Inbox & Department Oversight
// Features:
// 1. Budget Approval Inbox with full evidence (citizen photos, site photos, GPS, line items, DH forward note, negotiation history)
// 2. District SSR Benchmark comparison
// 3. Actions: APPROVE (allocates budget), REJECT (with reason), NEGOTIATE (counter-amount + written justification)
// 4. One row per Department Head showing requests, approved ₹, rejected ₹, allocated vs spent, pending cases and SLA breaches
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle, AlertTriangle, Building2, Camera, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, DollarSign, Eye, FileText, Forward, Layers, MapPin, MessageSquare,
  Scale, Send, ShieldAlert, Siren, TrendingDown, Users, Wallet, X, XCircle,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, Tabs } from '../ui'
import { CaseHead, CountStrip } from './shared'

// 1. COLLECTOR DECISION MODAL (Approve, Reject, or Negotiate)
function CollectorDecisionModal({ r, mode, onDone, onCancel }) {
  const t = useT()
  const [amount, setAmount] = useState(mode === 'negotiate' ? (r.budget_requested ? Math.round(r.budget_requested * 0.85) : '') : '')
  const [note, setNote] = useState(
    mode === 'negotiate'
      ? `Rate benchmarked against ${r.district} SSR average for ${r.category}. Trenching and labour costs reduced by 15%.`
      : mode === 'approve'
      ? 'Administrative and financial sanction accorded based on SSR inspection.'
      : ''
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submitDecision = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (mode === 'approve') {
        await api.collectorDecision(r.id, { decision: 'approve', note: note.trim() })
      } else if (mode === 'reject') {
        if (!note.trim()) {
          setErr(new Error(t('Please provide a rejection reason')))
          setBusy(false)
          return
        }
        await api.collectorDecision(r.id, { decision: 'reject', justification: note.trim() })
      } else if (mode === 'negotiate') {
        const counter = parseFloat(amount)
        if (!counter || counter <= 0) {
          setErr(new Error(t('Please enter a valid counter-offer amount')))
          setBusy(false)
          return
        }
        await api.collectorDecision(r.id, {
          decision: 'negotiate',
          counter_amount: counter,
          justification: note.trim(),
        })
      }
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  const border = mode === 'approve' ? '#16a34a' : mode === 'reject' ? '#ef4444' : '#8b5cf6'
  const bg = mode === 'approve' ? '#f0fdf4' : mode === 'reject' ? '#fef2f2' : '#faf5ff'

  return (
    <div className="card highlight mt" style={{ border: `2px solid ${border}`, background: bg }}>
      <div className="row-between">
        <h4 style={{ margin: 0, color: border }}>
          {mode === 'approve' ? t('Approve Budget & Sanction Funds') : mode === 'reject' ? t('Reject Budget Proposal') : t('Negotiate / Counter-Offer')}
        </h4>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={14} /></button>
      </div>

      <form onSubmit={submitDecision} className="stack mt">
        {mode === 'negotiate' && (
          <div className="field">
            <label htmlFor={`neg-amt-${r.id}`}>{t('Counter-Offer Budget (₹)')}</label>
            <input
              id={`neg-amt-${r.id}`}
              type="number"
              className="input mono font-semibold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 42000"
              required
            />
            <span className="help">
              {t('Original Requested')}: ₹{Number(r.budget_requested || 0).toLocaleString('en-IN')}
              {r.district_ssr_benchmark ? ` · ${t('District SSR Benchmark')}: ₹${Number(r.district_ssr_benchmark).toLocaleString('en-IN')}` : ''}
            </span>
          </div>
        )}

        <div className="field">
          <label htmlFor={`dec-note-${r.id}`}>
            {mode === 'negotiate' ? t('Written Justification (SSR Benchmark Comparison):') : t('Decision Note / Order:')}
          </label>
          <textarea
            id={`dec-note-${r.id}`}
            className="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />
        </div>

        <ErrorBox error={err} />

        <div className="row" style={{ marginTop: 6 }}>
          <button
            type="submit"
            className={`btn btn-lg ${mode === 'approve' ? 'btn-success' : mode === 'reject' ? 'btn-danger' : 'btn-primary'}`}
            style={mode === 'negotiate' ? { background: '#7c3aed' } : undefined}
            disabled={busy}
          >
            {mode === 'approve' && <CheckCircle2 size={18} />}
            {mode === 'reject' && <XCircle size={18} />}
            {mode === 'negotiate' && <Scale size={18} />}
            {busy ? t('Submitting…') : mode === 'approve' ? t('Approve & Allocate ₹{n}', { n: Number(r.budget_requested || 0).toLocaleString('en-IN') }) : mode === 'reject' ? t('Confirm Rejection') : t('Send Counter-Offer')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 2. INBOX CASE CARD WITH FULL EVIDENCE
function CollectorInboxCard({ r, onChange }) {
  const t = useT()
  const [modalMode, setModalMode] = useState(null)
  const [showEvidence, setShowEvidence] = useState(true)

  const isNegotiation = r.status === 'NEGOTIATION'
  const history = r.negotiation_history || []
  const benchmark = r.district_ssr_benchmark || 38000.0
  const reqAmt = parseFloat(r.budget_requested || 0)
  const isAboveBenchmark = reqAmt > benchmark

  return (
    <article className="card" style={{ borderColor: isNegotiation ? '#8b5cf6' : r.is_overdue ? 'var(--color-destructive)' : undefined }}>
      <CaseHead r={r} />

      {/* SSR Comparison Benchmark Pill */}
      <div className="card mt" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: 12 }}>
        <div className="row-between">
          <span className="row" style={{ gap: 6 }}>
            <Scale size={18} style={{ color: 'var(--color-primary)' }} />
            <strong>{t('SSR Rate Benchmark Analysis')}</strong>
          </span>
          <span className="mono">
            {t('District Average')}: <strong>₹{benchmark.toLocaleString('en-IN')}</strong>
          </span>
        </div>
        <div className="row small mt" style={{ gap: 14 }}>
          <span>{t('Requested Proposal')}: <strong className="mono font-bold">₹{reqAmt.toLocaleString('en-IN')}</strong></span>
          {isAboveBenchmark ? (
            <Badge tone="amber">
              <TrendingDown size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
              +{Math.round(((reqAmt - benchmark) / benchmark) * 100)}% {t('above district SSR average')}
            </Badge>
          ) : (
            <Badge tone="green">
              {t('Within district benchmark')}
            </Badge>
          )}
        </div>
      </div>

      {/* Decision Buttons */}
      {!modalMode && (
        <div className="row mt" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn btn-success btn-lg" onClick={() => setModalMode('approve')}>
            <CheckCircle2 size={18} />
            {t('Approve ₹{n}', { n: reqAmt.toLocaleString('en-IN') })}
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setModalMode('negotiate')} style={{ background: '#7c3aed' }}>
            <Scale size={18} />
            {t('Negotiate / Counter-Offer')}
          </button>
          <button type="button" className="btn btn-danger btn-lg" onClick={() => setModalMode('reject')}>
            <XCircle size={18} />
            {t('Reject')}
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setShowEvidence(!showEvidence)}>
            {showEvidence ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showEvidence ? t('Hide Evidence') : t('View Full Evidence')}
          </button>
        </div>
      )}

      {/* Active Modal */}
      {modalMode && (
        <CollectorDecisionModal
          r={r}
          mode={modalMode}
          onDone={() => { setModalMode(null); onChange() }}
          onCancel={() => setModalMode(null)}
        />
      )}

      {/* Full Evidence Attachment */}
      {showEvidence && (
        <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          {/* Department Head Forwarding Note */}
          {r.dh_forward_note && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              <span className="small"><strong>{t('Department Head Forwarding Note')}:</strong> {r.dh_forward_note}</span>
            </div>
          )}

          {/* Photos Grid: Citizen Before + Field Officer Site Photos */}
          <div className="grid g-2">
            <div>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Citizen Photos')}</h5>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(r.photos || [r.photo_path || '/sample_photos/pipe_broken.svg']).map((p, i) => (
                  <img key={i} src={p} alt="Citizen" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                ))}
              </div>
            </div>
            <div>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Site Inspection Photos (Field Officer)')}</h5>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(r.site_photos && r.site_photos.length > 0 ? r.site_photos : ['/sample_photos/pipe_broken.svg']).map((p, i) => (
                  <img key={i} src={p} alt="Site" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                ))}
              </div>
              {r.inspection_lat && <div className="xs mono muted mt">GPS: {r.inspection_lat}, {r.inspection_lng}</div>}
              {r.inspection_notes && <p className="small quote mt" style={{ margin: '4px 0 0' }}>{r.inspection_notes}</p>}
            </div>
          </div>

          {/* Line Items Table */}
          {r.budget_line_items && r.budget_line_items.length > 0 && (
            <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Costed Budget Line Items')}</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                  <thead>
                    <tr><th>{t('Item')}</th><th>{t('Qty')}</th><th>{t('Unit Cost')}</th><th>{t('Total (₹)')}</th></tr>
                  </thead>
                  <tbody>
                    {r.budget_line_items.map((it, idx) => (
                      <tr key={idx}>
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

          {/* Negotiation History if any rounds occurred */}
          {history.length > 0 && (
            <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Negotiation Rounds History')}</h5>
              <div className="stack" style={{ gap: 6 }}>
                {history.map((h, i) => (
                  <div key={i} className="small" style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: 6 }}>
                    <strong>{t('Round {n}', { n: h.round })} ({h.actor_role === 'district_officer' ? t('Collector') : t('Department Head')}):</strong> ₹{Number(h.proposed_amount || 0).toLocaleString('en-IN')} — {h.justification}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// 3. DEPARTMENT HEAD SUMMARY TABLE (1 row per department head)
function DeptHeadSummaryTable({ data }) {
  const t = useT()
  const rows = data?.departments || []

  return (
    <Card title="Department Oversight Ledger" sub="One row per department head: proposals, sanctioned budget, expenses, and SLA compliance">
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>{t('Department')}</th>
              <th>{t('Department Head')}</th>
              <th>{t('Requests')}</th>
              <th>{t('Approved ₹')}</th>
              <th>{t('Rejected ₹')}</th>
              <th>{t('Allocated ₹')}</th>
              <th>{t('Spent ₹')}</th>
              <th>{t('Pending Cases')}</th>
              <th>{t('SLA Breaches')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td><strong>{t(row.department_label)}</strong></td>
                <td>{row.head_name}</td>
                <td><Badge tone="blue">{row.requests_count}</Badge></td>
                <td className="mono font-semibold" style={{ color: '#16a34a' }}>₹{Number(row.approved_inr || 0).toLocaleString('en-IN')}</td>
                <td className="mono" style={{ color: '#ef4444' }}>₹{Number(row.rejected_inr || 0).toLocaleString('en-IN')}</td>
                <td className="mono">₹{Number(row.allocated_inr || 0).toLocaleString('en-IN')}</td>
                <td className="mono">₹{Number(row.spent_inr || 0).toLocaleString('en-IN')}</td>
                <td><Badge tone={row.pending_cases > 10 ? 'amber' : 'blue'}>{row.pending_cases}</Badge></td>
                <td>{row.sla_breaches > 0 ? <Badge tone="red">{row.sla_breaches}</Badge> : <Badge tone="green">0</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// 4. MAIN COLLECTOR SCREEN
export default function ChecksInbox() {
  const t = useT()
  const { user, roleInfo } = useApp()
  const [tab, setTab] = useState('inbox')

  const district = user?.district || 'Adilabad'

  const inboxQ = useAsync(() => api.collectorInbox({ district }), [district])
  const summaryQ = useAsync(() => api.collectorSummary({ district }), [district])

  const reloadAll = () => {
    inboxQ.reload()
    summaryQ.reload()
  }

  const items = inboxQ.data?.items || []
  const departments = summaryQ.data?.departments || []

  const totalReqs = departments.reduce((acc, d) => acc + (d.requests_count || 0), 0)
  const totalApproved = departments.reduce((acc, d) => acc + (d.approved_inr || 0), 0)
  const totalAllocated = departments.reduce((acc, d) => acc + (d.allocated_inr || 0), 0)
  const totalSpent = departments.reduce((acc, d) => acc + (d.spent_inr || 0), 0)
  const totalBreaches = departments.reduce((acc, d) => acc + (d.sla_breaches || 0), 0)

  return (
    <div className="stack-md">
      <PageHead
        title="Budget approval inbox"
        eyebrow={<>{jurisdictionText(user, t)}</>}
        steps={['Review line-item proposals', 'Compare with SSR benchmarks', 'Approve, Reject, or Negotiate counter-offer']}
      >
        {roleInfo?.job || 'Decide what your district builds first, and check that work is really done.'}
      </PageHead>

      <CountStrip items={[
        { icon: DollarSign, tone: 'violet', label: t('Budget Inbox Pending'), n: items.length },
        { icon: CheckCircle2, tone: 'green', label: t('Approved Budget'), n: `₹${totalApproved.toLocaleString('en-IN')}` },
        { icon: Wallet, tone: 'blue', label: t('Allocated'), n: `₹${totalAllocated.toLocaleString('en-IN')}` },
        { icon: Users, tone: 'amber', label: t('Spent on Site'), n: `₹${totalSpent.toLocaleString('en-IN')}` },
        { icon: Siren, tone: 'red', label: t('SLA Breaches'), n: totalBreaches },
      ]} />

      <Tabs
        value={tab}
        onChange={setTab}
        label={t('Collector Workspace')}
        tabs={[
          { value: 'inbox', label: <>{t('Budget Approval Inbox')} ({items.length})</> },
          { value: 'departments', label: t('Department Overview') },
        ]}
      />

      <ErrorBox error={inboxQ.error || summaryQ.error} />

      {tab === 'departments' ? (
        <DeptHeadSummaryTable data={summaryQ.data} />
      ) : inboxQ.loading && !inboxQ.data ? (
        <Loading height={240} />
      ) : (
        <div className="stack">
          {items.map((r) => (
            <CollectorInboxCard key={r.id} r={r} onChange={reloadAll} />
          ))}
          {items.length === 0 && (
            <div className="empty">{t('No budget proposals currently awaiting Collector review.')}</div>
          )}
        </div>
      )}
    </div>
  )
}
