import { useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../../api/client'
import { useAsync } from '../../lib/useAsync'
import { Card, ErrorBox, Loading, NgiBar, SectorTag } from '../../components/ui'
import { COUNTRIES, date, fmt, money, pct, usd } from '../../lib/format'

const DISTRICTS = { IN: ['Adilabad', 'Koraput', 'North East Delhi', 'South Delhi', 'North West Delhi'], BR: ['São Paulo'], ZA: ['Johannesburg', 'Ekurhuleni'] }

export default function Brief() {
  const [sp, setSp] = useSearchParams()
  const country = sp.get('country') || 'IN'
  const district = sp.get('district') || ''
  const { data: b, loading, error } = useAsync(() => api.brief({ country, district }), [country, district])
  return (
    <div className="stack-md" style={{ maxWidth: 960 }}>
      <div className="row no-print">
        <select className="select" style={{ width: 'auto' }} value={country} onChange={(e) => setSp({ country: e.target.value })} aria-label="Country">
          {['IN', 'BR', 'ZA'].map((c) => <option key={c} value={c}>{COUNTRIES[c]}</option>)}</select>
        <select className="select" style={{ width: 'auto' }} value={district} onChange={(e) => setSp({ country, district: e.target.value })} aria-label="District">
          <option value="">Whole country</option>{DISTRICTS[country].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Print / save as PDF</button>
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading height={500} /> : b && (
        <article className="stack-md">
          <header>
            <div className="xs muted">JanSetu policy brief · generated {date(b.generated_at)} · {b.narrative_mode === 'llm' ? 'AI narrative' : 'template narrative'}</div>
            <h1>{b.title}</h1>
            <p>{b.executive_summary}</p>
          </header>
          <Card title="Key findings"><ul>{b.key_findings.map((k) => <li key={k}>{k}</li>)}</ul></Card>
          <Card title="Sector overview">
            <table className="table"><thead><tr><th>Sector</th><th className="num">Reports</th><th>Average Need-Gap</th></tr></thead>
              <tbody>{b.sector_table.map((s) => <tr key={s.sector}><td>{s.sector}</td><td className="num">{fmt(s.reports)}</td><td style={{ minWidth: 180 }}><NgiBar value={s.avg_ngi} /></td></tr>)}</tbody></table>
          </Card>
          <Card title="Top unmet needs">
            <table className="table"><thead><tr><th>Area</th><th>Sector</th><th className="num">Households</th><th className="num">Deficit</th><th>NGI</th></tr></thead>
              <tbody>{b.top_needs.map((r) => <tr key={r.area + r.sector}><td>{r.area}<div className="xs muted">{r.district}</div></td><td><SectorTag sector={r.sector} short /></td><td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td><td style={{ minWidth: 150 }}><NgiBar value={r.ngi} /></td></tr>)}</tbody></table>
          </Card>
          {b.silent_zones.length > 0 && <Card title="Silent zones requiring outreach">
            <table className="table"><thead><tr><th>Area</th><th>Sector</th><th className="num">Deficit</th><th className="num">Vulnerability</th></tr></thead>
              <tbody>{b.silent_zones.map((r) => <tr key={r.area + r.sector}><td>{r.area}</td><td><SectorTag sector={r.sector} short /></td><td className="num">{pct(r.deficit)}</td><td className="num">{r.vulnerability}</td></tr>)}</tbody></table></Card>}
          <Card title="Recommended projects">
            <table className="table"><thead><tr><th>Project</th><th>Funding scheme</th><th className="num">Cost</th><th className="num">Beneficiaries</th><th className="num">Score</th></tr></thead>
              <tbody>{b.recommended_projects.map((p) => <tr key={p.code}><td>{p.title}</td><td className="small">{p.scheme}</td><td className="num">{usd(p.cost_usd)}</td><td className="num">{fmt(p.beneficiaries)}</td><td className="num">{p.score}</td></tr>)}</tbody></table></Card>
          {b.misaligned_spending.length > 0 && <Card title="Planned spending to review">
            <table className="table"><thead><tr><th>Plan item</th><th className="num">Cost</th><th className="num">Need there</th><th className="num">Median</th></tr></thead>
              <tbody>{b.misaligned_spending.map((m) => <tr key={m.code}><td>{m.title}</td><td className="num">{money(m.cost_local, country)}</td><td className="num">{m.need_ngi}</td><td className="num">{m.country_median_ngi}</td></tr>)}</tbody></table></Card>}
          {b.impact.length > 0 && <Card title="Measured impact of completed projects">
            <ul>{b.impact.map((i) => <li key={i.title}>{i.title}: complaints fell {i.reduction_pct}% (difference-in-differences {i.did_estimate} per 1k households / month).</li>)}</ul></Card>}
          <p className="xs muted">{b.method_note}</p>
        </article>
      )}
    </div>
  )
}
