import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, MessageCircleQuestion, Phone, Search, Trash2, Users, Building2, User, Check, ShieldCheck } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { tr } from '../../i18n/strings'
import { SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import { TimelineStepper } from '../../components/citizen/TimelineStepper'
import { ProofViewer } from '../../components/citizen/ProofViewer'
import { Badge, Card, ErrorBox, Loading, SectorTag, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, date, money } from '../../lib/format'

export default function Track() {
  const { tid } = useParams()
  const nav = useNavigate()
  const { uiLang, t } = useApp()
  const L = (k) => t(k, tr(uiLang, k))
  const [input, setInput] = useState(tid || (() => { try { return localStorage.getItem('js_last_tid') || '' } catch { return '' } })())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [phone, setPhone] = useState('')
  const [mine, setMine] = useState(null)

  const findByPhone = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      setMine(await api.myRequests(phone))
    } catch (x) {
      setError(x)
    }
  }

  const load = (id) => {
    if (!id) return
    setLoading(true)
    setError(null)
    api.track(id).then(setData).catch(setError).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (tid) load(tid)
  }, [tid])

  const refresh = () => {
    if (data?.request?.tracking_id) {
      api.track(data.request.tracking_id).then(setData).catch(() => {})
    }
  }

  const handleConfirm = async ({ rating, comment }) => {
    try {
      const res = await api.confirmResolution(data.request.tracking_id, { rating, comment })
      setMsg(res.message || 'Thank you! Your grievance is confirmed resolved and closed.')
      load(data.request.tracking_id)
    } catch (err) {
      setError(err)
    }
  }

  const handleDispute = async ({ reason, photo }) => {
    try {
      const res = await api.disputeResolution(data.request.tracking_id, { reason, photo })
      setMsg(res.message || 'Grievance reopened. Supervisor has been notified for re-inspection.')
      load(data.request.tracking_id)
    } catch (err) {
      setError(err)
    }
  }

  const erase = async () => {
    if (!window.confirm('Delete your personal data from this request? Only an anonymous count will remain.')) return
    await api.erase(data.request.tracking_id)
    load(data.request.tracking_id)
  }

  const r = data?.request
  return (
    <div className="stack-md" style={{ maxWidth: 1040 }}>
      <h1>{L('track_title')}</h1>

      {/* Tracking search by ID or Phone */}
      <div className="grid g-2">
        <Card title={t('with_tracking_id', 'With your tracking ID')}>
          <form className="row" onSubmit={(e) => { e.preventDefault(); nav(`/track/${input.trim().toUpperCase()}`) }}>
            <label htmlFor="tid" className="sr-only">{L('enter_id')}</label>
            <input id="tid" className="input mono" style={{ flex: 1, minWidth: 180 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="JS-IN-XXXXXX" />
            <button className="btn btn-primary"><Search size={18} aria-hidden="true" />{L('find')}</button>
          </form>
          <div className="xs muted mt">Try: {['JS-IN-LAKSH1', 'JS-IN-RAMES1'].map((x) => <Link key={x} to={`/track/${x}`} className="mono" style={{ marginRight: 8 }}>{x}</Link>)}</div>
        </Card>
        <Card title={t('lost_id', 'Lost your ID? Use your phone number')}>
          <form className="row" onSubmit={findByPhone}>
            <label htmlFor="ph" className="sr-only">Phone number</label>
            <input id="ph" className="input" inputMode="tel" style={{ flex: 1, minWidth: 180 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 11111" />
            <button className="btn"><Phone size={18} aria-hidden="true" />{t('show_my_requests', 'Show my requests')}</button>
          </form>
          {mine && (mine.length ? (
            <div className="stack mt">{mine.map((m) => (
              <Link key={m.tracking_id} to={`/track/${m.tracking_id}`} className="me-too" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span><SectorTag sector={m.category} short /><span className="xs mono muted" style={{ display: 'block' }}>{m.tracking_id} · {m.area || '—'}</span></span>
                <StatusBadge status={m.status} /></Link>))}</div>
          ) : <p className="small muted mt">{t('no_requests_found', 'No requests found for this number.')}</p>)}
        </Card>
      </div>

      <ErrorBox error={error} />
      {loading && <Loading height={240} />}

      {r && !loading && (
        <>
          {msg && (
            <div className="alert alert-success" role="status">
              <CheckCircle2 size={18} aria-hidden="true" />
              <div>{msg}</div>
            </div>
          )}

          {/* Missing Location / Clarification action prompt */}
          {r.waiting_for && (
            <div className="card action-card">
              <div className="row" style={{ marginBottom: 8 }}>
                <span className="icon-tile tone-amber"><MessageCircleQuestion size={20} aria-hidden="true" /></span>
                <div>
                  <h2 style={{ margin: 0 }}>{r.waiting_for === 'location' ? 'We need one more thing: where is this?' : 'Please tell us a little more'}</h2>
                  <div className="small muted">Answer here. Your request moves forward as soon as you reply.</div>
                </div>
              </div>
              <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
            </div>
          )}

          {/* 5-Stage Step-by-Step Timeline Stepper */}
          <Card title="Grievance Redressal Progress" sub={`Tracking ID: ${r.tracking_id} · Current Status: ${r.status.replace(/_/g, ' ')}`}
            actions={<StatusBadge status={r.status} />}>
            <TimelineStepper status={r.status} history={data.history || []} />
          </Card>

          {/* Statutory Escalation Matrix (V2 Section 2) */}
          <Card title="Administrative Escalation Matrix" sub="SLA-governed jurisdictional hierarchy handling this grievance">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div style={{
                padding: 12,
                borderRadius: 8,
                border: (r.status === 'assigned' || r.status === 'in_progress' || r.status === 'reported') ? '2px solid #2563eb' : '1px solid #e2e8f0',
                background: (r.status === 'assigned' || r.status === 'in_progress' || r.status === 'reported') ? '#eff6ff' : '#f8fafc'
              }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="badge" style={{ background: '#2563eb', color: '#fff', fontSize: '0.7rem' }}>Level 1</span>
                  <span className="xs muted">2-7 Days</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Field Officer</div>
                <div className="xs muted mt-xs">Site visit, physical verification, geotagged resolution proof.</div>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 8,
                border: (r.status === 'resolved_pending_verification' || r.status === 'rework_requested') ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: (r.status === 'resolved_pending_verification' || r.status === 'rework_requested') ? '#f0f9ff' : '#f8fafc'
              }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="badge" style={{ background: '#0284c7', color: '#fff', fontSize: '0.7rem' }}>Level 2</span>
                  <span className="xs muted">Up to 7 Days</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Department Officer</div>
                <div className="xs muted mt-xs">Task assignment, proof review, supervisor rework and disputes.</div>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 8,
                border: r.escalated ? '2px solid #d97706' : '1px solid #e2e8f0',
                background: r.escalated ? '#fffbeb' : '#f8fafc'
              }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="badge" style={{ background: '#d97706', color: '#fff', fontSize: '0.7rem' }}>Level 3</span>
                  <span className="xs muted">7-14 Days</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>District Collector / DM</div>
                <div className="xs muted mt-xs">Jan Sunwai hearing, show-cause notices, cross-department binding directions.</div>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 8,
                border: (r.status === 'reopened' && data.history?.some(h => h.stage_label?.includes('Appeal'))) ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                background: (r.status === 'reopened' && data.history?.some(h => h.stage_label?.includes('Appeal'))) ? '#faf5ff' : '#f8fafc'
              }}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.7rem' }}>Level 4 (Appeals Desk)</span>
                  <span className="xs muted">15-30 Days</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>State Officer</div>
                <div className="xs muted mt-xs">Statutory second-tier appeal against district orders (Uphold/Overturn/Remand).</div>
              </div>
            </div>
          </Card>

          {/* Proof of Resolution & Citizen Verification */}
          {(data.proofs?.length > 0 || r.status === 'resolved_pending_verification' || r.status === 'closed_verified' || r.status === 'closed' || r.closure_note) && (
            <ProofViewer
              proofs={data.proofs || []}
              onConfirm={handleConfirm}
              onDispute={handleDispute}
              isPendingVerification={r.status === 'resolved_pending_verification'}
              closureNote={r.closure_note}
              closureFlag={r.closure_flag}
            />
          )}

          {/* Citizen Appeal to State Desk Action (V2 Section 7) */}
          <div style={{ background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: 8, padding: 16 }}>
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#86198f', fontSize: '0.95rem' }}>Unsatisfied with District Action or Repeated Disputes?</div>
                <p className="small muted" style={{ margin: '4px 0 0' }}>
                  Under the Public Grievance Charter, you can file a formal statutory appeal directly to the <strong>State Grievance Commissioner (Appeals Desk)</strong>.
                </p>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: '#9333ea', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                onClick={() => {
                  const reason = window.prompt('Please enter the grounds for your appeal to the State Officer (minimum 10 characters):')
                  if (reason && reason.trim().length >= 10) {
                    api.citizenAppeal(r.tracking_id, { reason: reason.trim() })
                      .then((res) => {
                        setMsg(res.message || 'Appeal submitted successfully to State Grievance Commissioner.')
                        load(r.tracking_id)
                      })
                      .catch((err) => setError(err))
                  }
                }}
              >
                <ShieldCheck size={16} /> Appeal to State Officer
              </button>
            </div>
          </div>

          {/* Grievance Details & Handling Department */}
          <div className="grid g-2">
            <Card
              title={<span className="mono">{r.tracking_id}</span>}
              sub={`${data.area || 'Location pending'} · ${CHANNEL_LABEL[r.channel] || r.channel} · ${LANG_NAMES[r.language] || r.language}`}
              actions={<StatusBadge status={r.status} />}
            >
              <p className="quote">
                <span className="orig">{r.text}</span>
                {r.translated_text && r.translated_text !== r.text && <span className="en" style={{ display: 'block' }}>{r.translated_text}</span>}
              </p>
              <div className="row mt">
                <SectorTag sector={r.category} />
                <Badge>{r.sdg}</Badge>
                <Badge>severity {r.severity}/5</Badge>
              </div>

              {/* Department & Officer Assigned (Public Officer Profile Card - V2 Section 3.4) */}
              <div className="mt" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div className="row-between">
                  <span className="xs muted uppercase font-semibold">Handling Department</span>
                  <Badge tone="blue">{data.department || r.assigned_department || 'Public Works Department'}</Badge>
                </div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
                  <div className="row-between">
                    <span className="xs muted uppercase font-semibold">Assigned Officer</span>
                    <span className="small font-semibold row" style={{ gap: 4 }}><User size={13} />{data.assigned_officer || 'Field Redressal Officer, Block Utnoor'}</span>
                  </div>
                  <div className="xs muted mt-xs" style={{ lineHeight: 1.5 }}>
                    <strong>Office:</strong> Block Development Office, Civil Lines, Adilabad<br />
                    <strong>Working Hours:</strong> 10:00 AM – 5:00 PM (Mon–Sat)<br />
                    <strong>Official Helpline:</strong> 1800-111-222 · <strong>Email:</strong> grievance.cell@gov.in
                  </div>
                </div>
              </div>

              {data.cluster && (
                <div className="alert alert-info mt">
                  <Users size={18} aria-hidden="true" />
                  <div className="small">
                    <strong>{data.cluster.unique_households} households</strong> share this need ({data.cluster.languages.map((l) => LANG_NAMES[l] || l).join(', ')}).
                    <br /><Link to={`/clusters/${data.cluster.id}`}>{data.cluster.title}</Link>
                  </div>
                </div>
              )}

              {data.project && (
                <div className="card mt" style={{ boxShadow: 'none' }}>
                  <div className="row-between"><strong>{data.project.title}</strong><StatusBadge status={data.project.status} /></div>
                  <div className="small muted">{data.project.scheme} · {money(data.project.cost_local, data.project.country)} · {data.project.beneficiaries.toLocaleString()} beneficiaries</div>
                </div>
              )}
            </Card>

            {/* Inbound / Outbound Citizen Notifications & SMS */}
            <Card title="Notifications & Updates" sub="SMS and messaging notifications sent to your registered phone number.">
              {data.notifications?.length === 0 ? (
                <p className="muted small">No notifications yet.</p>
              ) : (
                <div className="chat">
                  {data.notifications?.map((n, i) => {
                    const mine = n.kind === 'citizen_reply'
                    return (
                      <div key={i} className={`chat-msg ${mine ? 'me' : 'them'}`}>
                        <div>{n.message}</div>
                        <div className="row-between xs muted" style={{ marginTop: 4 }}>
                          <span>{mine ? 'You' : 'JanSetu'} · {date(n.at)}</span>
                          {!mine && <SpeakButton text={n.message} lang={n.language} label={L('listen')} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="divider" />
              <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
            </Card>
          </div>

          <div className="row">
            <button className="btn btn-sm btn-danger" onClick={erase}>
              <Trash2 size={16} aria-hidden="true" />{L('erase')}
            </button>
            <span className="help">Right to erasure (India DPDP Act, Brazil LGPD, South Africa POPIA). Only the anonymous demand count is kept.</span>
          </div>
        </>
      )}
    </div>
  )
}
