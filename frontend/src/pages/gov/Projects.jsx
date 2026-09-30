import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, Clock, Download, Droplets, Eye, Hammer, Landmark, Lightbulb, PauseCircle, RefreshCw, Users, VolumeX, Wallet, XCircle } from 'lucide-react'
import { api } from '../../api/client'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, ListenButton, Loading, NgiBar, PageHead, SectorTag, Stat, StatusBadge, Tabs } from '../../components/ui'
import { DISTRICTS, LANG_NAMES, SECTORS, SECTOR_KEYS, STATES, fmt, money, pct } from '../../lib/format'
import { can } from '../../lib/roles'
import { AreaLine, placeName, useLevel } from './levelScope'

const CR = 1e7
const DRIVER = { demand: 'How many people asked', deficit: 'What is missing on the ground', vulnerability: 'How poor or at risk people are', severity: 'How serious it is' }
const DONE_WORD = { approve: 'Approved', defer: 'Deferred', reject: 'Rejected', start: 'Work started', complete: 'Completed' }

// Project pipeline steps that the shared status list does not name yet.
const PIPE = {
  proposed: ['Proposed by department', 'amber'], district_approved: ['Approved by Collector', 'blue'], state_approved: ['Approved by State', 'blue'],
  funded: ['Money released', 'green'], in_execution: ['Work in progress', 'blue'],
}
function PStatus({ status }) {
  const t = useT()
  if (!PIPE[status]) return <StatusBadge status={status} />
  return <Badge tone={PIPE[status][1]}>{t(PIPE[status][0])}</Badge>
}

function WhyCard({ id, onChanged, canDecide, inArea }) {
  const t = useT()
  const { data, loading, error, reload } = useAsync(() => api.project(id), [id])
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)
  if (loading) return <Loading height={400} />
  if (error) return <ErrorBox error={error} />
  const p = data, ex = p.explanation, sb = p.score_breakdown || {}, inp = sb.inputs || {}
  const decide = async (decision) => {
    setErr(null)
    try {
      const r = await api.decide(p.id, decision, reason)
      setDone(t('{d} saved. {n} citizens told in their own language.', { d: t(DONE_WORD[decision]), n: r.citizens_notified }))
      reload(); onChanged?.()
    } catch (e) {
      if (e.status === 403) setErr(new Error(t('You can only decide works in your own area.')))
      else if (e.status === 422) setErr(new Error(t('Please write a reason to reject or delay.')))
      else setErr(e)
    }
  }
  const mayDecide = canDecide && inArea(p)
  const facts = [
    inp.effective_households !== undefined && t('{h} families asked for this ({n} reports).', { h: fmt(inp.effective_households), n: fmt(inp.reports) }),
    inp.deficit !== undefined && t('Only {p} of this service exists here.', { p: pct(1 - inp.deficit) }),
    inp.connectivity !== undefined && t('Only {p} of people have phone or internet.', { p: pct(inp.connectivity) }),
    ex?.facts?.some((f) => f.startsWith('No active')) && t('No work is planned here yet.'),
  ].filter(Boolean)
  return (
    <Card title={<>{p.title}</>} sub={<>{p.area}, {t(p.district)}, {t(p.state)}</>} actions={<PStatus status={p.status} />}>
      <div className="grid g-3">
        <div><div className="stat-label">{t('Priority score')}</div><div className="stat-value">{p.score}</div><div className="xs muted">{t('out of 100')}</div></div>
        <div><div className="stat-label">{t('Cost')}</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{money(p.cost_local)}</div></div>
        <div><div className="stat-label">{t('People helped')}</div><div className="stat-value" style={{ fontSize: '1.4rem' }}>{fmt(p.beneficiaries)}</div></div>
      </div>
      <div className="row mt"><SectorTag sector={p.sector} /><Badge tone="blue">{t('Scheme')}: {p.scheme}</Badge>{sb.silent_zone && <Badge tone="violet"><VolumeX size={12} aria-hidden="true" />{t('Silent area')}</Badge>}</div>
      {ex && (
        <>
          <div className="divider" />
          <div className="row-between"><h3 className="row" style={{ margin: 0 }}><Lightbulb size={18} aria-hidden="true" />{t('Why this project?')}</h3>
            <ListenButton text={`${t('Why this project?')} ${facts.join(' ')}`} className="btn" /></div>
          <ul className="small" style={{ paddingLeft: 18 }}>
            {sb.silent_zone && <li style={{ color: 'var(--color-silent)', fontWeight: 600 }}>{t('Silent area: big need, few reports')}</li>}
            {facts.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <div className="stack mt">
            {Object.entries(sb.contributions || {}).map(([k, pts]) => (
              <div key={k} className="small" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 36% 40px', gap: 10, alignItems: 'center' }}><span>{t(DRIVER[k] || k)}</span>
                <span className="ngi-track"><span className="ngi-fill" style={{ display: 'block', width: `${Math.min(100, pts * 3)}%`, background: '#2a78d6' }} /></span><span className="mono" style={{ textAlign: 'right' }}>{pts}</span></div>
            ))}
            {ex.ngi !== undefined && ex.ngi !== null && <div className="xs muted">{t('Score = need level ({n}) counts 3/4, value for money counts 1/4.', { n: ex.ngi })}</div>}
          </div>
          <h3 className="mt">{t('What citizens said')}</h3>
          <div className="stack">
            {ex.evidence.map((q) => (
              <div key={q.tracking_id} className="quote"><div className="orig">{q.original}</div><div className="en">{q.english}</div>
                <div className="xs muted">{t(LANG_NAMES[q.language] || q.language)} · <Link to={`/track/${q.tracking_id}`} className="mono">{q.tracking_id}</Link></div></div>
            ))}
          </div>
        </>
      )}
      {p.decision_reason && <div className="alert alert-info mt"><CheckCircle2 size={16} aria-hidden="true" /><div className="small">{t('Decision note')}: {p.decision_reason}</div></div>}
      {p.source === 'recommended' && !mayDecide && (
        <div className="alert alert-info mt"><Eye size={16} aria-hidden="true" /><div className="small">{canDecide ? t('This work is outside your area. You can only look at it.') : t('Read only. The District Collector decides.')}</div></div>
      )}
      {p.source === 'recommended' && mayDecide && (
        <>
          <div className="divider" />
          <div className="field"><label htmlFor="reason">{t('Reason (needed to reject or delay)')}</label>
            <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('e.g. Joined with PMGSY. Detailed plan to be made.')} /></div>
          <div className="row mt">
            <button className="btn btn-primary" onClick={() => decide('approve')}><CheckCircle2 size={16} aria-hidden="true" />{t('Approve')}</button>
            <button className="btn" onClick={() => decide('defer')}><PauseCircle size={16} aria-hidden="true" />{t('Delay')}</button>
            <button className="btn btn-danger" onClick={() => decide('reject')}><XCircle size={16} aria-hidden="true" />{t('Reject')}</button>
            <button className="btn" onClick={() => decide('start')}><Hammer size={16} aria-hidden="true" />{t('Start work')}</button>
            <button className="btn btn-success" onClick={() => decide('complete')}><Clock size={16} aria-hidden="true" />{t('Mark done')}</button>
          </div>
          <p className="help">{t('AI suggests, people decide. Citizens get a message in their language.')}</p>
          {done && <div className="alert alert-success mt" role="status"><CheckCircle2 size={16} aria-hidden="true" /><div className="small">{done}</div></div>}
          <ErrorBox error={err} />
        </>
      )}
    </Card>
  )
}

function Portfolio({ projects }) {
  const t = useT()
  const bySector = SECTOR_KEYS.map((s) => ({ s, pts: projects.filter((p) => p.sector === s).map((p) => ({ x: p.score_breakdown?.efficiency_pct, y: p.score_breakdown?.ngi, z: p.beneficiaries, title: p.title, area: p.area })) })).filter((g) => g.pts.length)
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, bottom: 18, left: -8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name={t('Value for money')} domain={[0, 100]} fontSize={12} stroke="#94a3b8" tickLine={false} label={{ value: t('Value for money →'), position: 'insideBottom', offset: -10, fontSize: 12, fill: '#475569' }} />
        <YAxis type="number" dataKey="y" name={t('Need level')} domain={[30, 90]} fontSize={12} stroke="#94a3b8" tickLine={false} label={{ value: t('Need level →'), angle: -90, position: 'insideLeft', offset: 20, fontSize: 12, fill: '#475569' }} />
        <ZAxis type="number" dataKey="z" range={[40, 400]} />
        <Tooltip content={({ payload }) => payload?.[0] ? <div className="chart-tip"><strong>{payload[0].payload.title}</strong><div>{t('Need level')} {payload[0].payload.y} · {t('Value for money')} {payload[0].payload.x}</div><div>{t('{n} people helped', { n: fmt(payload[0].payload.z) })}</div></div> : null} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" verticalAlign="top" />
        {bySector.map((g) => <Scatter isAnimationActive={false} key={g.s} name={t(SECTORS[g.s].short)} data={g.pts} fill={SECTORS[g.s].hex} fillOpacity={0.8} stroke="#fff" strokeWidth={1.5} />)}
      </ScatterChart>
    </ResponsiveContainer>
  )
}

function StatePicker({ value, onChange }) {
  const t = useT()
  return (
    <div className="row" role="group" aria-label={t('State')}>
      {['all', ...STATES].map((s) => (
        <button key={s} type="button" className={`btn ${value === s ? 'btn-dark' : ''}`} aria-pressed={value === s} onClick={() => onChange(s)}>{t(s === 'all' ? 'All India' : s)}</button>
      ))}
    </div>
  )
}

function Optimiser({ defaultState, canPick, level }) {
  const t = useT()
  const [state, setState] = useState(defaultState || 'all')
  const [crore, setCrore] = useState(100)
  const [res, setRes] = useState(null)
  useEffect(() => { setState(defaultState || 'all') }, [defaultState])
  useEffect(() => {
    const h = setTimeout(() => api.optimise(state === 'all' ? null : state, crore * CR).then(setRes).catch(() => {}), 250)
    return () => clearTimeout(h)
  }, [state, crore])
  return (
    <div className="grid g-main">
      <Card title="Budget planner" sub="Set your budget. We pick works that help the most people in need.">
        {canPick ? <StatePicker value={state} onChange={setState} /> : <AreaLine place={t('Budget for {p}', { p: t(defaultState) })} />}
        <div className="field mt">
          <div className="row-between"><label htmlFor="budget">{t('Money available')}</label><span className="stat-value" style={{ fontSize: '1.6rem' }}>₹{fmt(crore)} {t('Cr')}</span></div>
          <input id="budget" type="range" min={10} max={500} step={5} value={crore} onChange={(e) => setCrore(Number(e.target.value))}
            aria-valuetext={`₹${crore} ${t('crore')}`} style={{ minHeight: 44 }} />
          <div className="row-between xs muted"><span>₹10 {t('Cr')}</span><span>₹500 {t('Cr')}</span></div>
        </div>
        {res && (
          <>
            <div className="grid g-3 mt">
              <div><div className="stat-label">{t('Works paid for')}</div><div className="stat-value">{res.selected.length}<span className="muted small"> / {res.candidates}</span></div></div>
              <div><div className="stat-label">{t('People helped')}</div><div className="stat-value">{fmt(res.total_beneficiaries)}</div></div>
              <div><div className="stat-label">{t('Money used')}</div><div className="stat-value">{Math.round((res.utilisation || 0) * 100)}%</div></div>
            </div>
            <div className="table-wrap mt"><table className="table">
              <thead><tr><th>{t('Work')}</th><th>{t(level === 'nation' ? 'State' : 'District')}</th><th>{t('Need')}</th><th className="num">{t('Cost')}</th><th className="num">{t('People helped')}</th><th className="num">{t('Score')}</th></tr></thead>
              <tbody>{[...res.projects].sort((a, b) => b.score - a.score).map((p) => (
                <tr key={p.id}><td><strong>{p.title}</strong>{p.score_breakdown?.silent_zone && <> <Badge tone="violet">{t('Silent area')}</Badge></>}</td><td className="small">{t(level === 'nation' ? p.state : p.district)}</td><td><SectorTag sector={p.sector} short /></td>
                  <td className="num">{money(p.cost_local)}</td><td className="num">{fmt(p.beneficiaries)}</td><td className="num">{p.score}</td></tr>))}</tbody>
            </table></div>
          </>
        )}
      </Card>
      <Card title="How it works" sub="Open and easy to check">
        <ul className="small" style={{ paddingLeft: 18 }}>
          <li>{t('Only works suggested by AI and not yet decided are used.')}</li>
          <li>{t('Value = people helped × priority score.')}</li>
          <li>{t('Move the slider. Small, high-need works often come first.')}</li>
          <li>{t('Then approve each work with a note.')}</li>
        </ul>
      </Card>
    </div>
  )
}

function GramSabha({ stateParam, fixedDistrict }) {
  const t = useT()
  const options = useMemo(() => Object.entries(DISTRICTS).filter(([s]) => !stateParam || s === stateParam), [stateParam])
  const first = fixedDistrict || options[0]?.[1]?.[0] || 'Adilabad'
  const [district, setDistrict] = useState(first)
  useEffect(() => { setDistrict(first) }, [first])
  const plan = useAsync(() => api.gramSabha(district), [district])
  const d = plan.data
  const note = t('Discuss in the Gram Sabha, pass a resolution, then upload to the Yuktdhara portal (Viksit Gram Panchayat Plan, VB-GRAMG).')
  return (
    <div className="stack-md">
      <Card title="Gram Sabha plan" sub="A ready list of village works, made from what people asked for."
        actions={<a className="btn btn-primary" href={api.gramSabhaCsv(district)} download><Download size={16} aria-hidden="true" />{t('Download for Gram Sabha (CSV)')}</a>}>
        {fixedDistrict ? <AreaLine place={t(fixedDistrict)} /> : (
          <div className="row">
            <label className="row small" htmlFor="gs-district"><span className="muted">{t('District')}</span></label>
            <select id="gs-district" className="select" style={{ width: 'auto', minHeight: 44 }} value={district} onChange={(e) => setDistrict(e.target.value)}>
              {options.map(([s, ds]) => <optgroup key={s} label={t(s)}>{ds.map((x) => <option key={x} value={x}>{t(x)}</option>)}</optgroup>)}
            </select>
          </div>
        )}
        <div className="alert alert-info mt"><Landmark size={18} aria-hidden="true" /><div className="small" style={{ flex: 1 }}>{note}</div><ListenButton text={note} className="btn" /></div>
      </Card>
      {plan.loading ? <Loading height={300} /> : plan.error ? <ErrorBox error={plan.error} /> : d && (
        <>
          <div className="grid g-3">
            <Stat tone="blue" icon={Hammer} label="Works in the plan" value={fmt(d.items.length)} />
            <Stat tone="amber" icon={Wallet} label="Total cost" value={money(d.total_cost_inr)} />
            <Stat tone="blue" icon={Droplets} label="Share for water" value={pct(d.water_share)} note="Drinking water works" />
          </div>
          {d.items.length === 0 ? <Card><p className="muted">{t('No works for this district yet.')}</p></Card> : (
            <div className="stack">
              {d.items.map((it) => (
                <div key={it.priority} className="card" style={{ display: 'grid', gridTemplateColumns: '48px minmax(0,1fr)', gap: 14 }}>
                  <div className="icon-tile tone-blue" style={{ fontWeight: 700, fontSize: '1.2rem' }} aria-label={t('Priority {n}', { n: it.priority })}>{it.priority}</div>
                  <div className="stack" style={{ gap: 8 }}>
                    <div className="row-between" style={{ alignItems: 'flex-start' }}>
                      <div><strong style={{ fontSize: '1.05rem' }}>{it.work}</strong><div className="small muted">{it.area}</div></div>
                      <div className="row" style={{ gap: 6 }}>
                        <SectorTag sector={it.sector_key} short />
                        {it.silent_zone && <Badge tone="violet"><VolumeX size={12} aria-hidden="true" />{t('Silent area')}</Badge>}
                        <PStatus status={it.status} />
                      </div>
                    </div>
                    <div className="row small" style={{ gap: 16 }}>
                      <span><Wallet size={14} aria-hidden="true" /> <strong>{money(it.estimated_cost_inr)}</strong></span>
                      <span><Users size={14} aria-hidden="true" /> {t('{n} families asked', { n: fmt(it.households_asked) })}</span>
                      <span className="muted">{t('Scheme')}: {it.scheme}</span>
                    </div>
                    {it.evidence_original?.[0] && (
                      <div className="quote"><div className="orig">“{it.evidence_original[0].text}”</div>
                        <div className="xs muted">{t(LANG_NAMES[it.evidence_original[0].language] || it.evidence_original[0].language)}</div></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WorkList({ rows, selected, onPick, level, t }) {
  return (
    <div className="table-wrap" style={{ maxHeight: 720, overflowY: 'auto' }}><table className="table">
      <thead><tr><th>{t('Work')}</th><th>{t('Score')}</th><th className="num">{t('Cost')}</th><th>{t('Status')}</th></tr></thead>
      <tbody>{rows.map((p) => (
        <tr key={p.id} className="clickable" onClick={() => onPick(p.id)} style={{ background: selected === p.id ? 'var(--color-accent-soft)' : undefined }}>
          <td><div className="row" style={{ gap: 6 }}><SectorTag sector={p.sector} short />{p.score_breakdown?.silent_zone && <Badge tone="violet"><VolumeX size={12} aria-hidden="true" />{t('Silent area')}</Badge>}</div>
            <button className="btn-ghost" style={{ border: 0, padding: '4px 0', minHeight: 32, textAlign: 'left', cursor: 'pointer', fontWeight: 600, background: 'none' }} onClick={() => onPick(p.id)}>{p.title}</button>
            <div className="xs muted">{level === 'nation' ? <>{t(p.district)}, {t(p.state)}</> : <>{p.area}, {t(p.district)}</>}</div></td>
          <td style={{ minWidth: 110 }}><NgiBar value={p.score} /></td>
          <td className="num">{money(p.cost_local)}</td><td><PStatus status={p.status} /></td>
        </tr>))}</tbody>
    </table></div>
  )
}

export default function Projects() {
  const { level, role, user, state, district: fixedDistrict, stateName } = useLevel()
  const t = useT()
  const [sp, setSp] = useSearchParams()
  const canDecide = can(role, 'decide'), canGS = can(role, 'gramSabha'), canBudget = can(role, 'budget'), canPick = can(role, 'pickState')
  const isDept = level === 'dept'
  const allowed = isDept ? ['recommended', 'proposals']
    : ['recommended', canBudget && 'optimiser', canBudget && 'misaligned', canGS && 'gramsabha', 'plans'].filter(Boolean)
  const want = sp.get('tab') || 'recommended'
  const [tab, setTab] = useState(allowed.includes(want) ? want : 'recommended')
  const [selected, setSelected] = useState(sp.get('id') ? Number(sp.get('id')) : null)
  const [sector, setSector] = useState('all')
  const [pickedDistrict, setPickedDistrict] = useState('all') // state officers: one district of their state
  const district = level === 'state' ? (pickedDistrict === 'all' ? undefined : pickedDistrict) : fixedDistrict
  const inDistrict = (p) => !district || p.district === district
  // Officers are scoped by the server; sending `state` as well makes /api/projects fail, so only national roles send it.
  const pState = level === 'nation' ? state : undefined
  const recs = useAsync(() => api.projects({ source: 'recommended', state: pState, sector }), [pState, sector])
  const plans = useAsync(() => (isDept ? Promise.resolve([]) : api.projects({ source: 'plan', state: pState })), [pState, isDept])
  const al = useAsync(() => (canBudget ? api.alignment(state) : Promise.resolve({})), [state, canBudget])
  const [regen, setRegen] = useState(false)
  const allRecs = useMemo(() => (recs.data || []).filter(inDistrict), [recs.data, district]) // eslint-disable-line react-hooks/exhaustive-deps
  const proposals = useMemo(() => allRecs.filter((p) => p.status === 'proposed'), [allRecs])
  const works = isDept ? allRecs.filter((p) => p.status !== 'proposed') : allRecs
  const listRows = tab === 'proposals' ? proposals : works
  useEffect(() => { if (listRows.length && !listRows.some((p) => p.id === selected)) setSelected(listRows[0].id) }, [listRows, selected])
  const change = (v) => { setTab(v); setSp({ tab: v }) }
  const misaligned = useMemo(() => Object.entries(al.data || {}).map(([st, v]) => [st, { ...v, misaligned_projects: (v.misaligned_projects || []).filter(inDistrict) }]), [al.data, district]) // eslint-disable-line react-hooks/exhaustive-deps
  const misCount = misaligned.reduce((s, [, v]) => s + v.misaligned_projects.length, 0)
  const areaPlans = (plans.data || []).filter(inDistrict)
  const place = placeName(t, { state, district })
  // A Collector decides only in their district; a State officer only in their state.
  const inArea = (p) => (level === 'district' ? p.district === user?.district : level === 'state' ? p.state === user?.state : true)

  const regenerate = async () => { setRegen(true); try { await api.regenerate(); recs.reload() } finally { setRegen(false) } }
  const steps = isDept ? ['See works for your department', 'Open one to see why', 'The District Collector decides']
    : level === 'district' ? ['See works the AI suggests', 'Approve, delay or reject', 'Make the Gram Sabha plan']
      : ['See works the AI suggests', 'Try the budget planner', 'Approve: citizens get a message']

  return (
    <div className="stack-md">
      <PageHead title="Projects & budget" eyebrow="Official workspace" steps={steps}
        actions={canPick ? <button className="btn" onClick={regenerate} disabled={regen}><RefreshCw size={16} aria-hidden="true" />{regen ? t('Updating…') : t('Refresh suggestions')}</button> : null}>
        {isDept ? 'Works for your department. Read only.' : 'What to build first, how much it costs, and why.'}
      </PageHead>
      <div className="row-between" style={{ gap: 10 }}>
        <AreaLine place={place} />
        {level === 'state' && (
          <label className="row small"><span className="muted">{t('District')}</span>
            <select className="select" style={{ width: 'auto', minHeight: 44 }} value={pickedDistrict} onChange={(e) => setPickedDistrict(e.target.value)}>
              <option value="all">{t('Whole state')}</option>{(DISTRICTS[state] || []).map((d) => <option key={d} value={d}>{t(d)}</option>)}
            </select></label>
        )}
      </div>
      {isDept && <div className="alert alert-info"><Eye size={18} aria-hidden="true" /><div className="small"><strong>{t('The District Collector decides.')}</strong> {t('You can see the works and your proposals here.')}</div></div>}
      <Tabs value={tab} onChange={change} tabs={[
        { value: 'recommended', label: <>{t(isDept ? 'Works for your department ({n})' : 'Suggested by AI ({n})', { n: recs.data ? works.length : '…' })}</> },
        isDept && { value: 'proposals', label: <>{t('Your proposals ({n})', { n: proposals.length })}</> },
        canBudget && { value: 'optimiser', label: 'Budget planner' },
        canBudget && { value: 'misaligned', label: <>{t('Money in low-need places ({n})', { n: misCount })}</> },
        canGS && { value: 'gramsabha', label: 'Gram Sabha plan' },
        !isDept && { value: 'plans', label: 'Existing plans' },
      ].filter(Boolean)} />
      {(tab === 'recommended' || tab === 'proposals') && (
        <>
          {tab === 'recommended' && works.length > 0 && (
            <Card title="All suggestions at a glance" sub="Top right = high need and good value. Bigger dot = more people helped.">
              <Portfolio projects={works} />
            </Card>
          )}
          <div className="grid g-2" style={{ alignItems: 'start' }}>
            <Card title={tab === 'proposals' ? 'Your proposals' : 'Best works first'} actions={
              <select className="select" style={{ width: 'auto', minHeight: 44 }} value={sector} onChange={(e) => setSector(e.target.value)} aria-label={t('Type of need')}>
                <option value="all">{t('All needs')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}</select>}>
              {recs.loading ? <Loading height={400} /> : listRows.length === 0
                ? <p className="muted small">{t(tab === 'proposals' ? 'No proposals yet.' : 'No works here yet.')}</p>
                : <WorkList rows={listRows} selected={selected} onPick={setSelected} level={level} t={t} />}
            </Card>
            {selected && listRows.some((p) => p.id === selected)
              ? <WhyCard key={selected} id={selected} onChanged={recs.reload} canDecide={canDecide} inArea={inArea} />
              : <Card><p className="muted">{t('Pick a work to see why.')}</p></Card>}
          </div>
        </>
      )}
      {tab === 'optimiser' && canBudget && <Optimiser defaultState={canPick ? stateName : state} canPick={canPick} level={level} />}
      {tab === 'misaligned' && canBudget && (
        <div className="stack-md">
          <div className="alert alert-warn"><AlertTriangle size={18} aria-hidden="true" />
            <div className="small">{t('This planned money goes to places with lower need than the India middle level. Think about moving it.')}</div></div>
          {al.loading ? <Loading height={300} /> : misaligned.map(([st, v]) => (
            <Card key={st} title={<>{t(st)}</>} sub={<>{t('{m} of {total} goes to low-need places', { m: money(v.plan_budget_local * v.share_to_below_median_need), total: money(v.plan_budget_local) })}</>}
              actions={<Badge tone={v.alignment_score < 50 ? 'red' : 'green'}>{t('{p}% to high need', { p: Math.round(v.alignment_score) })}</Badge>}>
              {v.misaligned_projects.length === 0 ? <p className="small muted">{t('All planned money here goes to high-need places.')}</p> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>{t('Planned work')}</th><th>{t('Place')}</th><th>{t('Need')}</th><th className="num">{t('Cost')}</th><th>{t('Need there')}</th><th className="num">{t('India middle level')}</th><th>{t('Status')}</th></tr></thead>
                  <tbody>{v.misaligned_projects.map((p) => (
                    <tr key={p.code}><td><strong>{p.title}</strong><div className="xs muted mono">{p.code}</div></td><td>{p.area}<div className="xs muted">{t(p.district)}</div></td><td><SectorTag sector={p.sector} short /></td>
                      <td className="num">{money(p.cost_local)}</td><td style={{ minWidth: 140 }}><NgiBar value={p.need_ngi} /></td><td className="num">{p.national_median_ngi}</td><td><PStatus status={p.status} /></td></tr>))}</tbody>
                </table></div>
              )}
            </Card>
          ))}
        </div>
      )}
      {tab === 'gramsabha' && canGS && <GramSabha stateParam={state} fixedDistrict={level === 'district' ? user?.district : undefined} />}
      {tab === 'plans' && !isDept && (
        <Card title="Existing public works plans" sub="From eGramSwaraj, Yuktdhara and state plans">
          {plans.loading ? <Loading /> : areaPlans.length === 0 ? <p className="muted small">{t('No works here yet.')}</p> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>{t('Code')}</th><th>{t('Work')}</th><th>{t('Place')}</th><th>{t('Need')}</th><th className="num">{t('Cost')}</th><th className="num">{t('People helped')}</th><th>{t('Status')}</th></tr></thead>
              <tbody>{areaPlans.map((p) => (
                <tr key={p.id}><td className="mono xs">{p.code}</td><td><strong>{p.title}</strong><div className="xs muted">{p.scheme}</div></td><td>{p.area}<div className="xs muted">{t(level === 'nation' ? p.state : p.district)}</div></td><td><SectorTag sector={p.sector} short /></td>
                  <td className="num">{money(p.cost_local)}</td><td className="num">{fmt(p.beneficiaries)}</td><td><PStatus status={p.status} /></td></tr>))}</tbody>
            </table></div>
          )}
        </Card>
      )}
    </div>
  )
}
