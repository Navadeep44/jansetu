import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2, MessageCircleQuestion, Phone, Search, Trash2, Users,
  Building2, User, Check, ShieldCheck, Lock, Clock, Copy, Inbox,
  MapPin, ArrowRight, Filter, AlertCircle
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { tr } from '../../i18n/strings'
import { SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import { TimelineStepper } from '../../components/citizen/TimelineStepper'
import { ProofViewer } from '../../components/citizen/ProofViewer'
import { Badge, Card, ErrorBox, Loading, SectorTag, StatusBadge, Tabs } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, date, money } from '../../lib/format'

export default function Track() {
  const { tid } = useParams()
  const nav = useNavigate()
  const { uiLang, t, user, isLoggedIn, isCitizen } = useApp()
  const L = (k) => t(k, tr(uiLang, k))
  const [activeTab, setActiveTab] = useState(tid ? 'single' : (isLoggedIn && isCitizen ? 'inbox' : 'single'))
  const [inboxFilter, setInboxFilter] = useState('all')
  const [copiedTid, setCopiedTid] = useState(null)
  const [input, setInput] = useState(tid || (() => { try { return localStorage.getItem('js_last_tid') || '' } catch { return '' } })())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [phone, setPhone] = useState(() => user?.phone || (() => { try { return localStorage.getItem('js_citizen_phone') || '' } catch { return '' } })())
  const [mine, setMine] = useState(null)
  const [phoneLast4, setPhoneLast4] = useState(() => {
    try { return sessionStorage.getItem(`js_last4_${tid}`) || '' } catch { return '' }
  })

  const findByPhone = async (phoneToSearch) => {
    const ph = typeof phoneToSearch === 'string' ? phoneToSearch : phone
    if (!ph || ph.trim().length < 6) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.myRequests(ph.trim())
      setMine(Array.isArray(res) ? res : [])
      try { localStorage.setItem('js_citizen_phone', ph.trim()) } catch {}
    } catch (x) {
      setError(x)
      setMine([])
    } finally {
      setLoading(false)
    }
  }

  const load = (id, l4) => {
    if (!id) return
    setLoading(true)
    setError(null)
    const effectiveL4 = l4 !== undefined ? l4 : (phoneLast4 || sessionStorage.getItem(`js_last4_${id}`) || '')
    api.track(id, effectiveL4).then((res) => {
      setData(res)
      if (res.verified_access && effectiveL4) {
        try { sessionStorage.setItem(`js_last4_${id}`, effectiveL4) } catch {}
      }
    }).catch(setError).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone)
      if (activeTab === 'inbox' && mine === null) {
        findByPhone(user.phone)
      }
    } else {
      const savedPhone = localStorage.getItem('js_citizen_phone')
      if (savedPhone && !phone) {
        setPhone(savedPhone)
      }
    }
  }, [user, activeTab])

  useEffect(() => {
    if (tid) {
      setActiveTab('single')
      setInput(tid)
      const savedL4 = (() => { try { return sessionStorage.getItem(`js_last4_${tid}`) || '' } catch { return '' } })()
      setPhoneLast4(savedL4)
      load(tid, savedL4)
    }
  }, [tid])

  const filteredMine = useMemo(() => {
    if (!mine) return []
    if (inboxFilter === 'active') {
      return mine.filter((m) => !['closed', 'closed_verified'].includes(m.status))
    }
    if (inboxFilter === 'resolved') {
      return mine.filter((m) => ['closed', 'closed_verified'].includes(m.status))
    }
    return mine
  }, [mine, inboxFilter])

  const refresh = () => {
    if (data?.request?.tracking_id) {
      load(data.request.tracking_id, phoneLast4)
    }
  }

  const handleVerifyPhone = (e) => {
    e.preventDefault()
    if (!phoneLast4.trim() || phoneLast4.trim().length !== 4) return
    load(data?.request?.tracking_id || tid, phoneLast4.trim())
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
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>{L('track_title')}</h1>
          <p className="muted">Track individual grievances, view verified redressal proofs, or view all complaints filed from your phone.</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v)
          setError(null)
          if (v === 'inbox' && !mine && phone) {
            findByPhone(phone)
          }
        }}
        tabs={[
          { value: 'single', label: '🔍 Single Tracking ID Lookup' },
          { value: 'inbox', label: `📥 My Requests Inbox${mine ? ` (${mine.length})` : ''}` },
        ]}
      />

      {error?.status === 429 && (
        <div className="alert alert-warn" style={{ borderLeft: '4px solid #f59e0b', padding: '12px 16px' }}>
          <Clock size={20} />
          <div>
            <strong>Lookup Rate Limit Active</strong>
            <p className="small" style={{ margin: '4px 0 0' }}>
              For citizen privacy and anti-brute-force security, lookups are limited to 5 attempts per minute. Please wait 60 seconds before looking up another tracking ID, or search by your registered phone number.
            </p>
          </div>
        </div>
      )}

      {error && error.status !== 429 && <ErrorBox error={error} />}

      {/* 1. Combined Citizen Requests Inbox Tab */}
      {activeTab === 'inbox' && (
        <div className="stack-md">
          <Card title="Citizen Grievance Inbox" sub="All requests filed using your phone number across Web, WhatsApp, SMS, or Call Center.">
            <form className="row" onSubmit={(e) => { e.preventDefault(); findByPhone(phone); }} style={{ gap: 10 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <label htmlFor="inbox-phone" className="xs muted" style={{ display: 'block', marginBottom: 4 }}>
                  Registered Phone Number
                </label>
                <input
                  id="inbox-phone"
                  className="input"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 11111"
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
                <Phone size={18} aria-hidden="true" />
                Fetch My Requests
              </button>
            </form>
            {isLoggedIn && isCitizen && (
              <div className="xs muted mt" style={{ color: '#0369a1' }}>
                ✓ Logged in as: <strong>{user?.name || user?.username}</strong>
              </div>
            )}
          </Card>

          {loading && <Loading height={180} />}

          {mine !== null && !loading && (
            mine.length === 0 ? (
              <div className="card text-center" style={{ padding: '36px 20px', textAlign: 'center' }}>
                <Inbox size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3>No Grievances Found for This Phone</h3>
                <p className="small muted" style={{ maxWidth: 440, margin: '0 auto 16px' }}>
                  We couldn't find any complaints linked to <strong>{phone}</strong>. If you submitted anonymously without a phone number, use the Single Tracking ID Lookup tab above.
                </p>
                <Link to="/report" className="btn btn-primary btn-sm">
                  Report a Problem Now
                </Link>
              </div>
            ) : (
              <div className="stack-md">
                {/* Summary Stat Chips & Filter */}
                <div className="row-between">
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${inboxFilter === 'all' ? 'btn-dark' : 'btn-outline'}`}
                      onClick={() => setInboxFilter('all')}
                    >
                      All Requests ({mine.length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${inboxFilter === 'active' ? 'btn-dark' : 'btn-outline'}`}
                      onClick={() => setInboxFilter('active')}
                    >
                      In Progress ({mine.filter((m) => !['closed', 'closed_verified'].includes(m.status)).length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${inboxFilter === 'resolved' ? 'btn-dark' : 'btn-outline'}`}
                      onClick={() => setInboxFilter('resolved')}
                    >
                      Resolved ({mine.filter((m) => ['closed', 'closed_verified'].includes(m.status)).length})
                    </button>
                  </div>
                  <span className="xs muted">
                    Showing {filteredMine.length} of {mine.length} requests
                  </span>
                </div>

                {/* Grievance list cards */}
                <div className="stack" style={{ gap: 12 }}>
                  {filteredMine.map((m) => (
                    <article key={m.tracking_id} className="card" style={{ transition: 'box-shadow 0.2s', padding: '16px 20px' }}>
                      <div className="row-between" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
                        <div className="row" style={{ gap: 10 }}>
                          <SectorTag sector={m.category} />
                          <span className="mono" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                            {m.tracking_id}
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            style={{ padding: '2px 6px' }}
                            onClick={() => {
                              navigator.clipboard.writeText(m.tracking_id)
                              setCopiedTid(m.tracking_id)
                              setTimeout(() => setCopiedTid(null), 2500)
                            }}
                            title="Copy tracking ID"
                          >
                            <Copy size={13} />
                            {copiedTid === m.tracking_id ? 'Copied' : ''}
                          </button>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>

                      <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.4 }}>
                        {m.title || m.translated_text || m.text}
                      </p>

                      <div className="row-between" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10, marginTop: 4 }}>
                        <div className="row" style={{ gap: 14, fontSize: '0.82rem', color: '#64748b' }}>
                          <span className="row" style={{ gap: 4 }}>
                            <MapPin size={14} />
                            {m.area || m.location_text || 'Location recorded'}
                          </span>
                          <span className="row" style={{ gap: 4 }}>
                            <Clock size={14} />
                            Filed {date(m.created_at)}
                          </span>
                          <span className="badge" style={{ background: '#f1f5f9' }}>
                            {CHANNEL_LABEL[m.channel] || m.channel}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setActiveTab('single')
                            setInput(m.tracking_id)
                            nav(`/track/${m.tracking_id}`)
                            const last4 = phone.replace(/\D/g, '').slice(-4)
                            load(m.tracking_id, last4)
                          }}
                        >
                          View Redressal Details & Timeline →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 2. Single Tracking ID Lookup Tab */}
      {activeTab === 'single' && (
        <div className="stack-md">
          <Card title={t('with_tracking_id', 'With your tracking ID')}>
            <form className="row" onSubmit={(e) => { e.preventDefault(); nav(`/track/${input.trim().toUpperCase()}`) }}>
              <label htmlFor="tid" className="sr-only">{L('enter_id')}</label>
              <input id="tid" className="input mono" style={{ flex: 1, minWidth: 180 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. JS-IN-XXXXXXXXXX" />
              <button className="btn btn-primary"><Search size={18} aria-hidden="true" />{L('find')}</button>
            </form>
          </Card>

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

          {/* Phone Last 4 Digits Verification Box */}
          {data?.requires_phone_last4 && !data?.verified_access && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 18 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <span className="icon-tile tone-amber"><Lock size={20} aria-hidden="true" /></span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1rem' }}>Personal Grievance Details &amp; Citizen Actions Protected</h3>
                  <p className="small muted" style={{ margin: '0 0 12px' }}>
                    Status and handling department are publicly visible. To view your full grievance text, photos, notifications, and to confirm or dispute resolution, enter the <strong>last 4 digits</strong> of the phone number used when submitting ({data.masked_phone || '•••• ____'}):
                  </p>
                  <form className="row" onSubmit={handleVerifyPhone} style={{ gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      maxLength={4}
                      inputMode="numeric"
                      className="input mono font-bold"
                      style={{ width: 140, letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.1rem' }}
                      placeholder="••••"
                      value={phoneLast4}
                      onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
                      aria-label="Last 4 digits of registered phone number"
                    />
                    <button type="submit" className="btn btn-primary" disabled={phoneLast4.length !== 4}>
                      <ShieldCheck size={16} /> Unlock Full Details
                    </button>
                  </form>
                  {data.verification_error && (
                    <div className="xs text-danger mt" style={{ color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ {data.verification_error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {data?.verified_access && data?.requires_phone_last4 && (
            <div className="alert alert-success" style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} />
              <span>Verified citizen access (Phone ending in <strong>{data.masked_phone}</strong>) · Full complaint details, photos, and actions unlocked.</span>
            </div>
          )}

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
              {(!data?.requires_phone_last4 || data?.verified_access) ? (
                <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
              ) : (
                <p className="small muted">🔒 Phone verification required to send updates or reply to this grievance.</p>
              )}
            </Card>
          </div>

          {(!data?.requires_phone_last4 || data?.verified_access) && (
            <div className="row">
              <button className="btn btn-sm btn-danger" onClick={erase}>
                <Trash2 size={16} aria-hidden="true" />{L('erase')}
              </button>
              <span className="help">Right to erasure (India DPDP Act, Brazil LGPD, South Africa POPIA). Only the anonymous demand count is kept.</span>
            </div>
          )}
        </>
      )}
        </div>
      )}
    </div>
  )
}
