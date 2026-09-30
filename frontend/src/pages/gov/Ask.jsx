import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Mic, Sparkles } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import DemandMap from '../../components/map/DemandMap'
import { Badge, Card, ErrorBox, PageHead, SectorTag } from '../../components/ui'
import { COUNTRIES } from '../../lib/format'

const EXAMPLES = [
  'Which districts in Odisha have the highest unmet drinking water demand and no works planned?',
  'Show silent zones in India',
  'सबसे ज़्यादा पानी की समस्या कहाँ है?',
  'Onde o gasto está desalinhado no Brazil?',
  'Any sudden spikes or outbreak risks this week?',
  'Where are the road hotspots in Adilabad?',
  'Did the completed projects work?',
]

const cell = (k, v) => {
  if (v === null || v === undefined) return '–'
  if (k === 'sector') return <SectorTag sector={v} short />
  if (k === 'country') return COUNTRIES[v] || v
  if (typeof v === 'number') return <span className="mono">{Math.abs(v) < 1 && k !== 'z' && k !== 'gi_z' ? `${Math.round(v * 100)}%` : v.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
  return String(v)
}

export default function Ask() {
  const { country } = useApp()
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [listening, setListening] = useState(false)
  const ask = async (question) => {
    const text = question ?? q
    if (!text.trim()) return
    setQ(text); setBusy(true); setErr(null)
    try { setRes(await api.ask(text)) } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const voice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR(); r.lang = 'en-IN'; r.onresult = (e) => ask(e.results[0][0].transcript); r.onend = () => setListening(false)
    setListening(true); r.start()
  }
  const points = res?.rows?.filter((r) => r.lat && r.lng).map((r, i) => ({ area_id: r.area_id || i, area: r.area, district: r.district, lat: r.lat, lng: r.lng, population: 100000, ngi_max: r.ngi ?? 70, hotspot: { z: r.gi_z ?? '', class: '' }, sectors: {}, silent_zone: !!r.silent_score, silent_sectors: r.sector ? [r.sector] : [] }))
  return (
    <div className="stack-md">
      <PageHead title="Ask a question" eyebrow="Official workspace" steps={["Type a question in plain words", "Or tap an example", "Get an answer with the numbers"]} actions={<Link className="btn" to={`/brief?country=${country === 'all' ? 'IN' : country}`}><FileText size={16} aria-hidden="true" />Generate policy brief</Link>}>
        Type or speak a question in any language.
      </PageHead>
      <Card>
        <form className="row" onSubmit={(e) => { e.preventDefault(); ask() }}>
          <label htmlFor="q" className="sr-only">Question</label>
          <input id="q" className="input" style={{ flex: 1, minWidth: 260, fontSize: '1.05rem' }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which areas need drinking water most and have nothing planned?" />
          <button type="button" className="btn btn-icon" onClick={voice} aria-label="Ask by voice" aria-pressed={listening}><Mic size={18} /></button>
          <button className="btn btn-primary" disabled={busy}><Sparkles size={16} aria-hidden="true" />{busy ? 'Thinking…' : 'Ask'}</button>
        </form>
        <div className="row mt">{EXAMPLES.map((e) => <button key={e} className="btn btn-sm" onClick={() => ask(e)}>{e}</button>)}</div>
      </Card>
      <ErrorBox error={err} />
      {res && (
        <>
          <div className="alert alert-info"><Sparkles size={18} aria-hidden="true" /><div><strong>{res.answer}</strong>
            <div className="row xs mt" style={{ marginTop: 6 }}>Interpreted as: <Badge tone="dark">{res.intent.intent.replace('_', ' ')}</Badge>
              {res.intent.sector && <Badge>{res.intent.sector}</Badge>}{res.intent.country && <Badge>{res.intent.country}</Badge>}{res.intent.state && <Badge>{res.intent.state}</Badge>}
              {res.intent.district && <Badge>{res.intent.district}</Badge>}<span className="muted">parser: {res.intent.parser}</span></div></div></div>
          <div className="grid g-main">
            <Card title="Results">
              <div className="table-wrap"><table className="table">
                <thead><tr>{res.columns.map((c) => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
                <tbody>{res.rows.map((r, i) => <tr key={i}>{res.columns.map((c) => <td key={c} className={typeof r[c] === 'number' ? 'num' : 'small'}>{cell(c, r[c])}</td>)}</tr>)}</tbody>
              </table></div>
            </Card>
            {points?.length > 0 && <Card title="On the map"><DemandMap areas={points} layer={res.intent.intent === 'silent_zones' ? 'silent' : 'ngi'} fit /></Card>}
          </div>
        </>
      )}
    </div>
  )
}
