import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ClipboardList, Hammer, Inbox, MessageCircleQuestion, Phone, Search, ThumbsUp, Trash2, Users, XCircle,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { CitizenStyles, SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import { Badge, Card, ErrorBox, ListenButton, Loading, PageHead, SectorTag, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, date, fmt, money } from '../../lib/format'

const DEMO_IDS = ['JS-IN-LAKSH1', 'JS-IN-RAMES1', 'JS-IN-SUNIT1', 'JS-IN-PRIYA1']
const STEPS = [
  { label: 'Received', Icon: Inbox, events: ['Request received'] },
  { label: 'Grouped with neighbours', Icon: Users, events: ['Joined a demand cluster'] },
  { label: 'In government plan', Icon: ClipboardList, events: ['Included in a project'] },
  { label: 'Work started', Icon: Hammer, events: ['Department reported action'] },
  { label: 'Fixed? You confirm', Icon: ThumbsUp, events: ['Citizen verification'] },
]
const BASE_STAGE = { received: 0, needs_review: 0, clustered: 1, in_plan: 2, in_progress: 3, resolved_pending_verification: 4, reopened: 4, closed: 5 }

function stageOf(r, project) {
  let s = BASE_STAGE[r.status] ?? 0
  if (project) {
    if (['approved', 'sanctioned', 'planned'].includes(project.status)) s = Math.max(s, 2)
    if (project.status === 'in_progress') s = Math.max(s, 3)
    if (project.status === 'completed') s = Math.max(s, 4)
  }
  return s
}

function Stepper({ data }) {
  const t = useT()
  const r = data.request
  const stage = stageOf(r, data.project)
  const reopened = r.status === 'reopened'
  const when = (st) => {
    const e = data.timeline.filter((x) => st.events.includes(x.event)).pop()
    return e?.at ? date(e.at) : ''
  }
  const nowLabel = stage >= 5 ? t('Fixed. You confirmed it.') : reopened ? t('You said it is not fixed. It is open again.') : t(STEPS[stage].label)
  return (
    <div className="stack">
      <ol className="cz-stepper" aria-label={t('Progress')}>
        {STEPS.map((st, i) => {
          const cls = i < stage ? 'done' : i === stage ? (reopened ? 'now bad' : 'now') : ''
          const Icon = i < stage ? CheckCircle2 : reopened && i === stage ? XCircle : st.Icon
          return (
            <li key={st.label} className={cls} aria-current={i === stage ? 'step' : undefined}>
              <span className="cz-dot"><Icon size={22} aria-hidden="true" /></span>
              <span>{t(st.label)}{i <= stage && when(st) && <span className="cz-when" style={{ display: 'block' }}>{when(st)}</span>}</span>
            </li>
          )
        })}
      </ol>
      <div className={`alert ${stage >= 5 ? 'alert-success' : reopened ? 'alert-danger' : 'alert-info'} mt`} role="status">
        {stage >= 5 ? <CheckCircle2 size={20} aria-hidden="true" /> : reopened ? <AlertTriangle size={20} aria-hidden="true" /> : <Inbox size={20} aria-hidden="true" />}
        <div className="row-between" style={{ flex: 1, gap: 8 }}>
          <strong>{t('Now')}: {nowLabel}</strong>
          <ListenButton text={`${t('Now')}: ${nowLabel}`} />
        </div>
      </div>
    </div>
  )
}

function ReqLink({ m, active }) {
  return (
    <Link to={`/track/${m.tracking_id}`} className="me-too" style={{ textDecoration: 'none', color: 'inherit', minHeight: 56, background: active ? 'var(--color-accent-soft)' : undefined }}>
      <span style={{ minWidth: 0 }}><SectorTag sector={m.category} short /><span className="xs mono muted" style={{ display: 'block' }}>{m.tracking_id} · {m.area || '—'}</span></span>
      <StatusBadge status={m.status} />
    </Link>
  )
}

export default function Track() {
  const { tid } = useParams()
  const nav = useNavigate()
  const { isCitizen, isOfficial, user } = useApp()
  const t = useT()
  const [input, setInput] = useState(tid || (() => { try { return localStorage.getItem('js_last_tid') || '' } catch { return '' } })())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [msg, setMsg] = useState(null)
  const [phone, setPhone] = useState('')
  const [mine, setMine] = useState(null)
  const [myList, setMyList] = useState(null)
  useEffect(() => { if (isCitizen) api.citizenMe().then(setMyList).catch(() => setMyList([])) }, [isCitizen, tid])
  useEffect(() => { if (tid) setInput(tid) }, [tid])
  const findByPhone = async (e) => {
    e.preventDefault(); setError(null)
    try { setMine(await api.myRequests(phone)) } catch (x) { setError(x) }
  }

  const load = (id) => {
    if (!id) return
    setLoading(true); setError(null)
    api.track(id).then(setData).catch((e) => { setData(null); setError(e) }).finally(() => setLoading(false))
  }
  useEffect(() => { setMsg(null); if (tid) load(tid) }, [tid])
  const refresh = () => api.track(data.request.tracking_id).then(setData).catch(() => {})

  const verify = async (fixed) => {
    const res = await api.verify(data.request.tracking_id, { fixed, rating: fixed ? 5 : 1 })
    setMsg(res.message)
    load(data.request.tracking_id)
  }
  const erase = async () => {
    if (!window.confirm(t('Delete your personal data from this request? Only an anonymous count will stay.'))) return
    await api.erase(data.request.tracking_id)
    load(data.request.tracking_id)
  }

  const r = data?.request
  const finder = (
    <div className="grid g-2">
      <Card title="Find with your tracking ID">
        <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav(`/track/${input.trim().toUpperCase()}`) }}>
          <label htmlFor="tid" className="sr-only">{t('Your tracking ID')}</label>
          <input id="tid" className="input mono" style={{ flex: 1, minWidth: 0, fontSize: '1.05rem' }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="JS-IN-XXXXXX" />
          <button className="btn btn-primary"><Search size={18} aria-hidden="true" />{t('Find')}</button>
        </form>
        <div className="xs muted mt">{t('Try')}: {DEMO_IDS.map((x) => <Link key={x} to={`/track/${x}`} className="mono" style={{ marginRight: 10, display: 'inline-block', padding: '4px 0' }}>{x}</Link>)}</div>
      </Card>
      <Card title="Lost your ID? Use your phone number">
        <form className="row" style={{ flexWrap: 'nowrap' }} onSubmit={findByPhone}>
          <label htmlFor="ph" className="sr-only">{t('Phone number')}</label>
          <input id="ph" className="input" inputMode="tel" style={{ flex: 1, minWidth: 0 }} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 11111" />
          <button className="btn"><Phone size={18} aria-hidden="true" />{t('Show')}</button>
        </form>
        {mine && (mine.length ? <div className="stack mt">{mine.map((m) => <ReqLink key={m.tracking_id} m={m} />)}</div>
          : <p className="small muted mt">{t('No requests for this number.')}</p>)}
      </Card>
    </div>
  )

  return (
    <div className="stack-md narrow">
      <CitizenStyles />
      <PageHead title="Track your request" eyebrow="For citizens · no login needed" steps={['Enter your ID or phone', 'See each step', 'Say if it is fixed']}>
        See each step. Reply to us. Tell us if it is really fixed.
      </PageHead>
      {isCitizen && myList && (
        <Card title={t('My requests ({n})', { n: myList.length })} sub={user?.name ? <span>{t('Logged in as {name}', { name: user.name })}</span> : undefined}>
          {myList.length ? <div className="grid g-3">{myList.map((m) => <ReqLink key={m.tracking_id} m={m} active={m.tracking_id === tid} />)}</div>
            : <p className="small muted">{t('No requests yet.')} <Link to="/report">{t('Report a problem')}</Link></p>}
        </Card>
      )}
      {!tid && finder}
      <ErrorBox error={error} />
      {loading && <Loading height={240} />}
      {r && !loading && (
        <>
          {msg && <div className="alert alert-success" role="status"><CheckCircle2 size={18} aria-hidden="true" /><div>{msg}</div></div>}

          <section className="card" aria-labelledby="req-id">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div className="xs muted" style={{ fontWeight: 600 }}>{t('Tracking ID')}</div>
                <h2 id="req-id" className="mono" style={{ margin: 0, fontSize: '1.6rem', letterSpacing: '0.03em', wordBreak: 'break-all' }}>{r.tracking_id}</h2>
                <div className="small muted">{data.area || t('Place not known yet')} · {t(CHANNEL_LABEL[r.channel] || r.channel)} · {t(LANG_NAMES[r.language] || r.language)}</div>
              </div>
              <SectorTag sector={r.category} />
            </div>
            <div className="divider" />
            <Stepper data={data} />
          </section>

          {r.waiting_for && (
            <div className="card action-card">
              <div className="row" style={{ marginBottom: 8, flexWrap: 'nowrap' }}><span className="icon-tile tone-amber"><MessageCircleQuestion size={20} aria-hidden="true" /></span>
                <div><h2 style={{ margin: 0 }}>{r.waiting_for === 'location' ? t('One more thing: where is this?') : t('Please tell us a little more')}</h2>
                  <div className="small muted">{t('Answer here. Your request moves on when you reply.')}</div></div></div>
              <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
            </div>
          )}

          {r.status === 'resolved_pending_verification' && (
            <div className="card highlight">
              <h2>{t('The office says the work is done. Is it really fixed?')}</h2>
              {r.closure_note && <p className="quote small">{r.closure_note}</p>}
              {r.closure_flag === 'formulaic_closure' && (
                <div className="alert alert-warn mt"><AlertTriangle size={18} aria-hidden="true" />
                  <div className="small">{t('Careful: this reply does not say what work was done. It stays open until you say yes.')}</div></div>
              )}
              <div className="cz-fix mt">
                <button className="btn btn-success btn-lg" onClick={() => verify(true)}><CheckCircle2 size={24} aria-hidden="true" />{t('Yes, fixed')}</button>
                <button className="btn btn-danger btn-lg" onClick={() => verify(false)}><XCircle size={24} aria-hidden="true" />{t('No, not fixed')}</button>
              </div>
            </div>
          )}

          <div className="grid g-2">
            <Card title="What you said">
              <p className="quote"><span className="orig">{r.text}</span>{r.translated_text && r.translated_text !== r.text && <span className="en" style={{ display: 'block' }}>{r.translated_text}</span>}</p>
              <div className="row mt"><StatusBadge status={r.status} /><Badge>{t('Urgency {n} of 5', { n: r.severity })}</Badge></div>
              {data.cluster && (
                <div className="alert alert-info mt"><Users size={18} aria-hidden="true" />
                  <div className="small"><strong>{t('{n} families share this need', { n: data.cluster.unique_households })}</strong>
                    {data.cluster.languages?.length > 0 && <> ({data.cluster.languages.map((l) => t(LANG_NAMES[l] || l)).join(', ')})</>}
                    <br />{isOfficial ? <Link to={`/clusters/${data.cluster.id}`}>{data.cluster.title}</Link> : data.cluster.title}</div></div>
              )}
            </Card>
            <Card title="Government work">
              {data.project ? (
                <div className="stack">
                  <div className="row-between" style={{ alignItems: 'flex-start' }}><strong>{data.project.title}</strong><StatusBadge status={data.project.status} /></div>
                  <div className="small muted">{data.project.scheme}</div>
                  <div className="row" style={{ gap: 8 }}>
                    <Badge tone="blue">{money(data.project.cost_local)}</Badge>
                    <Badge>{t('{n} people benefit', { n: fmt(data.project.beneficiaries) })}</Badge>
                  </div>
                </div>
              ) : <p className="small muted">{t('No work planned yet. More voices help.')}</p>}
              <details className="cz-more mt">
                <summary>{t('All updates')}</summary>
                <ol className="timeline mt">
                  {data.timeline.map((e, i) => (
                    <li key={i}><strong>{t(e.event)}</strong><div className="small muted">{date(e.at)}</div><div className="small">{e.detail}</div></li>
                  ))}
                </ol>
              </details>
            </Card>
          </div>

          <Card title="Messages" sub="Tap Listen to hear them. Reply below.">
            {data.notifications.length === 0 ? <p className="muted small">{t('No messages yet.')}</p> : (
              <div className="chat">
                {data.notifications.map((n, i) => {
                  const me = n.kind === 'citizen_reply'
                  return (
                    <div key={i} className={`chat-msg ${me ? 'me' : 'them'}`}>
                      <div>{n.message}</div>
                      <div className="row-between xs muted" style={{ marginTop: 4 }}>
                        <span>{me ? t('You') : 'JanSetu'} · {date(n.at)}</span>
                        {!me && <SpeakButton text={n.message} lang={n.language} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="divider" />
            <ReplyBox tid={r.tracking_id} waitingFor={r.waiting_for} onReplied={refresh} />
          </Card>
          <div className="stack" style={{ gap: 6 }}>
            <button className="btn btn-sm btn-danger" style={{ width: 'fit-content' }} onClick={erase}><Trash2 size={16} aria-hidden="true" />{t('Delete my personal data')}</button>
            <span className="help">{t('Your right under India’s DPDP Act. Only an anonymous count is kept.')}</span>
          </div>
        </>
      )}
      {tid && finder}
    </div>
  )
}
