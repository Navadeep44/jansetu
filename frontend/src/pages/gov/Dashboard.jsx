import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertOctagon, Ear, Globe2, HandCoins, Languages, Layers, Siren, Users, VolumeX } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import DemandMap, { COUNTRY_REGION, MapLegend, REGIONS } from '../../components/map/DemandMap'
import { HBar, TrendChart } from '../../components/charts/Charts'
import { Badge, Card, ColorGuide, ErrorBox, Loading, NgiBar, PageHead, SectorTag, Seg, Stat } from '../../components/ui'
import { CHANNEL_LABEL, COUNTRIES, SECTORS, SECTOR_KEYS, fmt, pct, usd } from '../../lib/format'

export default function Dashboard() {
  const { countryParam, country, t } = useApp()
  const [layer, setLayer] = useState('ngi')
  const [sector, setSector] = useState('all')
  const [region, setRegion] = useState(COUNTRY_REGION[country] || 'all')
  const [selected, setSelected] = useState(null)
  const ov = useAsync(() => api.overview(countryParam), [countryParam])
  const areas = useAsync(() => api.mapAreas({ sector, country: countryParam }), [sector, countryParam])
  const trend = useAsync(() => api.trends({ country: countryParam, weeks: 16 }), [countryParam])
  const alerts = useAsync(() => api.alerts(countryParam), [countryParam])
  const plans = useAsync(() => api.projects({ source: 'plan', country: countryParam }), [countryParam])
  const top = useAsync(() => api.needGap({ country: countryParam, sector, limit: 8 }), [countryParam, sector])
  const o = ov.data

  const alignment = o?.alignment ? Object.entries(o.alignment) : []
  const channels = o?.channels ? Object.entries(o.channels).map(([k, v]) => ({ name: CHANNEL_LABEL[k] || k, value: v })).sort((a, b) => b.value - a.value) : []

  return (
    <div className="stack-md">
      <PageHead title={t('dashboard_title', 'Dashboard')}
        actions={<Link to="/ask" className="btn btn-primary">{t('ask_title', 'Ask a question')}</Link>}>
        {t('dashboard_subtitle', 'Where people need what, and where nobody is listening.')}
      </PageHead>
      <ErrorBox error={ov.error} />
      <div className="grid g-4">
        {o ? <>
          <Stat tone="blue" icon={Ear} label={t('nav_report', 'Reports')} value={fmt(o.total_requests)} note={`from ${fmt(o.unique_households)} families`} />
          <Stat tone="blue" icon={Layers} label={t('stat_grouped_needs', 'Grouped needs')} value={fmt(o.clusters)} note={`${fmt(o.recommended_projects)} projects suggested`} />
          <Stat tone="violet" icon={VolumeX} label={t('stat_silent_areas', 'Silent areas')} value={fmt(o.silent_zones)} note="High need, few voices" />
          <Stat tone="green" icon={Languages} label={t('stat_languages_heard', 'Languages heard')} value={fmt(o.languages)} note={`${pct(o.voice_share)} by voice`} />
        </> : [1, 2, 3, 4].map((i) => <Loading key={i} height={110} />)}
      </div>

      <div className="grid g-main">
        <Card title={t('needs_map', 'Needs map')} sub="Click a circle for details. Bigger circle = more people."
          actions={<Seg label={t('map_layer', 'Map layer')} value={layer} onChange={setLayer} options={[
            { value: 'ngi', label: t('layer_ngi', 'Need level') }, { value: 'hotspot', label: t('layer_hotspots', 'Hotspots') }, { value: 'silent', label: t('layer_silent', 'Silent areas') }, { value: 'plans', label: t('layer_plans', 'Planned money') }]} />}>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="row small"><span className="muted">{t('category', 'Sector')}</span>
              <select className="select" style={{ minHeight: 36, width: 'auto' }} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="all">{t('all_sectors', 'All sectors')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
              </select></label>
            <label className="row small"><span className="muted">{t('zoom_to', 'Zoom to')}</span>
              <select className="select" style={{ minHeight: 36, width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value)}>
                {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select></label>
          </div>
          {areas.data ? <DemandMap areas={areas.data} layer={layer} region={region} sector={sector} onSelect={setSelected} plans={plans.data || []} tall /> : <Loading height={560} />}
          <div className="mt"><MapLegend layer={layer} /></div>
          <div className="mt"><ColorGuide compact /></div>
        </Card>

        <div className="stack-md">
          {selected && (
            <Card title={selected.area} sub={`${selected.district}, ${selected.state} · ${COUNTRIES[selected.country]}`}
              actions={<button className="btn btn-sm" onClick={() => setSelected(null)}>{t('close', 'Close')}</button>}>
              <dl className="kv">
                <dt>Population</dt><dd className="mono">{fmt(selected.population)}</dd>
                <dt>Vulnerability</dt><dd className="mono">{Math.round(selected.vulnerability * 100)} / 100</dd>
                <dt>Phone / internet access</dt><dd className="mono">{pct(selected.connectivity)}</dd>
                <dt>{t('nav_report', 'Reports')}</dt><dd className="mono">{fmt(selected.reports)}</dd>
                <dt>Hotspot</dt><dd>{selected.hotspot.class.startsWith('hot') ? <Badge tone="red">Yes</Badge> : 'No'}</dd>
              </dl>
              {selected.silent_zone && <div className="alert alert-violet mt"><VolumeX size={16} aria-hidden="true" /><div className="small">Silent area for {selected.silent_sectors.map((s) => SECTORS[s].short).join(', ')}.</div></div>}
              <div className="stack mt">
                {SECTOR_KEYS.map((s) => (
                  <div key={s} className="row-between"><SectorTag sector={s} short /><div style={{ width: '55%' }}><NgiBar value={selected.sectors[s]?.ngi} /></div></div>
                ))}
              </div>
            </Card>
          )}
          <Card title={t('early_warnings', 'Early warnings')} sub="Sudden jumps in reports this week">
            {alerts.loading ? <Loading /> : alerts.data?.length ? (
              <div className="stack">
                {alerts.data.slice(0, 5).map((a) => (
                  <div key={`${a.area_id}-${a.sector}`} className={`alert ${a.severity === 'critical' ? 'alert-danger' : 'alert-warn'}`}>
                    <Siren size={18} aria-hidden="true" />
                    <div className="small"><strong>{a.area}</strong> · <SectorTag sector={a.sector} short /><div>{a.message}</div>
                      <div className="xs">{a.last_week} reports this week (normally {a.baseline_weekly_mean})</div></div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">No unusual spikes this week.</p>}
          </Card>
          <Card title={t('money_alignment', 'Is money going to the right places?')} sub="Share of planned money going to high-need areas">
            {alignment.map(([c, a]) => (
              <div key={c} className="stack" style={{ marginBottom: 12 }}>
                <div className="row-between small"><strong>{COUNTRIES[c]}</strong><span className="mono">{a.alignment_score}% on target</span></div>
                <div className="ngi-track" style={{ height: 10 }} role="meter" aria-valuenow={a.alignment_score} aria-valuemin={0} aria-valuemax={100} aria-label={`${COUNTRIES[c]} alignment`}>
                  <div className="ngi-fill" style={{ width: `${a.alignment_score}%`, background: a.alignment_score < 60 ? '#dc2626' : '#15803d' }} />
                </div>
                <div className="xs muted">{Math.round(a.share_to_below_median_need * 100)}% goes to low-need areas</div>
              </div>
            ))}
            <Link to="/projects?tab=misaligned" className="btn btn-sm"><HandCoins size={16} aria-hidden="true" />See where</Link>
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

      <Card title={t('priorities_title', 'Places that need help most')} actions={<Link to="/priorities" className="btn btn-sm">{t('tab_ranking', 'Full ranking')}</Link>}>
        {top.data ? (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>{t('th_area', 'Area')}</th><th>{t('country', 'Country')}</th><th>{t('th_sector', 'Sector')}</th><th className="num">{t('th_families', 'Households')}</th><th className="num">{t('th_missing', 'Deficit')}</th><th>{t('th_need_level', 'Need level')}</th><th /></tr></thead>
            <tbody>{(top.data?.items || []).map((r) => (
              <tr key={`${r.area_id}-${r.sector}`}><td><strong>{r.area}</strong><div className="xs muted">{r.district}</div></td><td>{r.country}</td>
                <td><SectorTag sector={r.sector} short /></td><td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td>
                <td style={{ minWidth: 160 }}><NgiBar value={r.ngi} /></td><td>{r.silent_zone && <Badge tone="violet">silent</Badge>}{r.covered ? <Badge tone="blue">planned</Badge> : null}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <Loading />}
      </Card>
    </div>
  )
}
