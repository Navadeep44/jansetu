import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Mic, Sparkles } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { SPEECH_TAG, useT } from '../../i18n'
import DemandMap from '../../components/map/DemandMap'
import { Badge, Card, ErrorBox, ListenButton, PageHead, SectorTag } from '../../components/ui'
import { SECTORS, fmt, money, pct } from '../../lib/format'

// Each example was tested against POST /api/query and returns rows.
const EXAMPLES = [
  'Which villages in Adilabad need drinking water but have no plan?',
  'बिहार में सबसे ज़्यादा पानी की समस्या कहाँ है?',
  'తెలంగాణలో నిశ్శబ్ద ప్రాంతాలు చూపించు',
  'Where is spending going to low need areas?',
  'Show early warnings this week',
  'उत्तर प्रदेश में चुप इलाके दिखाओ',
  'ఆదిలాబాద్‌లో తాగునీటి సమస్య ఎక్కడ ఎక్కువ?',
  'Did the completed projects work?',
]

const COL = {
  area: 'Place', district: 'District', state: 'State', sector: 'Need', ngi: 'Need level', deficit: 'Missing',
  effective_households: 'Families who asked', vulnerability: 'How poor or at risk', demand_per_1000hh: 'Reports per 1,000 families',
  ngi_max: 'Highest need level', top_sector: 'Top need', code: 'Code', title: 'Work', cost_local: 'Cost', need_ngi: 'Need there',
  national_median_ngi: 'India middle level', last_week: 'Reports this week', baseline_weekly_mean: 'Normal per week',
  did_estimate: 'Change vs similar areas', reduction_pct: 'Complaints fell',
}
const HIDE = new Set(['z', 'gi_z', 'silent_score', 'message', 'recommended_outreach'])
const INTENT = {
  top_need: 'Biggest needs', unplanned_need: 'Needs with no plan', silent_zones: 'Silent areas', hotspots: 'Hotspots',
  misaligned_spending: 'Money in low-need places', alerts: 'Early warnings', impact: 'Results of finished work',
}

function answerText(res, t) {
  const it = res.intent, n = res.rows.length
  const where = t(it.district || it.state || it.area || 'India')
  const first = res.rows[0]
  switch (it.intent) {
    case 'top_need': return t('{n} places with the biggest need in {where}.', { n, where }) + (first ? ' ' + t('Highest: {a}, need level {v}.', { a: first.area, v: first.ngi }) : '')
    case 'unplanned_need': return t('{n} places in {where} have big need and no plan.', { n, where }) + (first ? ' ' + t('Highest: {a}, need level {v}.', { a: first.area, v: first.ngi }) : '')
    case 'silent_zones': return t('{n} silent areas in {where}: big need, few reports.', { n, where })
    case 'hotspots': return t('{n} hotspots in {where}.', { n, where })
    case 'misaligned_spending': return t('{n} planned works go to low-need places. Total {m}.', { n, m: money(res.rows.reduce((s, r) => s + (r.cost_local || 0), 0)) })
    case 'alerts': return t('{n} early warnings this week.', { n })
    default: return t('{n} finished works with measured results.', { n })
  }
}

export default function Ask() {
  const { stateParam, uiLang } = useApp()
  const t = useT()
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
    const r = new SR(); r.lang = SPEECH_TAG[uiLang] || 'en-IN'; r.onresult = (e) => ask(e.results[0][0].transcript); r.onend = () => setListening(false)
    setListening(true); r.start()
  }
  const cell = (k, v) => {
    if (v === null || v === undefined) return '–'
    if (k === 'sector' || k === 'top_sector') return SECTORS[v] ? <SectorTag sector={v} short /> : v
    if (k === 'state' || k === 'district') return t(v)
    if (k === 'cost_local') return money(v)
    if (k === 'deficit' || k === 'vulnerability') return pct(v)
    if (k === 'reduction_pct') return `${v}%`
    if (typeof v === 'number') return <span className="mono">{fmt(v, 1)}</span>
    return String(v)
  }
  const cols = res ? res.columns.filter((c) => !HIDE.has(c)) : []
  const answer = res ? answerText(res, t) : ''
  const points = res?.rows?.filter((r) => r.lat && r.lng).map((r, i) => ({ area_id: r.area_id || i, area: r.area, district: r.district, lat: r.lat, lng: r.lng, population: 100000, ngi_max: r.ngi ?? r.ngi_max ?? r.need_ngi ?? 70, hotspot: { z: r.gi_z ?? '', class: '' }, sectors: {}, silent_zone: res.intent.intent === 'silent_zones', silent_sectors: r.sector ? [r.sector] : [], reports: r.last_week }))
  return (
    <div className="stack-md">
      <PageHead title="Ask a question" eyebrow="Official workspace" steps={['Type or speak a question', 'Or tap an example', 'See the answer and the list']}
        actions={<Link className="btn" to={`/brief${stateParam ? `?state=${encodeURIComponent(stateParam)}` : ''}`}><FileText size={16} aria-hidden="true" />{t('Make a policy brief')}</Link>}>
        Ask in English, Hindi or Telugu. Get the answer with numbers.
      </PageHead>
      <Card>
        <form className="row" onSubmit={(e) => { e.preventDefault(); ask() }}>
          <label htmlFor="q" className="sr-only">{t('Your question')}</label>
          <input id="q" className="input" style={{ flex: 1, minWidth: 220, fontSize: '1.05rem', minHeight: 48 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('e.g. Where is drinking water needed most?')} />
          <button type="button" className="btn btn-icon" style={{ minWidth: 48, minHeight: 48 }} onClick={voice} aria-label={t('Ask by voice')} aria-pressed={listening}><Mic size={18} aria-hidden="true" /></button>
          <button className="btn btn-primary" style={{ minHeight: 48 }} disabled={busy}><Sparkles size={16} aria-hidden="true" />{busy ? t('Thinking…') : t('Ask')}</button>
        </form>
        <div className="xs muted mt">{t('Try one:')}</div>
        <div className="row" style={{ marginTop: 6 }}>{EXAMPLES.map((e) => <button key={e} type="button" className="btn" style={{ fontWeight: 500 }} onClick={() => ask(e)}>{e}</button>)}</div>
      </Card>
      <ErrorBox error={err} />
      {res && (
        <>
          <div className="alert alert-info" role="status" style={{ flexWrap: 'wrap' }}><Sparkles size={18} aria-hidden="true" />
            <div style={{ flex: '1 1 220px' }}><strong style={{ fontSize: '1.05rem' }}>{answer}</strong>
              <div className="row xs" style={{ marginTop: 6 }}>{t('Understood as')}: <Badge tone="dark">{t(INTENT[res.intent.intent] || res.intent.intent)}</Badge>
                {res.intent.sector && SECTORS[res.intent.sector] && <Badge>{t(SECTORS[res.intent.sector].short)}</Badge>}{res.intent.state && <Badge>{t(res.intent.state)}</Badge>}
                {res.intent.district && <Badge>{t(res.intent.district)}</Badge>}</div></div>
            <ListenButton text={answer} className="btn" />
          </div>
          <div className="grid g-main">
            <Card title="Answer" sub={<>{t('{n} rows', { n: res.rows.length })}</>}>
              {res.rows.length === 0 ? <p className="muted">{t('No matches. Try other words.')}</p> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr>{cols.map((c) => <th key={c} className={typeof res.rows[0]?.[c] === 'number' ? 'num' : undefined}>{t(COL[c] || c.replace(/_/g, ' '))}</th>)}</tr></thead>
                  <tbody>{res.rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} className={typeof r[c] === 'number' ? 'num' : 'small'}>{cell(c, r[c])}</td>)}</tr>)}</tbody>
                </table></div>
              )}
            </Card>
            {points?.length > 0 && <Card title="On the map"><DemandMap areas={points} layer={res.intent.intent === 'silent_zones' ? 'silent' : 'ngi'} fit /></Card>}
          </div>
        </>
      )}
    </div>
  )
}
