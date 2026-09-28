import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, Clock, Hammer, Lightbulb, PauseCircle, RefreshCw, VolumeX, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, NgiBar, PageHead, SectorTag, StatusBadge, Tabs } from '../../components/ui'
import { COUNTRIES, LANG_NAMES, SECTORS, SECTOR_KEYS, fmt, money, usd } from '../../lib/format'

const BUDGET_MAX = { IN: 6e9, BR: 3e8, ZA: 2e9 }

function WhyCard({ id, onChanged }) {
  const { t } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.project(id), [id])
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)
  if (loading) return <Loading height={400} />
  if (error) return <ErrorBox error={error} />
  const p = data, ex = p.explanation
  const decide = async (decision) => {
    setErr(null)
    try { const r = await api.decide(p.id, decision, reason); setDone(`${decision} recorded. ${r.citizens_notified} citizens notified in their own languages.`); reload(); onChanged?.() }
    catch (e) { setErr(e) }
  }
  return (
    <Card title={p.title} sub={`${p.area}, ${p.district} · ${COUNTRIES[p.country]} · ${p.sdg}`} actions={<StatusBadge status={p.status} />}>
      <div className="grid g-3">
        <div><div className="stat-label">{t('priority_score', 'Priority score')}</div><div className="stat-value">{p.score}</div></div>
        <div><div className="stat-label">{t('estimated_cost', 'Estimated cost')}</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{money(p.cost_local, p.country)}</div><div className="xs muted">{usd(p.cost_usd)}</div></div>
        <div><div className="stat-label">{t('beneficiaries', 'Beneficiaries')}</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmt(p.beneficiaries)}</div></div>
      </div>
      <div className="row mt"><SectorTag sector={p.sector} /><Badge tone="blue">Funding: {p.scheme}</Badge></div>
      {ex && (
        <>
          <div className="divider" />
          <h3 className="row"><Lightbulb size={18} aria-hidden="true" />{t('why_this_project', 'Why this project?')}</h3>
          <ul className="small" style={{ paddingLeft: 18 }}>{ex.facts.map((f) => <li key={f} style={{ color: f.startsWith('SILENT') ? 'var(--color-silent)' : undefined, fontWeight: f.startsWith('SILENT') ? 600 : 400 }}>{f}</li>)}</ul>
          <div className="stack mt">
            {ex.drivers.map((d) => (
              <div key={d.factor} className="small" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 40% 40px', gap: 10, alignItems: 'center' }}><span>{d.factor}</span>
                <span className="ngi-track"><span className="ngi-fill" style={{ display: 'block', width: `${Math.min(100, d.points * 3)}%`, background: '#2a78d6' }} /></span><span className="mono" style={{ textAlign: 'right' }}>{d.points}</span></div>
            ))}
            <div className="xs muted">{ex.formula}. Need-Gap Index {ex.ngi}; cost-efficiency percentile {ex.efficiency_pct}.</div>
          </div>
          <h3 className="mt">{t('citizen_evidence', 'Citizen evidence')}</h3>
          <div className="stack">
            {ex.evidence.map((q) => (
              <div key={q.tracking_id} className="quote"><div className="orig">{q.original}</div><div className="en">{q.english}</div>
                <div className="xs muted">{LANG_NAMES[q.language] || q.language} · <Link to={`/track/${q.tracking_id}`} className="mono">{q.tracking_id}</Link></div></div>
            ))}
          </div>
        </>
      )}
      {p.decision_reason && <div className="alert alert-info mt"><CheckCircle2 size={16} aria-hidden="true" /><div className="small">Decision by {p.decided_by}: {p.decision_reason}</div></div>}
      {p.source === 'recommended' && (
        <>
          <div className="divider" />
          <div className="field"><label htmlFor="reason">Decision note (required to reject or defer; logged for audit)</label>
            <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Convergence with PMGSY confirmed; DPR to be prepared" /></div>
          <div className="row mt">
            <button className="btn btn-primary" onClick={() => decide('approve')}><CheckCircle2 size={16} aria-hidden="true" />{t('approve', 'Approve')}</button>
            <button className="btn" onClick={() => decide('defer')}><PauseCircle size={16} aria-hidden="true" />{t('defer', 'Defer')}</button>
            <button className="btn btn-danger" onClick={() => decide('reject')}><XCircle size={16} aria-hidden="true" />{t('reject', 'Reject')}</button>
            <button className="btn" onClick={() => decide('start')}><Hammer size={16} aria-hidden="true" />Start work</button>
            <button className="btn btn-success" onClick={() => decide('complete')}><Clock size={16} aria-hidden="true" />Mark complete</button>
          </div>
          <p className="help">AI recommends, humans decide. Approving or completing notifies every citizen in the demand cluster, in their language; completion asks them to verify.</p>
          {done && <div className="alert alert-success mt"><CheckCircle2 size={16} aria-hidden="true" /><div className="small">{done}</div></div>}
          <ErrorBox error={err} />
        </>
      )}
    </Card>
  )
}

function Portfolio({ projects }) {
  const bySector = SECTOR_KEYS.map((s) => ({ s, pts: projects.filter((p) => p.sector === s).map((p) => ({ x: p.score_breakdown?.efficiency_pct, y: p.score_breakdown?.ngi, z: p.beneficiaries, title: p.title, area: p.area })) })).filter((g) => g.pts.length)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 18, left: -8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name="Cost-efficiency" domain={[0, 100]} fontSize={12} stroke="#94a3b8" tickLine={false} label={{ value: 'Cost-efficiency percentile →', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#475569' }} />
        <YAxis type="number" dataKey="y" name="Need-Gap" domain={[30, 90]} fontSize={12} stroke="#94a3b8" tickLine={false} label={{ value: 'Need-Gap →', angle: -90, position: 'insideLeft', offset: 20, fontSize: 12, fill: '#475569' }} />
        <ZAxis type="number" dataKey="z" range={[40, 400]} />
        <Tooltip content={({ payload }) => payload?.[0] ? <div className="chart-tip"><strong>{payload[0].payload.title}</strong><div>NGI {payload[0].payload.y} · efficiency {payload[0].payload.x}</div><div>{fmt(payload[0].payload.z)} beneficiaries</div></div> : null} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" verticalAlign="top" />
        {bySector.map((g) => <Scatter isAnimationActive={false} key={g.s} name={SECTORS[g.s].short} data={g.pts} fill={SECTORS[g.s].hex} fillOpacity={0.8} stroke="#fff" strokeWidth={1.5} />)}
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function Optimiser({ defaultCountry }) {
  const [country, setCountry] = useState(defaultCountry || 'IN')
  const [budget, setBudget] = useState(BUDGET_MAX[country] / 4)
  const [res, setRes] = useState(null)
  useEffect(() => { setBudget(BUDGET_MAX[country] / 4) }, [country])
  useEffect(() => { const h = setTimeout(() => api.optimise(country, budget).then(setRes).catch(() => {}), 250); return () => clearTimeout(h) }, [country, budget])
  return (
    <div className="grid g-main">
      <Card title="Budget planner" sub="Set your budget. We pick the projects that help the most people in need.">
        <div className="row">
          {['IN', 'BR', 'ZA'].map((c) => <button key={c} className={`btn btn-sm ${country === c ? 'btn-dark' : ''}`} onClick={() => setCountry(c)}>{COUNTRIES[c]}</button>)}
        </div>
        <div className="field mt">
          <div className="row-between"><label htmlFor="budget">Available budget</label><span className="stat-value" style={{ fontSize: '1.4rem' }}>{money(budget, country)}</span></div>
          <input id="budget" type="range" min={BUDGET_MAX[country] / 50} max={BUDGET_MAX[country]} step={BUDGET_MAX[country] / 200} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        </div>
        {res && (
          <>
            <div className="grid g-3 mt">
              <div><div className="stat-label">Projects funded</div><div className="stat-value">{res.selected.length}<span className="muted small"> / {res.candidates}</span></div></div>
              <div><div className="stat-label">People reached</div><div className="stat-value">{fmt(res.total_beneficiaries)}</div></div>
              <div><div className="stat-label">Budget used</div><div className="stat-value">{Math.round((res.utilisation || 0) * 100)}%</div></div>
            </div>
            <div className="table-wrap mt"><table className="table">
              <thead><tr><th>Project</th><th>Sector</th><th className="num">Cost</th><th className="num">Beneficiaries</th><th className="num">Score</th></tr></thead>
              <tbody>{(res.projects || []).sort((a, b) => b.score - a.score).map((p) => (
                <tr key={p.id}><td><strong>{p.title}</strong>{p.score_breakdown?.silent_zone && <> <Badge tone="violet">silent zone</Badge></>}</td><td><SectorTag sector={p.sector} short /></td>
                  <td className="num">{money(p.cost_local, p.country)}</td><td className="num">{fmt(p.beneficiaries)}</td><td className="num">{p.score}</td></tr>))}</tbody>
            </table></div>
          </>
        )}
      </Card>
      <Card title="How to read it" sub="Transparent, reproducible, auditable">
        <ul className="small" style={{ paddingLeft: 18 }}>
          <li>Candidates are AI-recommended and approved projects for the selected country.</li>
          <li>Value of a project = beneficiaries × priority score ÷ 100 (need-weighted reach).</li>
          <li>Move the slider: watch which projects enter as budget grows. Smaller, high-need projects in silent zones often enter first.</li>
          <li>Export the portfolio into the annual plan (GPDP / PPA / IDP) and approve individually with a decision note.</li>
        </ul>
      </Card>
    </div>
  )
}

export default function Projects() {
  const { countryParam, country, t } = useApp()
  const [sp, setSp] = useSearchParams()
  const [tab, setTab] = useState(sp.get('tab') || 'recommended')
  const [selected, setSelected] = useState(sp.get('id') ? Number(sp.get('id')) : null)
  const [sector, setSector] = useState('all')
  const recs = useAsync(() => api.projects({ source: 'recommended', country: countryParam, sector }), [countryParam, sector])
  const plans = useAsync(() => api.projects({ source: 'plan', country: countryParam }), [countryParam])
  const al = useAsync(() => api.alignment(countryParam), [countryParam])
  const [regen, setRegen] = useState(false)
  useEffect(() => { if (!selected && recs.data?.length) setSelected(recs.data[0].id) }, [recs.data, selected])
  const change = (t) => { setTab(t); setSp({ tab: t }) }
  const misaligned = useMemo(() => (al.data ? Object.entries(al.data).flatMap(([c, v]) => v.misaligned_projects.map((p) => ({ ...p, country: c }))) : []), [al.data])

  const regenerate = async () => { setRegen(true); try { await api.regenerate(); recs.reload() } finally { setRegen(false) } }

  return (
    <div className="stack-md">
      <PageHead title={t('projects_title', 'Projects & budget')} actions={<button className="btn" onClick={regenerate} disabled={regen}><RefreshCw size={16} aria-hidden="true" />{regen ? 'Updating…' : 'Refresh suggestions'}</button>}>
        {t('projects_subtitle', 'What to build first, how much it costs, and why.')}
      </PageHead>
      <Tabs value={tab} onChange={change} tabs={[
        { value: 'recommended', label: `${t('tab_recommended', 'Suggested by AI')} (${recs.data?.length ?? '…'})` },
        { value: 'optimiser', label: t('tab_optimiser', 'Budget planner') },
        { value: 'misaligned', label: `Money in low-need areas (${misaligned.length})` },
        { value: 'plans', label: t('tab_all_projects', 'Existing plans') },
      ]} />
      {tab === 'recommended' && (
        <>
          <Card title="All suggestions at a glance" sub="Top-right = high need and good value for money. Bigger dot = more people helped.">
            {recs.data ? <Portfolio projects={recs.data} /> : <Loading height={300} />}
          </Card>
          <div className="grid g-2" style={{ alignItems: 'start' }}>
            <Card title="Ranked shortlist" actions={
              <select className="select" style={{ width: 'auto', minHeight: 36 }} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
                <option value="all">{t('all_sectors', 'All sectors')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}</select>}>
              {recs.loading ? <Loading height={400} /> : (
                <div className="table-wrap" style={{ maxHeight: 720, overflowY: 'auto' }}><table className="table">
                  <thead><tr><th>Project</th><th>{t('priority_score', 'Score')}</th><th className="num">{t('estimated_cost', 'Cost')}</th><th>{t('status_label', 'Status')}</th></tr></thead>
                  <tbody>{(recs.data || []).map((p) => (
                    <tr key={p.id} className="clickable" onClick={() => setSelected(p.id)} style={{ background: selected === p.id ? 'var(--color-accent-soft)' : undefined }}>
                      <td><div className="row" style={{ gap: 6 }}><SectorTag sector={p.sector} short />{p.score_breakdown?.silent_zone && <Badge tone="violet"><VolumeX size={12} aria-hidden="true" />silent</Badge>}</div>
                        <button className="btn-ghost" style={{ border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', fontWeight: 600, background: 'none' }} onClick={() => setSelected(p.id)}>{p.title}</button>
                        <div className="xs muted">{p.district} · {COUNTRIES[p.country]}</div></td>
                      <td style={{ minWidth: 110 }}><NgiBar value={p.score} /></td>
                      <td className="num">{money(p.cost_local, p.country)}</td><td><StatusBadge status={p.status} /></td>
                    </tr>))}</tbody>
                </table></div>
              )}
            </Card>
            {selected ? <WhyCard key={selected} id={selected} onChanged={recs.reload} /> : <Card><p className="muted">Select a project.</p></Card>}
          </div>
        </>
      )}
      {tab === 'optimiser' && <Optimiser defaultCountry={country === 'all' ? 'IN' : country} />}
      {tab === 'misaligned' && (
        <Card title="Planned spending going to below-median need" sub="Existing plan items where the Need-Gap Index is below the national median. Candidates for re-prioritisation.">
          <div className="alert alert-warn" style={{ marginBottom: 12 }}><AlertTriangle size={18} aria-hidden="true" />
            <div className="small">{al.data && Object.entries(al.data).map(([c, v]) => `${COUNTRIES[c]}: ${Math.round(v.share_to_below_median_need * 100)}% of ${usd(v.plan_budget_usd)} planned`).join(' · ')}</div></div>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Plan item</th><th>{t('th_area', 'Area')}</th><th>{t('th_sector', 'Sector')}</th><th className="num">{t('estimated_cost', 'Cost')}</th><th>Need there</th><th className="num">Country median</th><th>{t('status_label', 'Status')}</th></tr></thead>
            <tbody>{misaligned.map((p) => (
              <tr key={p.code}><td><strong>{p.title}</strong><div className="xs muted mono">{p.code}</div></td><td>{p.area}</td><td><SectorTag sector={p.sector} short /></td>
                <td className="num">{money(p.cost_local, p.country)}</td><td style={{ minWidth: 140 }}><NgiBar value={p.need_ngi} /></td><td className="num">{p.country_median_ngi}</td><td><StatusBadge status={p.status} /></td></tr>))}</tbody>
          </table></div>
        </Card>
      )}
      {tab === 'plans' && (
        <Card title="Existing public investment plans" sub="Imported from GPDP / eGramSwaraj (India), PPA (Brazil), municipal IDPs (South Africa)">
          {plans.loading ? <Loading /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Code</th><th>Project</th><th>{t('th_area', 'Area')}</th><th>{t('th_sector', 'Sector')}</th><th className="num">{t('estimated_cost', 'Cost')}</th><th className="num">{t('beneficiaries', 'Beneficiaries')}</th><th>{t('status_label', 'Status')}</th></tr></thead>
              <tbody>{(plans.data || []).map((p) => (
                <tr key={p.id}><td className="mono xs">{p.code}</td><td><strong>{p.title}</strong><div className="xs muted">{p.scheme}</div></td><td>{p.area}</td><td><SectorTag sector={p.sector} short /></td>
                  <td className="num">{money(p.cost_local, p.country)}</td><td className="num">{fmt(p.beneficiaries)}</td><td><StatusBadge status={p.status} /></td></tr>))}</tbody>
            </table></div>
          )}
        </Card>
      )}
    </div>
  )
}
