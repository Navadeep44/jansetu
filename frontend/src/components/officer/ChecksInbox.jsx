import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, ShieldAlert, Siren, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, SectorTag, StatusBadge, Tabs } from '../../components/ui'
import { jurisdictionText } from '../../lib/roles'
import { MoveDept } from './shared'
import { CHANNEL_LABEL, LANG_NAMES, SECTOR_KEYS, SECTORS, ago, pct } from '../../lib/format'

const FLAG = { needs_location: 'Place missing', low_confidence: 'AI not sure', duplicate: 'Maybe a repeat', coordinated: 'Copy-paste message' }
const isUrgent = (r) => r.flags?.includes('urgent_safety')

function ReviewItem({ r, areas, onDone }) {
  const t = useT()
  const [cat, setCat] = useState(r.category === 'other' ? '' : r.category)
  const [area, setArea] = useState(r.area_id || '')
  const [err, setErr] = useState(null)
  const act = async (action) => {
    try { await api.review(r.id, { action, category: cat || undefined, area_id: area ? Number(area) : undefined }); onDone() } catch (e) { setErr(e) }
  }
  const urgent = isUrgent(r)
  const flags = [...new Set(r.flags || [])].filter((f) => f !== 'urgent_safety')
  return (
    <div className={`card ${urgent ? 'highlight' : ''}`} style={{ boxShadow: 'none', borderColor: urgent ? 'var(--color-destructive)' : undefined }}>
      <div className="row-between">
        <div className="row">
          {urgent && <Badge tone="red"><Siren size={12} aria-hidden="true" />{t('Urgent: danger')}</Badge>}
          {flags.map((f) => <Badge key={f} tone="amber">{t(FLAG[f] || f.replace(/_/g, ' '))}</Badge>)}
        </div>
        <span className="xs muted mono">{r.tracking_id} · {ago(r.created_at, t)}</span>
      </div>
      <p className="quote mt"><span className="orig">{r.text}</span>{r.translated_text && r.translated_text !== r.text && <span className="en" style={{ display: 'block' }}>{r.translated_text}</span>}</p>
      <div className="xs muted">{t(LANG_NAMES[r.language] || r.language)} · {t(CHANNEL_LABEL[r.channel] || r.channel)} · {t('AI sure: {p}', { p: pct(r.confidence) })} · {r.area || t('No place given')}</div>
      <div className="grid g-3 mt" style={{ alignItems: 'end' }}>
        <div className="field"><label htmlFor={`cat-${r.id}`}>{t('Problem type')}</label>
          <select id={`cat-${r.id}`} className="select" style={{ minHeight: 44 }} value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}
          </select></div>
        <div className="field"><label htmlFor={`area-${r.id}`}>{t('Place')}</label>
          <select id={`area-${r.id}`} className="select" style={{ minHeight: 44 }} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({t(a.district)})</option>)}
          </select></div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => act('approve')} disabled={!cat || !area}><CheckCircle2 size={16} aria-hidden="true" />{t('Confirm')}</button>
          <button className="btn btn-danger" onClick={() => act('reject_spam')}>{t('Spam')}</button>
        </div>
      </div>
      {r.category && r.category !== 'other' && <div className="row mt"><MoveDept r={r} onDone={onDone} /></div>}
      <ErrorBox error={err} />
    </div>
  )
}

function CloseBox() {
  const t = useT()
  const [tid, setTid] = useState('')
  const [req, setReq] = useState(null)
  const [note, setNote] = useState('')
  const [audit, setAudit] = useState(null)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    if (!req || note.length < 3) { setAudit(null); return }
    const h = setTimeout(() => api.closeAudit(req.id, note).then(setAudit).catch(() => {}), 400)
    return () => clearTimeout(h)
  }, [note, req])
  const find = async () => { setErr(null); setMsg(null); try { setReq((await api.track(tid.trim().toUpperCase())).request) } catch (e) { setErr(e) } }
  const submit = async (force = false) => {
    setErr(null)
    try {
      const r = await api.close(req.id, note, force)
      setMsg(`${t('Sent. The citizen will be asked in {lang} if it is really fixed.', { lang: t(LANG_NAMES[req.language] || req.language) })}${r.audit?.formulaic ? ' ' + t('Marked as a copy-paste closure.') : ''}`)
    } catch (e) { setErr(e) }
  }
  return (
    <Card title="Close a case with proof" sub="Say what was done. The citizen checks before it is closed.">
      <div className="row">
        <label htmlFor="tid" className="sr-only">{t('Tracking ID')}</label>
        <input id="tid" className="input mono" style={{ maxWidth: 260, minHeight: 44 }} placeholder="JS-IN-XXXXXX" value={tid} onChange={(e) => setTid(e.target.value)} />
        <button className="btn" onClick={find}>{t('Open')}</button><span className="help">{t('Try')} JS-IN-RAMES1</span></div>
      {req && (
        <div className="stack mt">
          <p className="quote"><span className="orig">{req.text}</span><span className="en" style={{ display: 'block' }}>{req.translated_text}</span></p>
          <div className="field"><label htmlFor="atr">{t('What was done?')}</label>
            <textarea id="atr" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('What, where, when. E.g. Drain cleaned and 120 m covered on 12 Sept. Photo added.')} /></div>
          {audit && (
            <div className={`alert ${audit.formulaic ? 'alert-warn' : 'alert-success'}`}>
              {audit.formulaic ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
              <div className="small"><strong>{t(audit.formulaic ? 'Too vague. Say what was really done.' : 'Clear and can be checked.')}</strong>
                {audit.reasons?.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }} lang="en">{audit.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}</div>
            </div>
          )}
          <div className="row"><button className="btn btn-primary" onClick={() => submit(false)} disabled={note.length < 5}><ClipboardCheck size={16} aria-hidden="true" />{t('Send for citizen check')}</button></div>
        </div>
      )}
      {msg && <div className="alert alert-success mt" role="status"><CheckCircle2 size={18} aria-hidden="true" /><div className="small">{msg}</div></div>}
      <ErrorBox error={err} />
    </Card>
  )
}

function CountTile({ icon: Icon, tone, label, n, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`card stat tile-${tone}`}
      style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer', minHeight: 88, boxShadow: 'none', outline: active ? '3px solid var(--color-accent)' : undefined, outlineOffset: 2 }}>
      <div className="stat-label"><Icon size={18} aria-hidden="true" />{label}</div>
      <div className="stat-value" style={{ fontSize: '2.2rem' }}>{n ?? '…'}</div>
    </button>
  )
}

// District Collector / super admin: "Checks" — urgent, unclear reports, fake closures, copy-paste campaigns.
export default function ChecksInbox() {
  const { stateParam, user } = useApp()
  const t = useT()
  const [tab, setTab] = useState('review')
  const q = useAsync(() => api.reviewQueue(), [])
  const areas = useAsync(() => api.areas(stateParam), [stateParam])
  const all = useAsync(() => api.requests({ state: stateParam, limit: 40 }), [stateParam])
  const d = q.data
  const urgent = d?.needs_review?.filter(isUrgent) || []
  const tiles = [
    { v: 'urgent', icon: Siren, tone: 'red', label: t('Urgent'), n: d ? urgent.length : null },
    { v: 'review', icon: ClipboardCheck, tone: 'amber', label: t('To review'), n: d?.needs_review?.length },
    { v: 'closures', icon: ShieldAlert, tone: 'violet', label: t('Fake closures'), n: d?.formulaic_closures?.length },
    { v: 'campaigns', icon: Copy, tone: 'blue', label: t('Copy-paste campaigns'), n: d?.campaigns?.length },
  ]
  const list = tab === 'urgent' ? urgent : d?.needs_review || []
  return (
    <div className="stack-md">
      <PageHead title="Checks" eyebrow={<>{jurisdictionText(user, t)}</>} steps={['Open a report', 'Fix the problem type or place', 'Press Confirm: the citizen is told']}>
        Unclear reports, urgent cases and closures to check.
      </PageHead>
      <section className="card" aria-labelledby="today-h">
        <h2 id="today-h" style={{ margin: '0 0 12px', fontSize: '1.15rem' }}>{t('Today')}</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {tiles.map((x) => <CountTile key={x.v} icon={x.icon} tone={x.tone} label={x.label} n={x.n} active={tab === x.v} onClick={() => setTab(x.v)} />)}
        </div>
      </section>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'urgent', label: <>{t('Urgent ({n})', { n: d ? urgent.length : '…' })}</> },
        { value: 'review', label: <>{t('To review ({n})', { n: d?.needs_review?.length ?? '…' })}</> },
        { value: 'closures', label: <>{t('Fake closures ({n})', { n: d?.formulaic_closures?.length ?? '…' })}</> },
        { value: 'close', label: 'Close a case' },
        { value: 'campaigns', label: <>{t('Copy-paste campaigns ({n})', { n: d?.campaigns?.length ?? '…' })}</> },
        { value: 'all', label: 'All reports' },
      ]} />
      <ErrorBox error={q.error} />
      {q.loading && <Loading height={300} />}
      {d && (tab === 'review' || tab === 'urgent') && (
        <div className="stack">
          <div className="alert alert-info"><ShieldAlert size={18} aria-hidden="true" /><div className="small">{t('The AI never rejects a citizen. Unclear reports wait here for you.')}</div></div>
          {list.map((r) => <ReviewItem key={r.id} r={r} areas={areas.data || []} onDone={q.reload} />)}
          {list.length === 0 && <div className="empty">{t('All done. Nothing waiting.')}</div>}
        </div>
      )}
      {d && tab === 'closures' && (
        <Card title="Closed on paper, not fixed" sub="Like “Your grievance has been disposed”. The citizen is asked. If they say no, it reopens.">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>{t('ID')}</th><th>{t('Place')}</th><th>{t('Need')}</th><th>{t('What the office wrote')}</th><th>{t('Status')}</th></tr></thead>
            <tbody>{d.formulaic_closures.map((r) => (
              <tr key={r.id}><td className="mono"><Link to={`/track/${r.tracking_id}`}>{r.tracking_id}</Link></td><td>{r.area}</td><td><SectorTag sector={r.category} short /></td>
                <td className="small">{r.closure_note}</td><td><StatusBadge status={r.status} /></td></tr>))}</tbody>
          </table></div>
        </Card>
      )}
      {tab === 'close' && <CloseBox />}
      {d && tab === 'campaigns' && (
        <Card title="Copy-paste campaigns" sub="Same message from many homes in a few hours. They count less. Check on the ground.">
          {d.campaigns.map((c, i) => (
            <div key={i} className="alert alert-warn" style={{ marginBottom: 8 }}><Users size={18} aria-hidden="true" />
              <div className="small"><strong>{t('{n} same messages', { n: c.count })}</strong> · {c.area} · <SectorTag sector={c.category} short /> · {t('first seen')} {ago(c.first, t)}<div className="quote mt">{c.text}</div></div></div>
          ))}
          {d.campaigns.length === 0 && <div className="empty">{t('No copy-paste campaigns found.')}</div>}
        </Card>
      )}
      {tab === 'all' && (
        <Card title="Latest reports" sub={<>{t('{n} in total', { n: all.data?.total?.toLocaleString('en-IN') ?? '…' })}</>}>
          {all.loading ? <Loading /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('ID')}</th><th>{t('When')}</th><th>{t('How')}</th><th>{t('Language')}</th><th>{t('Place')}</th><th>{t('Need')}</th><th>{t('Message (names removed)')}</th><th>{t('Status')}</th></tr></thead>
              <tbody>{all.data?.items.map((r) => (
                <tr key={r.id}><td className="mono xs"><Link to={`/track/${r.tracking_id}`}>{r.tracking_id}</Link></td><td className="xs">{ago(r.created_at, t)}</td>
                  <td className="xs">{t(CHANNEL_LABEL[r.channel] || r.channel)}</td><td className="xs">{t(LANG_NAMES[r.language] || r.language)}</td><td className="small">{r.area}</td>
                  <td><SectorTag sector={r.category} short /></td><td className="small" style={{ maxWidth: 380 }}>{r.text}</td><td><StatusBadge status={r.status} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
    </div>
  )
}
