import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ShieldAlert, Siren, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, SectorTag, StatusBadge, Tabs } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTOR_KEYS, SECTORS, ago, pct } from '../../lib/format'

function ReviewItem({ r, areas, onDone }) {
  const [cat, setCat] = useState(r.category === 'other' ? '' : r.category)
  const [area, setArea] = useState(r.area_id || '')
  const [err, setErr] = useState(null)
  const act = async (action) => {
    try { await api.review(r.id, { action, category: cat || undefined, area_id: area ? Number(area) : undefined }); onDone() } catch (e) { setErr(e) }
  }
  const urgent = r.flags?.includes('urgent_safety')
  return (
    <div className={`card ${urgent ? 'highlight' : ''}`} style={{ boxShadow: 'none', borderColor: urgent ? 'var(--color-destructive)' : undefined }}>
      <div className="row-between">
        <div className="row">
          {urgent && <Badge tone="red"><Siren size={12} aria-hidden="true" />urgent safety</Badge>}
          {r.flags?.filter((f) => f !== 'urgent_safety').map((f) => <Badge key={f} tone="amber">{f.replace(/_/g, ' ')}</Badge>)}
        </div>
        <span className="xs muted mono">{r.tracking_id} · {ago(r.created_at)}</span>
      </div>
      <p className="quote mt"><span className="orig">{r.text}</span><span className="en" style={{ display: 'block' }}>{r.translated_text}</span></p>
      <div className="xs muted">{LANG_NAMES[r.language] || r.language} · {CHANNEL_LABEL[r.channel] || r.channel} · AI confidence {pct(r.confidence)} · {r.area || 'no location'}</div>
      <div className="grid g-3 mt" style={{ alignItems: 'end' }}>
        <div className="field"><label>Category</label>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">—</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
          </select></div>
        <div className="field"><label>Area</label>
          <select className="select" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.country})</option>)}
          </select></div>
        <div className="row">
          <button className="btn btn-primary btn-sm" onClick={() => act('approve')} disabled={!cat || !area}><CheckCircle2 size={16} aria-hidden="true" />Confirm</button>
          <button className="btn btn-sm btn-danger" onClick={() => act('reject_spam')}>Spam</button>
        </div>
      </div>
      <ErrorBox error={err} />
    </div>
  )
}

function CloseBox() {
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
    try { const r = await api.close(req.id, note, force); setMsg(`Closed as "awaiting citizen check". ${r.audit.formulaic ? 'Flagged as formulaic.' : ''} The citizen has been asked to verify in ${LANG_NAMES[req.language] || req.language}.`) }
    catch (e) { setErr(e) }
  }
  return (
    <Card title="Close a request with evidence" sub="Closure-quality AI blocks boilerplate Action Taken Reports. The citizen must verify before the case is closed.">
      <div className="row"><input className="input mono" style={{ maxWidth: 260 }} placeholder="JS-IN-XXXXXX" value={tid} onChange={(e) => setTid(e.target.value)} aria-label="Tracking ID" />
        <button className="btn" onClick={find}>Load</button><span className="help">Try JS-IN-RAMES1</span></div>
      {req && (
        <div className="stack mt">
          <p className="quote"><span className="orig">{req.text}</span><span className="en" style={{ display: 'block' }}>{req.translated_text}</span></p>
          <div className="field"><label htmlFor="atr">Action Taken Report</label>
            <textarea id="atr" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, where, when. E.g. 'Drain de-silted and 120 m covered drain constructed on 12 Sept; photo attached.'" /></div>
          {audit && (
            <div className={`alert ${audit.formulaic ? 'alert-warn' : 'alert-success'}`}>
              {audit.formulaic ? <AlertTriangle size={18} aria-hidden="true" /> : <CheckCircle2 size={18} aria-hidden="true" />}
              <div className="small"><strong>{audit.formulaic ? 'Looks formulaic' : 'Specific and verifiable'}</strong>
                {audit.reasons.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{audit.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
                <div>{audit.advice}</div></div>
            </div>
          )}
          <div className="row"><button className="btn btn-primary" onClick={() => submit(false)} disabled={note.length < 5}>Submit closure</button></div>
        </div>
      )}
      {msg && <div className="alert alert-success mt"><CheckCircle2 size={18} aria-hidden="true" /><div className="small">{msg}</div></div>}
      <ErrorBox error={err} />
    </Card>
  )
}

export default function Officer() {
  const { countryParam } = useApp()
  const [tab, setTab] = useState('review')
  const q = useAsync(() => api.reviewQueue(), [])
  const areas = useAsync(() => api.areas(), [])
  const all = useAsync(() => api.requests({ country: countryParam, limit: 40 }), [countryParam])
  const d = q.data
  return (
    <div className="stack-md">
      <PageHead title="Officer inbox">Reports the AI was unsure about, urgent cases, and closures to check.</PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'review', label: `To review (${d?.needs_review?.length ?? '…'})` },
        { value: 'closures', label: `Fake closures (${d?.formulaic_closures?.length ?? '…'})` },
        { value: 'close', label: 'Close a case' },
        { value: 'campaigns', label: `Copy-paste campaigns (${d?.campaigns?.length ?? '…'})` },
        { value: 'all', label: 'All requests' },
      ]} />
      <ErrorBox error={q.error} />
      {q.loading && <Loading height={300} />}
      {d && tab === 'review' && (
        <div className="stack">
          <div className="alert alert-info"><ShieldAlert size={18} aria-hidden="true" /><div className="small">The AI never rejects a citizen. Anything unclear waits here for you.</div></div>
          {d.needs_review.map((r) => <ReviewItem key={r.id} r={r} areas={areas.data || []} onDone={q.reload} />)}
          {d.needs_review.length === 0 && <div className="empty">Queue is clear.</div>}
        </div>
      )}
      {d && tab === 'closures' && (
        <Card title="Closures flagged as formulaic" sub={'"Your grievance has been disposed" without concrete action. Citizens are asked to verify; disputed cases reopen automatically.'}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>ID</th><th>Area</th><th>Need</th><th>Action Taken Report</th><th>Status</th></tr></thead>
            <tbody>{d.formulaic_closures.map((r) => (
              <tr key={r.id}><td className="mono"><Link to={`/track/${r.tracking_id}`}>{r.tracking_id}</Link></td><td>{r.area}</td><td><SectorTag sector={r.category} short /></td>
                <td className="small">{r.closure_note}</td><td><StatusBadge status={r.status} /></td></tr>))}</tbody>
          </table></div>
        </Card>
      )}
      {tab === 'close' && <CloseBox />}
      {d && tab === 'campaigns' && (
        <Card title="Suspected coordinated campaigns" sub="Near-identical messages from many households within hours. Counted at 25% weight in the Need-Gap Index; officer can verify on the ground.">
          {d.campaigns.map((c, i) => (
            <div key={i} className="alert alert-warn" style={{ marginBottom: 8 }}><Users size={18} aria-hidden="true" />
              <div className="small"><strong>{c.count} identical messages</strong> · {c.area} · <SectorTag sector={c.category} short /> · first seen {ago(c.first)}<div className="quote mt">{c.text}</div></div></div>
          ))}
          {d.campaigns.length === 0 && <div className="empty">No campaigns detected.</div>}
        </Card>
      )}
      {tab === 'all' && (
        <Card title="Latest requests" sub={`${all.data?.total?.toLocaleString() ?? '…'} total`}>
          {all.loading ? <Loading /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>ID</th><th>When</th><th>Channel</th><th>Lang</th><th>Area</th><th>Need</th><th>Message (PII-redacted)</th><th>Status</th></tr></thead>
              <tbody>{all.data?.items.map((r) => (
                <tr key={r.id}><td className="mono xs"><Link to={`/track/${r.tracking_id}`}>{r.tracking_id}</Link></td><td className="xs">{ago(r.created_at)}</td>
                  <td className="xs">{CHANNEL_LABEL[r.channel] || r.channel}</td><td className="xs">{r.language}</td><td className="small">{r.area}</td>
                  <td><SectorTag sector={r.category} short /></td><td className="small" style={{ maxWidth: 380 }}>{r.text}</td><td><StatusBadge status={r.status} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
    </div>
  )
}
