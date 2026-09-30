import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ear, HandCoins, Languages, Layers, MapPinned, MessageSquareText, Siren, VolumeX } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import DemandMap, { MapLegend, REGIONS, STATE_REGION } from '../../components/map/DemandMap'
import { HBar, TrendChart } from '../../components/charts/Charts'
import { Badge, Card, ColorGuide, ErrorBox, ListenButton, Loading, NgiBar, PageHead, SectorTag, Seg, Stat } from '../../components/ui'
import { CHANNEL_LABEL, SECTORS, SECTOR_KEYS, fmt, money, ngiColor, pct } from '../../lib/format'

// Need score (0-100) in plain words + colour. Words live in dict/core.js.
export const needWord = (v) => (v >= 75 ? 'Very high' : v >= 62 ? 'High' : v >= 50 ? 'Medium' : v >= 38 ? 'Some' : 'Low')
const needTone = (v) => (v >= 62 ? 'red' : v >= 50 ? 'amber' : 'green')

function StateCard({ s, active, onPick, t }) {
  const Icon = (SECTORS[s.top_sector] || SECTORS.other).Icon
  const share = Math.round(s.alignment_score || 0)
  return (
    <button type="button" className="card role-card" onClick={() => onPick(s.state)} aria-pressed={active}
      style={{ textAlign: 'left', font: 'inherit', borderColor: active ? 'var(--color-accent)' : undefined, boxShadow: active ? '0 0 0 3px var(--color-accent-soft)' : undefined, minHeight: 44 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>{t(s.state)}</h3>
          <div className="xs muted">{s.districts.map((d) => t(d)).join(', ')}</div>
        </div>
        <Badge tone={needTone(s.avg_ngi)}><i aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: ngiColor(s.avg_ngi), marginRight: 4 }} />{t('Need')}: {t(needWord(s.avg_ngi))}</Badge>
      </div>
      <div className="row small" style={{ gap: 14 }}>
        <span><strong className="mono">{fmt(s.reports)}</strong> {t('reports')}</span>
        <span style={{ color: '#6d28d9' }}><VolumeX size={14} aria-hidden="true" /> <strong className="mono">{fmt(s.silent_zones)}</strong> {t('silent areas')}</span>
      </div>
      <div className="row small" style={{ gap: 8 }}>
        <span className="icon-tile" style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9' }}><Icon size={18} color={SECTORS[s.top_sector]?.hex} aria-hidden="true" /></span>
        <span>{t('Top need')}: <strong>{t(SECTORS[s.top_sector]?.label || 'Other')}</strong></span>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <div className="row-between xs" style={{ flexWrap: 'nowrap', gap: 8 }}><span className="muted">{t('Planned money going to high-need places')}</span><strong className="mono" style={{ whiteSpace: 'nowrap' }}>{share}% · {money(s.plan_budget)}</strong></div>
        <div className="ngi-track" style={{ height: 8, flex: 'none' }} role="meter" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label={t('Planned money going to high-need places')}>
          <div className="ngi-fill" style={{ width: `${share}%`, background: share < 50 ? '#dc2626' : '#15803d' }} />
        </div>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const { stateParam, stateName, setStateName } = useApp()
  const t = useT()
  const [layer, setLayer] = useState('ngi')
  const [sector, setSector] = useState('all')
  const [region, setRegion] = useState(STATE_REGION[stateName] || 'all')
  const [selected, setSelected] = useState(null)
  useEffect(() => { setRegion(STATE_REGION[stateName] || 'all'); setSelected(null) }, [stateName])
  const ov = useAsync(() => api.overview(stateParam), [stateParam])
  const states = useAsync(() => api.states(), [])
  const areas = useAsync(() => api.mapAreas({ sector, state: stateParam }), [sector, stateParam])
  const trend = useAsync(() => api.trends({ state: stateParam, weeks: 16 }), [stateParam])
  const alerts = useAsync(() => api.alerts(stateParam), [stateParam])
  const plans = useAsync(() => api.projects({ source: 'plan', state: stateParam }), [stateParam])
  const top = useAsync(() => api.needGap({ state: stateParam, sector, limit: 8 }), [stateParam, sector])
  const o = ov.data

  const alignment = o?.alignment ? Object.entries(o.alignment) : []
  const lowMoney = alignment.reduce((s, [, a]) => s + (a.plan_budget || 0) * (a.share_to_below_median_need || 0), 0)
  const channels = o ? Object.entries(o.channels).map(([k, v]) => ({ name: CHANNEL_LABEL[k] || k, value: v })).sort((a, b) => b.value - a.value) : []
  const nat = o?.alignment_national
  const place = stateParam ? t(stateParam) : t('All India')
  const summary = o ? t('{a} early warnings · {s} silent areas · {m} planned in low-need places', { a: fmt(o.alerts), s: fmt(o.silent_areas), m: money(lowMoney) }) : ''
  const pick = (s) => { setStateName(s === stateName ? 'all' : s); window.scrollTo?.({ top: 0, behavior: 'smooth' }) }
  const sortedStates = useMemo(() => (states.data ? [...states.data].sort((a, b) => b.avg_ngi - a.avg_ngi) : []), [states.data])

  return (
    <div className="stack-md">
      <PageHead title="Dashboard" eyebrow="Official workspace" steps={['Tap a state to look closer', 'Click a circle on the map', 'Check warnings and money']}
        actions={<Link to="/ask" className="btn btn-primary"><MessageSquareText size={16} aria-hidden="true" />{t('Ask a question')}</Link>}>
        Where people need what, and where nobody is listening.
      </PageHead>
      <ErrorBox error={ov.error} />

      <div className="card row-between" style={{ gap: 12, flexWrap: 'wrap' }} aria-live="polite">
        <div className="row" style={{ gap: 10 }}>
          <span className="icon-tile tone-blue"><MapPinned size={20} aria-hidden="true" /></span>
          <div>
            <div className="xs muted">{place}</div>
            <strong style={{ fontSize: '1.05rem' }}>{summary || t('Loading')}</strong>
          </div>
        </div>
        <div className="row">
          {summary && <ListenButton text={`${place}. ${summary}`} className="btn" />}
          {stateParam && <button type="button" className="btn btn-dark" onClick={() => setStateName('all')}><ArrowLeft size={16} aria-hidden="true" />{t('Back to All India')}</button>}
        </div>
      </div>

      <Card title="India at a glance" sub="One card per state. Tap a card to see only that state.">
        {states.loading ? <Loading height={200} /> : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
            {sortedStates.map((s) => <StateCard key={s.state} s={s} active={stateName === s.state} onPick={pick} t={t} />)}
          </div>
        )}
      </Card>

      <div className="grid g-4">
        {o ? <>
          <Stat tone="blue" icon={Ear} label="Reports" value={fmt(o.total_requests)} note={<>{t('from {n} families', { n: fmt(o.unique_households) })}</>} />
          <Stat tone="blue" icon={Layers} label="Grouped needs" value={fmt(o.clusters)} note={<>{t('{n} projects suggested', { n: fmt(o.recommended_projects) })}</>} />
          <Stat tone="violet" icon={VolumeX} label="Silent areas" value={fmt(o.silent_areas)} note="High need, few voices" />
          <Stat tone="green" icon={Languages} label="Languages heard" value={fmt(o.languages)} note={<>{t('{p} by voice', { p: pct(o.voice_share) })}</>} />
        </> : [1, 2, 3, 4].map((i) => <Loading key={i} height={110} />)}
      </div>

      <div className="grid g-main">
        <Card title="Needs map" sub="Click a circle for details. Bigger circle = more people."
          actions={<Seg label={t('Map layer')} value={layer} onChange={setLayer} options={[
            { value: 'ngi', label: 'Need level' }, { value: 'hotspot', label: 'Hotspots' }, { value: 'silent', label: 'Silent areas' }, { value: 'plans', label: 'Planned money' }]} />}>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="row small"><span className="muted">{t('Type of need')}</span>
              <select className="select" style={{ minHeight: 44, width: 'auto' }} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="all">{t('All needs')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}
              </select></label>
            <label className="row small"><span className="muted">{t('Zoom to')}</span>
              <select className="select" style={{ minHeight: 44, width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value)}>
                {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{t(r.label)}</option>)}
              </select></label>
          </div>
          {areas.data ? <DemandMap areas={areas.data} layer={layer} region={region} sector={sector} onSelect={setSelected} plans={plans.data || []} tall /> : <Loading height={560} />}
          <div className="mt"><MapLegend layer={layer} /></div>
          <div className="mt"><ColorGuide compact /></div>
        </Card>

        <div className="stack-md">
          {selected && (
            <Card title={<>{selected.area}</>} sub={<>{t(selected.district)}, {t(selected.state)}</>}
              actions={<button className="btn" onClick={() => setSelected(null)}>{t('Close')}</button>}>
              <dl className="kv">
                <dt>{t('People')}</dt><dd className="mono">{fmt(selected.population)}</dd>
                <dt>{t('How poor or at risk')}</dt><dd className="mono">{Math.round(selected.vulnerability * 100)} / 100</dd>
                <dt>{t('Phone / internet access')}</dt><dd className="mono">{pct(selected.connectivity)}</dd>
                <dt>{t('Reports')}</dt><dd className="mono">{fmt(selected.reports)}</dd>
                <dt>{t('Hotspot')}</dt><dd>{selected.hotspot?.class?.startsWith('hot') ? <Badge tone="red">{t('Yes')}</Badge> : t('No')}</dd>
              </dl>
              {selected.silent_zone && <div className="alert alert-violet mt"><VolumeX size={16} aria-hidden="true" /><div className="small">{t('Silent area for {list}.', { list: selected.silent_sectors.map((s) => t(SECTORS[s].short)).join(', ') })}</div></div>}
              <div className="stack mt">
                {SECTOR_KEYS.map((s) => (
                  <div key={s} className="row-between"><SectorTag sector={s} short /><div style={{ width: '55%' }}><NgiBar value={selected.sectors[s]?.ngi} /></div></div>
                ))}
              </div>
            </Card>
          )}
          <Card title="Early warnings" sub="Sudden jumps in reports this week">
            {alerts.loading ? <Loading /> : alerts.data?.length ? (
              <div className="stack">
                {alerts.data.slice(0, 5).map((a) => (
                  <div key={`${a.area_id}-${a.sector}`} className={`alert ${a.severity === 'critical' ? 'alert-danger' : 'alert-warn'}`}>
                    <Siren size={18} aria-hidden="true" />
                    <div className="small"><strong>{a.area}</strong> · <span className="muted">{t(a.state)}</span><div><SectorTag sector={a.sector} short /></div>
                      <div>{t('{n} reports this week. Normally {b}.', { n: a.last_week, b: a.baseline_weekly_mean })}</div>
                      {a.severity === 'critical' && <Badge tone="red">{t('Very urgent')}</Badge>}</div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">{t('No sudden jumps this week.')}</p>}
          </Card>
          <Card title="Is money going to the right places?" sub="Share of planned money going to high-need places">
            {nat && !stateParam && (
              <div className="stack" style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                <div className="row-between"><strong>{t('All India')}</strong><span className="mono" style={{ fontWeight: 700 }}>{Math.round(nat.alignment_score)}%</span></div>
                <div className="ngi-track" style={{ height: 12, flex: 'none' }} role="meter" aria-valuenow={nat.alignment_score} aria-valuemin={0} aria-valuemax={100} aria-label={t('All India')}>
                  <div className="ngi-fill" style={{ width: `${nat.alignment_score}%`, background: nat.alignment_score < 50 ? '#dc2626' : '#15803d' }} />
                </div>
                <div className="xs muted">{t('{m} of {total} goes to low-need places', { m: money(nat.plan_budget * nat.share_to_below_median_need), total: money(nat.plan_budget) })}</div>
              </div>
            )}
            {alignment.map(([c, a]) => (
              <div key={c} className="stack" style={{ marginBottom: 12 }}>
                <div className="row-between small"><strong>{t(c)}</strong><span className="mono">{t('{p}% to high need', { p: Math.round(a.alignment_score) })}</span></div>
                <div className="ngi-track" style={{ height: 10, flex: 'none' }} role="meter" aria-valuenow={a.alignment_score} aria-valuemin={0} aria-valuemax={100} aria-label={t(c)}>
                  <div className="ngi-fill" style={{ width: `${a.alignment_score}%`, background: a.alignment_score < 50 ? '#dc2626' : '#15803d' }} />
                </div>
                <div className="xs muted">{t('{m} of {total} goes to low-need places', { m: money((a.plan_budget || 0) * a.share_to_below_median_need), total: money(a.plan_budget) })}</div>
              </div>
            ))}
            <Link to="/projects?tab=misaligned" className="btn"><HandCoins size={16} aria-hidden="true" />{t('See where')}</Link>
          </Card>
        </div>
      </div>

      <div className="grid g-main">
        <Card title="Reports per week" sub="Last 16 weeks, by type of problem">
          {trend.data ? <TrendChart data={trend.data} /> : <Loading height={260} />}
        </Card>
        <Card title="How people reached us">
          {channels.length ? <HBar data={channels} dataKey="value" color="#2a78d6" format={(v) => fmt(v)} /> : <Loading />}
        </Card>
      </div>

      <Card title="Places that need help most" actions={<Link to="/priorities" className="btn">{t('Full list')}</Link>}>
        {top.data ? (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>{t('Place')}</th><th>{t('State')}</th><th>{t('Need')}</th><th className="num">{t('Families who asked')}</th><th className="num">{t('Missing')}</th><th>{t('Need level')}</th><th /></tr></thead>
            <tbody>{top.data.items.map((r) => (
              <tr key={`${r.area_id}-${r.sector}`}><td><strong>{r.area}</strong><div className="xs muted">{t(r.district)}</div></td><td>{t(r.state)}</td>
                <td><SectorTag sector={r.sector} short /></td><td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td>
                <td style={{ minWidth: 160 }}><NgiBar value={r.ngi} /><div className="xs muted">{t(needWord(r.ngi))}</div></td>
                <td>{r.silent_zone && <Badge tone="violet">{t('Silent area')}</Badge>} {r.covered ? <Badge tone="blue">{t('Planned')}</Badge> : null}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <Loading />}
      </Card>
    </div>
  )
}
