import { useEffect, useState } from 'react'
import { Download, RotateCcw, VolumeX } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, NgiBar, PageHead, SectorTag, Tabs } from '../../components/ui'
import { SECTORS, SECTOR_KEYS, fmt, pct } from '../../lib/format'

const DEFAULTS = { demand: 0.3, deficit: 0.3, vulnerability: 0.2, severity: 0.2, coverage: 0.5 }
const LABELS = {
  demand: ['How many people asked', 'Adjusted so places with few phones are not ignored'],
  deficit: ['What is missing on the ground', 'From village / ward infrastructure data'],
  vulnerability: ['How vulnerable people are', 'Poverty, marginalised groups, disaster risk'],
  severity: ['How serious it is', 'Risk to life counts more than inconvenience'],
  coverage: ['Already planned?', 'Lower priority if a project is already sanctioned'],
}

export default function Priorities() {
  const { countryParam, t } = useApp()
  const [tab, setTab] = useState('ngi')
  const [w, setW] = useState(DEFAULTS)
  const [dw, setDw] = useState(DEFAULTS)
  const [sector, setSector] = useState('all')
  useEffect(() => { const h = setTimeout(() => setDw(w), 250); return () => clearTimeout(h) }, [w])
  const ng = useAsync(() => api.needGap({ country: countryParam, sector, limit: 40, w_demand: dw.demand, w_deficit: dw.deficit,
    w_vulnerability: dw.vulnerability, w_severity: dw.severity, w_coverage: dw.coverage }), [countryParam, sector, dw])
  const silent = useAsync(() => api.silent(countryParam), [countryParam])

  return (
    <div className="stack-md">
      <PageHead title={t('priorities_title', 'Priority ranking')} actions={<a className="btn btn-sm" href={api.exportUrl(countryParam)} download><Download size={16} aria-hidden="true" />{t('download_csv', 'Download CSV')}</a>}>{t('priorities_subtitle', 'Which places need help most. Move the sliders to change what matters.')}</PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ngi', label: t('tab_ranking', 'Ranking') }, { value: 'silent', label: `${t('tab_silent', 'Silent areas')} (${silent.data?.length ?? '…'})` }]} />
      {tab === 'ngi' ? (
        <div className="grid g-main" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)' }}>
          <Card title={t('tab_ranking', 'Ranking')} sub="Updates as you move the sliders" actions={
            <select className="select" style={{ width: 'auto', minHeight: 36 }} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
              <option value="all">{t('all_sectors', 'All sectors')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}</select>}>
            <ErrorBox error={ng.error} />
            {!ng.data ? <Loading height={400} /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>#</th><th>{t('th_area', 'Area')}</th><th>{t('th_sector', 'Sector')}</th><th className="num">{t('th_families', 'Families')}</th><th className="num">{t('th_missing', 'Missing')}</th><th>{t('th_need_level', 'Need level')}</th></tr></thead>
                <tbody>{(ng.data?.items || []).map((r, i) => (
                  <tr key={`${r.area_id}-${r.sector}`}>
                    <td className="mono muted">{i + 1}</td>
                    <td><strong>{r.area}</strong><div className="xs muted">{r.district}, {r.country}</div>
                      {r.silent_zone && <Badge tone="violet">silent</Badge>} {r.covered ? <Badge tone="blue">plan exists</Badge> : null} {r.coordinated_reports > 0 && <Badge tone="amber">campaign</Badge>}</td>
                    <td><SectorTag sector={r.sector} short /></td>
                    <td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td>
                    <td style={{ minWidth: 150 }}><NgiBar value={r.ngi} /></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </Card>
          <div className="stack-md">
            <Card title={t('what_matters_most', 'What matters most?')} sub={t('policy_choice', 'Your policy choice')} actions={<button className="btn btn-sm" onClick={() => setW(DEFAULTS)}><RotateCcw size={14} aria-hidden="true" />{t('reset', 'Reset')}</button>}>
              <div className="stack-md">
                {Object.keys(DEFAULTS).map((k) => (
                  <div key={k} className="field">
                    <div className="row-between"><label htmlFor={`w-${k}`}>{LABELS[k][0]}</label><span className="mono small">{w[k].toFixed(2)}</span></div>
                    <input id={`w-${k}`} type="range" min="0" max="1" step="0.05" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} />
                    <span className="help">{LABELS[k][1]}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="How the score works">
              <p className="mono xs" style={{ lineHeight: 1.7 }}>NGI = 100 × (wD·Demand + wS·Deficit + wV·Vulnerability + wX·Severity) ÷ Σw × (1 − wC·Covered)</p>
              <p className="help">Tip: set "How many people asked" to 0 to see needs no matter how loud a place is.</p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="stack-md">
          <div className="alert alert-violet"><VolumeX size={20} aria-hidden="true" />
            <div><strong>Silent areas</strong> badly lack services, but almost nobody has reported. Usually people have no phone or no way to be heard. Send someone to listen.</div></div>
          {silent.loading ? <Loading height={300} /> : (
            <div className="grid g-2">
              {(silent.data || []).map((r) => (
                <Card key={`${r.area_id}-${r.sector}`} className="highlight" title={r.area} sub={`${r.district}, ${r.state} · ${r.country}`} actions={<SectorTag sector={r.sector} short />}>
                  <dl className="kv">
                    <dt>Services available</dt><dd className="mono">{pct(1 - r.deficit)}</dd>
                    <dt>Vulnerability</dt><dd className="mono">{r.vulnerability.toFixed(2)}</dd>
                    <dt>Phone / internet access</dt><dd className="mono">{pct(r.connectivity)}</dd>
                    <dt>Reports received</dt><dd className="mono">{r.reports} (bottom {Math.round(r.raw_demand_pct * 100) || 1}% nationally)</dd>
                    <dt>{t('th_need_level', 'Need level')}</dt><dd><NgiBar value={r.ngi} /></dd>
                  </dl>
                  <p className="small mt"><strong>What to do:</strong> {r.recommended_outreach}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
