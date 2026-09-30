import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, MessageCircleQuestion, Phone, Search, Trash2, Users, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { tr } from '../../i18n/strings'
import { SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import { Badge, Card, ErrorBox, Loading, PageHead, SectorTag, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, date, money } from '../../lib/format'

export default function Track() {
  const { tid } = useParams()
  const nav = useNavigate()
  const { uiLang, isCitizen, user } = useApp()
  const L = (k) => tr(uiLang, k)
  const [input, setInput] = useState(tid || (() => { try { return localStorage.getItem('js_last_tid') || '' } catch { return '' } })())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [phone, setPhone] = useState('')
  const [mine, setMine] = useState(null)
  const [myList, setMyList] = useState(null)
  useEffect(() => { if (isCitizen) api.citizenMe().then(setMyList).catch(() => setMyList([])) }, [isCitizen, tid])
  const findByPhone = async (e) => {
    e.preventDefault(); setError(null)
    try { setMine(await api.myRequests(phone)) } catch (x) { setError(x) }
  }

  const load = (id) => {
    if (!id) return
    setLoading(true); setError(null)
    api.track(id).then(setData).catch(setError).finally(() => setLoading(false))
  }
  useEffect(() => { if (tid) load(tid) }, [tid])
  const refresh = () => api.track(data.request.tracking_id).then(setData).catch(() => {})

  const verify = async (fixed) => {
    const res = await api.verify(data.request.tracking_id, { fixed, rating: fixed ? 5 : 1 })
    setMsg(res.message)
    load(data.request.tracking_id)
  }
  const erase = async () => {
    if (!window.confirm('Delete your personal data from this request? Only an anonymous count will remain.')) return
    await api.erase(data.request.tracking_id)
    load(data.request.tracking_id)
  }

  const r = data?.request
  return (
    <div className="stack-md narrow">
      <PageHead title={L('track_title')} eyebrow="For citizens · no login needed" steps={['Enter your tracking ID or phone', 'See every update', 'Reply or confirm the fix']}>See what happened to your request, answer questions, and say if it was really fixed.</PageHead>
      {isCitizen && myList && (
        <Card title={`My requests (${myList.length})`} sub={`Logged in as ${user.name}`}>
          {myList.length ? (
            <div className="grid g-3">{myList.map((m) => (
              <Link key={m.tracking_id} to={`/track/${m.tracking_id}`} className="me-too" style={{ textDecoration: 'none', color: 'inherit', background: m.tracking_id === tid ? 'var(--color-accent-soft)' : undefined }}>
                <span><SectorTag sector={m.category} short /><span className="xs mono muted" style={{ display: 'block' }}>{m.tracking_id} · {m.area || '—'}</span></span>
                <StatusBadge status={m.status} /></Link>))}</div>
          ) : <p className="small muted">No requests yet. <Link to="/report">Report a problem</Link></p>}
        </Card>
      )}
      <div className="grid g-2">
        <Card title="With your tracking ID">
          <form className="row" onSubmit={(e) => { e.preventDefault(); nav(`/track/${input.trim().toUpperCase()}`) }}>
            <label htmlFor="tid" className="sr-only">{L('enter_id')}</label>
            <input id="tid" className="input mono" style={{ flex: 1, minWidth: 180 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="JS-IN-XXXXXX" />
            <button className="btn btn-primary"><Search size={18} aria-hidden="true" />{L('find')}</button>
          </form>
          <div className="xs muted mt">Try: {['JS-IN-LAKSH1', 'JS-IN-RAMES1', 'JS-BR-MARIA1', 'JS-ZA-THAND1'].map((x) => <Link key={x} to={`/track/${x}`} className="mono" style={{ marginRight: 8 }}>{x}</Link>)}</div>
        </Card>
        <Card title="Lost your ID? Use your phone number">
          <form className="row" onSubmit={findByPhone}>
            <label htmlFor="ph" className="sr-only">Phone number</label>
            <input id="ph" className="input" inputMode="tel" style={{ flex: 1, minWidth: 180 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 11111" />
            <button className="btn"><Phone size={18} aria-hidden="true" />Show my requests</button>
          </form>
          {mine && (mine.length ? (
            <div className="stack mt">{mine.map((m) => (
              <Link key={m.tracking_id} to={`/track/${m.tracking_id}`} className="me-too" style={{ textDecoration: 'none', color: 'inherit' }}>
                <span><SectorTag sector={m.category} short /><span className="xs mono muted" style={{ display: 'block' }}>{m.tracking_id} · {m.area || '—'}</span></span>
                <StatusBadge status={m.status} /></Link>))}</div>
          ) : <p className="small muted mt">No requests found for this number.</p>)}
        </Card>
      </div>
      <ErrorBox error={error} />
      {loading && <Loading height={240} />}
      {r && !loading && (
        <>
          {msg && <div className="alert alert-success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><div>{msg}</div></div>}
          {r.waiting_for && (
            <div className="card action-card">
              <div className="row" style={{ marginBottom: 8 }}><span className="icon-tile tone-amber"><MessageCircleQuestion size={20} aria-hidden="true" /></span>
                <div><h2 style={{ margin: 0 }}>{r.waiting_for === 'location' ? 'We need one more thing: where is this?' : 'Please tell us a little more'}</h2>
                  <div className="small muted">Answer here. Your request moves forward as soon as you reply.</div></div></div>
              <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
            </div>
          )}
          {r.status === 'resolved_pending_verification' && (
            <div className="card highlight">
              <h2>{L('verify_q')}</h2>
              {r.closure_note && <p className="quote small">{r.closure_note}</p>}
              {r.closure_flag === 'formulaic_closure' && (
                <div className="alert alert-warn mt"><AlertTriangle size={18} aria-hidden="true" />
                  <div className="small">JanSetu flagged this closure as <strong>formulaic</strong>: it describes no concrete action. The case stays open until you confirm.</div></div>
              )}
              <div className="row mt">
                <button className="btn btn-success btn-lg" onClick={() => verify(true)}><CheckCircle2 size={18} aria-hidden="true" />{L('yes_fixed')}</button>
                <button className="btn btn-danger btn-lg" onClick={() => verify(false)}><XCircle size={18} aria-hidden="true" />{L('not_fixed')}</button>
              </div>
            </div>
          )}
          <div className="grid g-2">
            <Card title={<span className="mono">{r.tracking_id}</span>} sub={`${data.area || 'Location pending'} · ${CHANNEL_LABEL[r.channel] || r.channel} · ${LANG_NAMES[r.language] || r.language}`}
              actions={<StatusBadge status={r.status} />}>
              <p className="quote"><span className="orig">{r.text}</span>{r.translated_text && r.translated_text !== r.text && <span className="en" style={{ display: 'block' }}>{r.translated_text}</span>}</p>
              <div className="row mt"><SectorTag sector={r.category} /><Badge>{r.sdg}</Badge><Badge>severity {r.severity}/5</Badge></div>
              {data.cluster && (
                <div className="alert alert-info mt"><Users size={18} aria-hidden="true" />
                  <div className="small"><strong>{data.cluster.unique_households} households</strong> share this need ({data.cluster.languages.map((l) => LANG_NAMES[l] || l).join(', ')}).
                    <br /><Link to={`/clusters/${data.cluster.id}`}>{data.cluster.title}</Link></div></div>
              )}
              {data.project && (
                <div className="card mt" style={{ boxShadow: 'none' }}>
                  <div className="row-between"><strong>{data.project.title}</strong><StatusBadge status={data.project.status} /></div>
                  <div className="small muted">{data.project.scheme} · {money(data.project.cost_local, data.project.country)} · {data.project.beneficiaries.toLocaleString()} beneficiaries</div>
                </div>
              )}
            </Card>
            <Card title={L('progress')}>
              <ol className="timeline">
                {data.timeline.map((e, i) => (
                  <li key={i}><strong>{e.event}</strong><div className="small muted">{date(e.at)}</div><div className="small">{e.detail}</div></li>
                ))}
              </ol>
            </Card>
          </div>
          <Card title="Conversation" sub="Messages come in your language. Tap Listen to hear them. You can reply below.">
            {data.notifications.length === 0 ? <p className="muted small">No messages yet.</p> : (
              <div className="chat">
                {data.notifications.map((n, i) => {
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
          <div className="row">
            <button className="btn btn-sm btn-danger" onClick={erase}><Trash2 size={16} aria-hidden="true" />{L('erase')}</button>
            <span className="help">Right to erasure (India DPDP Act, Brazil LGPD, South Africa POPIA). Only the anonymous demand count is kept.</span>
          </div>
        </>
      )}
    </div>
  )
}
