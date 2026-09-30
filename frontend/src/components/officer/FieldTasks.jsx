// Field officer: "My tasks" — assigned, inspection due, awaiting budget, allocated, work done.
// Features: Site inspection with line-item budget builder, case wallet & expense logger (spend <= allocation), completion photos.
import { useEffect, useMemo, useState } from 'react'
import {
  AlertOctagon, AlertTriangle, Camera, CheckCircle2, ChevronDown, ChevronUp, ClipboardList,
  Crosshair, DollarSign, Eye, FileText, Hammer, Image as ImageIcon, MapPin, Play, Plus,
  Receipt, Send, Siren, Trash2, Wallet, X,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, Tabs } from '../ui'
import { CaseHead, CountStrip, toDate } from './shared'

// 1. SITE INSPECTION & BUDGET REQUEST FORM
function InspectionBudgetModal({ r, onDone, onCancel }) {
  const t = useT()
  const [notes, setNotes] = useState('')
  const [gps, setGps] = useState(null)
  const [gpsMsg, setGpsMsg] = useState('')
  const [sitePhotos, setSitePhotos] = useState([])
  const [lineItems, setLineItems] = useState([
    { item: 'Replacement Pipe HDPE 110mm', quantity: 60, unit: 'm', unit_cost: 350, total: 21000 },
    { item: 'Labour & Trench Excavation', quantity: 3, unit: 'days', unit_cost: 1500, total: 4500 },
  ])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const locate = () => {
    if (!navigator.geolocation) {
      setGpsMsg(t('Geolocation not supported'))
      return
    }
    setGpsMsg(t('Detecting GPS…'))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsMsg('')
      },
      () => setGpsMsg(t('Location unavailable. Proceeding with mandal center.')),
      { timeout: 8000 }
    )
  }

  const updateItem = (index, field, value) => {
    setLineItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      const qty = parseFloat(copy[index].quantity) || 0
      const cost = parseFloat(copy[index].unit_cost) || 0
      copy[index].total = Math.round(qty * cost)
      return copy
    })
  }

  const addItem = () => {
    setLineItems((prev) => [...prev, { item: '', quantity: 1, unit: 'units', unit_cost: 0, total: 0 }])
  }

  const removeItem = (index) => {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalAmount = useMemo(() => {
    return lineItems.reduce((acc, it) => acc + (parseFloat(it.total) || 0), 0)
  }, [lineItems])

  const submitInspection = async (e) => {
    e.preventDefault()
    if (!notes.trim()) {
      setErr(new Error(t('Please write inspection notes')))
      return
    }
    if (totalAmount <= 0) {
      setErr(new Error(t('Budget total must be greater than ₹0')))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const f = new FormData()
      f.append('inspection_notes', notes.trim())
      if (gps) {
        f.append('inspection_lat', String(gps.lat))
        f.append('inspection_lng', String(gps.lng))
      }
      f.append('line_items', JSON.stringify(lineItems))
      sitePhotos.forEach((p) => f.append('site_photos', p, p.name))
      await api.inspectAndBudget(r.id, f)
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
        <h3 style={{ margin: 0 }}>{t('Site Inspection & Budget Proposal')}</h3>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={16} /></button>
      </div>

      <form onSubmit={submitInspection} className="stack mt">
        <div className="field">
          <label htmlFor={`ins-note-${r.id}`}>{t('Inspection Notes (Observed Damages & Rectification Plan)')}</label>
          <textarea
            id={`ins-note-${r.id}`}
            className="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('E.g. Inspected 120m damaged line near main temple. Leakage identified; excavation and pipe replacement required.')}
            required
          />
        </div>

        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn" onClick={locate}>
            <Crosshair size={16} />
            {gps ? t('GPS Captured') : t('Capture Site GPS')}
          </button>
          {gps && <span className="xs mono font-semibold">{gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>}
          {gpsMsg && <span className="xs muted">{gpsMsg}</span>}
        </div>

        <div className="field">
          <label className="btn" style={{ width: 'fit-content', cursor: 'pointer' }}>
            <Camera size={16} />
            {sitePhotos.length > 0 ? t('{n} site photos chosen', { n: sitePhotos.length }) : t('Upload Site Inspection Photos')}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => setSitePhotos(Array.from(e.target.files || []))}
            />
          </label>
          {sitePhotos.length > 0 && (
            <div className="row mt" style={{ gap: 6, flexWrap: 'wrap' }}>
              {sitePhotos.map((p, idx) => (
                <span key={idx} className="badge" style={{ background: '#e2e8f0' }}>📷 {p.name}</span>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Line-Item Builder */}
        <div className="card" style={{ background: '#fff', border: '1px solid #cbd5e1' }}>
          <div className="row-between" style={{ marginBottom: 8 }}>
            <h4 style={{ margin: 0 }}>{t('Line Items')} ({t('Costed Budget Proposal')})</h4>
            <span className="mono font-bold" style={{ color: 'var(--color-primary)', fontSize: '1.05rem' }}>
              {t('Total')}: ₹{totalAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>{t('Item Description')}</th>
                  <th style={{ width: '15%' }}>{t('Quantity')}</th>
                  <th style={{ width: '15%' }}>{t('Unit')}</th>
                  <th style={{ width: '15%' }}>{t('Unit Cost (₹)')}</th>
                  <th style={{ width: '15%' }}>{t('Total (₹)')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="input"
                        style={{ height: 34, fontSize: '0.85rem' }}
                        value={item.item}
                        onChange={(e) => updateItem(idx, 'item', e.target.value)}
                        placeholder={t('Item name')}
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        style={{ height: 34, fontSize: '0.85rem' }}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        required
                      />
                    </td>
                    <td>
                      <input
                        className="input"
                        style={{ height: 34, fontSize: '0.85rem' }}
                        value={item.unit}
                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        placeholder="m, pcs, days"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        style={{ height: 34, fontSize: '0.85rem' }}
                        value={item.unit_cost}
                        onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                        required
                      />
                    </td>
                    <td className="mono font-semibold">
                      ₹{(item.total || 0).toLocaleString('en-IN')}
                    </td>
                    <td>
                      {lineItems.length > 1 && (
                        <button type="button" className="btn btn-sm" onClick={() => removeItem(idx)}>
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" className="btn btn-sm mt" onClick={addItem}>
            <Plus size={14} /> {t('Add Line Item')}
          </button>
        </div>

        <ErrorBox error={err} />

        <div className="row" style={{ marginTop: 8 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            <Send size={18} />
            {busy ? t('Submitting…') : t('Submit Budget Proposal')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 2. EXPENSE LOGGING FORM (spend <= allocation strictly enforced)
function LogExpenseModal({ r, onDone, onCancel }) {
  const t = useT()
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [vendor, setVendor] = useState('')
  const [billRef, setBillRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const allocated = parseFloat(r.budget_allocated || 0)
  const spent = parseFloat(r.budget_spent || 0)
  const available = Math.max(0, allocated - spent)

  const submitExpense = async (e) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setErr(new Error(t('Please enter a valid amount')))
      return
    }
    if (spent + amt > allocated) {
      setErr(new Error(t('Expense exceeds remaining allocation (Available: ₹{n})', { n: available.toLocaleString('en-IN') })))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await api.logExpense(r.id, {
        item: item.trim(),
        amount: amt,
        vendor_name: vendor.trim(),
        bill_reference: billRef.trim(),
      })
      onDone()
    } catch (ex) {
      setErr(ex)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card highlight mt" style={{ border: '2px solid #0284c7', background: '#f0f9ff' }}>
      <div className="row-between">
        <h3 style={{ margin: 0 }}>{t('Log Expense')} ({t('Case Wallet')})</h3>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={16} /></button>
      </div>

      <div className="row small mt" style={{ gap: 16 }}>
        <span>{t('Allocated')}: <strong className="mono">₹{allocated.toLocaleString('en-IN')}</strong></span>
        <span>{t('Spent')}: <strong className="mono">₹{spent.toLocaleString('en-IN')}</strong></span>
        <span>{t('Remaining Balance')}: <strong className="mono" style={{ color: '#0369a1' }}>₹{available.toLocaleString('en-IN')}</strong></span>
      </div>

      <form onSubmit={submitExpense} className="stack mt">
        <div className="grid g-2">
          <div className="field">
            <label htmlFor={`exp-item-${r.id}`}>{t('Expense Item')}</label>
            <input
              id={`exp-item-${r.id}`}
              className="input"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder={t('E.g. HDPE Joint Couplers (4 pcs)')}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`exp-amt-${r.id}`}>{t('Amount (₹)')}</label>
            <input
              id={`exp-amt-${r.id}`}
              type="number"
              step="0.01"
              max={available}
              className="input mono font-semibold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="grid g-2">
          <div className="field">
            <label htmlFor={`exp-ven-${r.id}`}>{t('Vendor Name')}</label>
            <input
              id={`exp-ven-${r.id}`}
              className="input"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder={t('E.g. Sri Balaji Hardware')}
              required
            />
          </div>
          <div className="field">
            <label htmlFor={`exp-ref-${r.id}`}>{t('Bill / Voucher No.')}</label>
            <input
              id={`exp-ref-${r.id}`}
              className="input"
              value={billRef}
              onChange={(e) => setBillRef(e.target.value)}
              placeholder="INV-2025-081"
            />
          </div>
        </div>

        <ErrorBox error={err} />

        <div className="row" style={{ marginTop: 6 }}>
          <button type="submit" className="btn btn-primary" disabled={busy || available <= 0}>
            <Receipt size={16} />
            {busy ? t('Logging…') : t('Log Expense')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 3. WORK COMPLETION FORM
function CompleteWorkModal({ r, onDone, onCancel }) {
  const t = useT()
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submitCompletion = async (e) => {
    e.preventDefault()
    if (!notes.trim()) {
      setErr(new Error(t('Please write a completion note')))
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const f = new FormData()
      f.append('completion_note', notes.trim())
      photos.forEach((p) => f.append('completion_photos', p, p.name))
      await api.completeWork(r.id, f)
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
        <h3 style={{ margin: 0 }}>{t('Submit Completion Proof')}</h3>
        <button type="button" className="btn btn-sm" onClick={onCancel}><X size={16} /></button>
      </div>

      <form onSubmit={submitCompletion} className="stack mt">
        <div className="field">
          <label htmlFor={`comp-notes-${r.id}`}>{t('Completion Note')}</label>
          <textarea
            id={`comp-notes-${r.id}`}
            className="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('E.g. Pipeline replacement completed, pressure tested, water flowing smoothly.')}
            required
          />
        </div>

        <div className="field">
          <label className="btn" style={{ width: 'fit-content', cursor: 'pointer' }}>
            <Camera size={16} />
            {photos.length > 0 ? t('{n} completion photos chosen', { n: photos.length }) : t('Upload Completion Photos')}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => setPhotos(Array.from(e.target.files || []))}
            />
          </label>
          {photos.length > 0 && (
            <div className="row mt" style={{ gap: 6, flexWrap: 'wrap' }}>
              {photos.map((p, idx) => (
                <span key={idx} className="badge" style={{ background: '#dcfce7' }}>📷 {p.name}</span>
              ))}
            </div>
          )}
        </div>

        <ErrorBox error={err} />

        <div className="row" style={{ marginTop: 6 }}>
          <button type="submit" className="btn btn-success btn-lg" disabled={busy}>
            <CheckCircle2 size={18} />
            {busy ? t('Submitting…') : t('Mark Work Done')}
          </button>
          <button type="button" className="btn" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </div>
  )
}

// 4. TASK CARD
function TaskCard({ r, onChange }) {
  const t = useT()
  const [modal, setModal] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const isAssigned = ['ASSIGNED', 'in_progress'].includes(r.status)
  const isBudgetPending = ['BUDGET_REQUESTED', 'SENT_TO_COLLECTOR', 'NEGOTIATION'].includes(r.status)
  const isAllocated = r.status === 'ALLOCATED'
  const isWorkDone = r.status === 'WORK_DONE' || r.status === 'resolved_pending_verification'

  const allocated = parseFloat(r.budget_allocated || 0)
  const spent = parseFloat(r.budget_spent || 0)
  const remaining = Math.max(0, allocated - spent)
  const spendPct = allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0

  return (
    <article className="card" style={{ borderColor: r.is_overdue ? 'var(--color-destructive)' : undefined }}>
      <CaseHead r={r} hideOwner />

      {/* Case Wallet Bar for Allocated / Executing cases */}
      {(isAllocated || isWorkDone || allocated > 0) && (
        <div className="card mt" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: 12 }}>
          <div className="row-between small">
            <span className="row" style={{ gap: 6, color: 'var(--color-primary)' }}>
              <Wallet size={16} /> <strong>{t('Case Wallet')}</strong>
            </span>
            <span className="mono">
              {t('Allocated')}: <strong>₹{allocated.toLocaleString('en-IN')}</strong> ·
              {t('Spent')}: <strong>₹{spent.toLocaleString('en-IN')}</strong> ({spendPct}%)
            </span>
          </div>
          <div className="ngi-track mt" style={{ height: 8 }} role="meter" aria-valuenow={spendPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="ngi-fill" style={{ width: `${spendPct}%`, background: spendPct > 90 ? '#eab308' : '#22c55e' }} />
          </div>
          <div className="row-between xs muted mt">
            <span>{t('Remaining')}: <strong className="mono">₹{remaining.toLocaleString('en-IN')}</strong></span>
            {r.expenses && <span>{r.expenses.length} {t('expense(s) logged')}</span>}
          </div>
        </div>
      )}

      {/* Action Buttons depending on cycle status */}
      {!modal && (
        <div className="row mt" style={{ flexWrap: 'wrap', gap: 8 }}>
          {isAssigned && (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => setModal('inspect')}>
              <ClipboardList size={18} />
              {t('Site Inspection & Budget Request')}
            </button>
          )}

          {isAllocated && (
            <>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setModal('expense')}>
                <Receipt size={18} />
                {t('Log Expense')}
              </button>
              <button type="button" className="btn btn-success btn-lg" onClick={() => setModal('complete')}>
                <Camera size={18} />
                {t('Mark Work Done & Upload Proof')}
              </button>
            </>
          )}

          {isBudgetPending && (
            <Badge tone={r.status === 'NEGOTIATION' ? 'violet' : 'amber'}>
              {r.status === 'NEGOTIATION' ? t('Collector Sent Counter-Offer (Awaiting DH)') : t('Awaiting Collector Approval')} (₹{Number(r.budget_requested || 0).toLocaleString('en-IN')})
            </Badge>
          )}

          {isWorkDone && (
            <Badge tone="green">
              <CheckCircle2 size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {t('Proof Uploaded · Awaiting Department Review')}
            </Badge>
          )}

          <button type="button" className="btn btn-sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDetails ? t('Hide Evidence') : t('View Details')}
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'inspect' && <InspectionBudgetModal r={r} onDone={() => { setModal(null); onChange() }} onCancel={() => setModal(null)} />}
      {modal === 'expense' && <LogExpenseModal r={r} onDone={() => { setModal(null); onChange() }} onCancel={() => setModal(null)} />}
      {modal === 'complete' && <CompleteWorkModal r={r} onDone={() => { setModal(null); onChange() }} onCancel={() => setModal(null)} />}

      {/* Expandable Details (Evidence & Line Items) */}
      {showDetails && (
        <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          {r.budget_line_items && r.budget_line_items.length > 0 && (
            <div>
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Costed Budget Line Items')}</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>{t('Item')}</th>
                      <th>{t('Qty')}</th>
                      <th>{t('Unit Cost')}</th>
                      <th>{t('Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.budget_line_items.map((li, i) => (
                      <tr key={i}>
                        <td>{li.item}</td>
                        <td>{li.quantity} {li.unit || ''}</td>
                        <td>₹{Number(li.unit_cost || 0).toLocaleString('en-IN')}</td>
                        <td className="mono font-semibold">₹{Number(li.total || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {r.expenses && r.expenses.length > 0 && (
            <div className="mt">
              <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Expenses Ledger')}</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>{t('Date')}</th>
                      <th>{t('Item')}</th>
                      <th>{t('Vendor')}</th>
                      <th>{t('Bill No.')}</th>
                      <th>{t('Amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.expenses.map((ex, i) => (
                      <tr key={i}>
                        <td>{ex.date}</td>
                        <td>{ex.item}</td>
                        <td>{ex.vendor_name || '—'}</td>
                        <td className="mono">{ex.bill_reference || '—'}</td>
                        <td className="mono font-semibold">₹{Number(ex.amount || 0).toLocaleString('en-IN')}</td>
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

// 5. MAIN FIELD OFFICER SCREEN
const GROUPS = [
  { key: 'assigned', label: 'Assigned / Inspection Due', icon: ClipboardList, tone: 'amber' },
  { key: 'allocated', label: 'Allocated / Ready to Work', icon: Hammer, tone: 'blue' },
  { key: 'budget_pending', label: 'Awaiting Budget Approval', icon: DollarSign, tone: 'violet' },
  { key: 'work_done', label: 'Work Done / Proof Sent', icon: CheckCircle2, tone: 'green' },
  { key: 'closed', label: 'Closed Cases', icon: CheckCircle2, tone: 'green' },
]

export default function FieldTasks() {
  const t = useT()
  const { user, roleInfo } = useApp()
  const [tab, setTab] = useState('assigned')

  const q = useAsync(() => api.get('/api/requests', { limit: 1000 }), [])
  const walletQ = useAsync(() => api.foWallet(), [])

  const items = q.data?.items || []

  const by = useMemo(() => {
    const g = { assigned: [], allocated: [], budget_pending: [], work_done: [], closed: [] }
    for (const r of items) {
      if (['ASSIGNED', 'in_progress'].includes(r.status)) g.assigned.push(r)
      else if (r.status === 'ALLOCATED') g.allocated.push(r)
      else if (['BUDGET_REQUESTED', 'SENT_TO_COLLECTOR', 'NEGOTIATION'].includes(r.status)) g.budget_pending.push(r)
      else if (r.status === 'WORK_DONE' || r.status === 'resolved_pending_verification') g.work_done.push(r)
      else if (r.status === 'CLOSED' || r.status === 'closed_verified') g.closed.push(r)
      else g.assigned.push(r)
    }
    const due = (r) => toDate(r.sla_due_at)?.getTime() ?? Infinity
    g.assigned.sort((a, b) => due(a) - due(b) || b.severity - a.severity)
    g.allocated.sort((a, b) => due(a) - due(b))
    return g
  }, [items])

  const overdue = items.filter((r) => r.is_overdue).length
  const wallet = walletQ.data || { total_allocated: 0, total_spent: 0, balance: 0 }
  const list = by[tab] || []

  return (
    <div className="stack-md">
      <PageHead
        title="My tasks"
        eyebrow={<>{jurisdictionText(user, t)}</>}
        steps={['Inspect & propose budget', 'Execute work within allocation', 'Upload completion photos']}
      >
        {roleInfo?.job || 'Fix the cases given to you and upload photo proof.'}
      </PageHead>

      {/* Field Officer Wallet Header */}
      <CountStrip items={[
        { icon: ClipboardList, tone: 'blue', label: t('Open Cases'), n: by.assigned.length + by.allocated.length },
        { icon: Siren, tone: 'red', label: t('SLA Overdue'), n: overdue },
        { icon: Wallet, tone: 'green', label: t('Allocated'), n: `₹${(wallet.total_allocated || 0).toLocaleString('en-IN')}` },
        { icon: Receipt, tone: 'amber', label: t('Spent'), n: `₹${(wallet.total_spent || 0).toLocaleString('en-IN')}` },
        { icon: DollarSign, tone: 'blue', label: t('Remaining Balance'), n: `₹${(wallet.balance || 0).toLocaleString('en-IN')}` },
      ]} />

      <Tabs
        value={tab}
        onChange={setTab}
        label={t('My tasks')}
        tabs={GROUPS.map((g) => ({
          value: g.key,
          label: <>{t(g.label)} ({by[g.key].length})</>,
        }))}
      />

      <ErrorBox error={q.error} />

      {q.loading && !q.data ? (
        <Loading height={260} />
      ) : (
        <div className="stack">
          {list.map((r) => (
            <TaskCard key={r.id} r={r} onChange={() => { q.reload(); walletQ.reload() }} />
          ))}
          {list.length === 0 && (
            <div className="empty">{t('Nothing here in this queue.')}</div>
          )}
        </div>
      )}
    </div>
  )
}
