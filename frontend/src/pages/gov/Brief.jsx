import { useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Card, ErrorBox, ListenButton, Loading, NgiBar, PageHead, SectorTag } from '../../components/ui'
import { DISTRICTS, SECTORS, STATES, date, fmt, money, pct } from '../../lib/format'

export default function Brief() {
  const t = useT()
  const { uiLang, stateParam } = useApp()
  const [sp, setSp] = useSearchParams()
  const state = sp.get('state') ?? stateParam ?? ''
  const district = sp.get('district') || ''
  const { data: b, loading, error } = useAsync(() => api.brief({ state: state || undefined, district: district || undefined, language: uiLang }), [state, district, uiLang])
  const place = district ? `${t(district)}, ${t(state)}` : state ? t(state) : t('All India')
  const lowMoney = b ? b.misaligned_spending.reduce((s, m) => s + (m.cost_local || 0), 0) : 0
  const findings = b ? [
    b.top_needs[0] && t('Biggest need: {a} ({s}), need level {v} out of 100.', { a: b.top_needs[0].area, s: t((SECTORS[b.top_needs[0].sector] || SECTORS.other).short), v: b.top_needs[0].ngi }),
    t('{n} silent areas: big need, few reports.', { n: b.silent_zones.length }),
    b.misaligned_spending.length > 0 && t('{m} is planned in low-need places.', { m: money(lowMoney) }),
    t('{n} early warnings this week.', { n: b.alerts?.length || 0 }),
    ...b.impact.map((i) => t('Complaints fell by {p}% after: {w}', { p: Math.round(i.reduction_pct), w: i.title })),
  ].filter(Boolean) : []
  return (
    <div className="stack-md">
      <div className="no-print">
        <PageHead title="Policy brief" eyebrow="Official workspace" overlap={false} steps={['Pick a state and district', 'Read or listen', 'Print or save as PDF']}>
          A short, printable summary for decision makers.
        </PageHead>
      </div>
      <div className="stack-md" style={{ maxWidth: 980 }}>
      <div className="card row no-print">
        <label className="row small"><span className="muted">{t('State')}</span>
          <select className="select" style={{ width: 'auto', minHeight: 44 }} value={state} onChange={(e) => setSp(e.target.value ? { state: e.target.value } : {})}>
            <option value="">{t('All India')}</option>{STATES.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select></label>
        <label className="row small"><span className="muted">{t('District')}</span>
          <select className="select" style={{ width: 'auto', minHeight: 44 }} value={district} disabled={!state} onChange={(e) => setSp(e.target.value ? { state, district: e.target.value } : { state })}>
            <option value="">{t('Whole state')}</option>{(DISTRICTS[state] || []).map((d) => <option key={d} value={d}>{t(d)}</option>)}</select></label>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" />{t('Print / save as PDF')}</button>
        {findings.length > 0 && <ListenButton text={`${t('Development needs brief: {p}', { p: place })}. ${findings.join(' ')}`} className="btn" />}
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading height={500} /> : b && (
        <article className="stack-md">
          <header className="card">
            <div className="xs muted">{t('JanSetu policy brief · made on {d}', { d: date(b.generated_at) })}</div>
            <h1 style={{ margin: '6px 0' }}>{t('Development needs brief: {p}', { p: place })}</h1>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>{findings.map((k) => <li key={k}>{k}</li>)}</ul>
          </header>
          <Card title="Needs by type">
            <div className="table-wrap"><table className="table"><thead><tr><th>{t('Need')}</th><th className="num">{t('Reports')}</th><th>{t('Average need level')}</th></tr></thead>
              <tbody>{b.sector_table.map((s) => <tr key={s.sector}><td>{t(s.sector)}</td><td className="num">{fmt(s.reports)}</td><td style={{ minWidth: 180 }}><NgiBar value={s.avg_ngi} /></td></tr>)}</tbody></table></div>
          </Card>
          <Card title="Places that need help most">
            <div className="table-wrap"><table className="table"><thead><tr><th>{t('Place')}</th><th>{t('Need')}</th><th className="num">{t('Families who asked')}</th><th className="num">{t('Missing')}</th><th>{t('Need level')}</th></tr></thead>
              <tbody>{b.top_needs.map((r) => <tr key={r.area + r.sector}><td>{r.area}<div className="xs muted">{t(r.district)}</div></td><td><SectorTag sector={r.sector} short /></td><td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td><td style={{ minWidth: 150 }}><NgiBar value={r.ngi} /></td></tr>)}</tbody></table></div>
          </Card>
          {b.silent_zones.length > 0 && <Card title="Silent areas: send someone to listen">
            <div className="table-wrap"><table className="table"><thead><tr><th>{t('Place')}</th><th>{t('Need')}</th><th className="num">{t('Missing')}</th><th className="num">{t('How poor or at risk')}</th></tr></thead>
              <tbody>{b.silent_zones.map((r) => <tr key={r.area + r.sector}><td>{r.area}<div className="xs muted">{t(r.district)}</div></td><td><SectorTag sector={r.sector} short /></td><td className="num">{pct(r.deficit)}</td><td className="num">{Math.round(r.vulnerability * 100)} / 100</td></tr>)}</tbody></table></div></Card>}
          <Card title="Works we suggest">
            <div className="table-wrap"><table className="table"><thead><tr><th>{t('Work')}</th><th>{t('Scheme')}</th><th className="num">{t('Cost')}</th><th className="num">{t('People helped')}</th><th className="num">{t('Score')}</th></tr></thead>
              <tbody>{b.recommended_projects.map((p) => <tr key={p.code}><td>{p.title}</td><td className="small">{p.scheme}</td><td className="num">{money(p.cost_local)}</td><td className="num">{fmt(p.beneficiaries)}</td><td className="num">{p.score}</td></tr>)}</tbody></table></div></Card>
          {b.misaligned_spending.length > 0 && <Card title="Planned money to check again" sub="These places have lower need than the India middle level.">
            <div className="table-wrap"><table className="table"><thead><tr><th>{t('Planned work')}</th><th className="num">{t('Cost')}</th><th className="num">{t('Need there')}</th><th className="num">{t('India middle level')}</th></tr></thead>
              <tbody>{b.misaligned_spending.map((m) => <tr key={m.code}><td>{m.title}<div className="xs muted">{m.area}</div></td><td className="num">{money(m.cost_local)}</td><td className="num">{m.need_ngi}</td><td className="num">{m.national_median_ngi}</td></tr>)}</tbody></table></div></Card>}
          {b.impact.length > 0 && <Card title="Did finished work help?">
            <ul>{b.impact.map((i) => <li key={i.title}>{t('Complaints fell by {p}% after: {w}', { p: Math.round(i.reduction_pct), w: i.title })}</li>)}</ul></Card>}
          <p className="xs muted">{t('Need level adds up: how many asked, what is missing, how poor people are, and how serious it is. Places that already have a plan count less.')}</p>
        </article>
      )}
      </div>
    </div>
  )
}
