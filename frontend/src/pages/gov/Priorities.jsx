import { useEffect, useState } from 'react'
import { Download, RotateCcw, VolumeX } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, NgiBar, PageHead, SectorTag, Tabs } from '../../components/ui'
import { SECTORS, SECTOR_KEYS, fmt, pct } from '../../lib/format'

const DEFAULTS = { demand: 0.3, deficit: 0.3, vulnerability: 0.2, severity: 0.2, coverage: 0.5 }
const LABELS = {
  demand: ['How many people asked', 'Places with few phones are not ignored'],
  deficit: ['What is missing on the ground', 'From village and ward data'],
  vulnerability: ['How poor or at risk people are', 'Poverty, weaker groups, disaster risk'],
  severity: ['How serious it is', 'Danger to life counts more'],
  coverage: ['Already planned?', 'Lower priority if work is already sanctioned'],
}
const weightWord = (v) => (v === 0 ? 'Not counted' : v < 0.2 ? 'A little' : v < 0.4 ? 'Some' : v < 0.7 ? 'A lot' : 'Most')

export default function Priorities() {
  const { stateParam } = useApp()
  const t = useT()
  const [tab, setTab] = useState('ngi')
  const [w, setW] = useState(DEFAULTS)
  const [dw, setDw] = useState(DEFAULTS)
  const [sector, setSector] = useState('all')
  useEffect(() => { const h = setTimeout(() => setDw(w), 250); return () => clearTimeout(h) }, [w])
  const ng = useAsync(() => api.needGap({ state: stateParam, sector, limit: 40, w_demand: dw.demand, w_deficit: dw.deficit,
    w_vulnerability: dw.vulnerability, w_severity: dw.severity, w_coverage: dw.coverage }), [stateParam, sector, dw])
  const silent = useAsync(() => api.silent(stateParam), [stateParam])

  return (
    <div className="stack-md">
      <PageHead title="Priority list" eyebrow="Official workspace" steps={['Top rows need help most', 'Move sliders to change what matters', 'Download the list']}
        actions={<a className="btn" href={api.exportUrl(stateParam)} download><Download size={16} aria-hidden="true" />{t('Download (CSV)')}</a>}>
        Which places need help most. Move the sliders to change what matters.
      </PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'ngi', label: 'Priority list' }, { value: 'silent', label: <>{t('Silent areas ({n})', { n: silent.data?.length ?? '…' })}</> }]} />
      {tab === 'ngi' ? (
        <div className="grid g-main" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)' }}>
          <Card title="Priority list" sub="Changes as you move the sliders" actions={
            <select className="select" style={{ width: 'auto', minHeight: 44 }} value={sector} onChange={(e) => setSector(e.target.value)} aria-label={t('Type of need')}>
              <option value="all">{t('All needs')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}</select>}>
            <ErrorBox error={ng.error} />
            {!ng.data ? <Loading height={400} /> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>#</th><th>{t('Place')}</th><th>{t('State')}</th><th>{t('Need')}</th><th className="num">{t('Families who asked')}</th><th className="num">{t('Missing')}</th><th>{t('Need level')}</th></tr></thead>
                <tbody>{ng.data.items.map((r, i) => (
                  <tr key={`${r.area_id}-${r.sector}`}>
                    <td className="mono muted">{i + 1}</td>
                    <td><strong>{r.area}</strong><div className="xs muted">{t(r.district)}</div>
                      <div className="row" style={{ gap: 4, marginTop: 2 }}>
                        {r.silent_zone && <Badge tone="violet">{t('Silent area')}</Badge>}
                        {r.covered ? <Badge tone="blue">{t('Plan exists')}</Badge> : null}
                        {r.coordinated_reports > 0 && <Badge tone="amber">{t('Copy-paste messages')}</Badge>}</div></td>
                    <td className="small">{t(r.state)}</td>
                    <td><SectorTag sector={r.sector} short /></td>
                    <td className="num">{fmt(r.effective_households)}</td><td className="num">{pct(r.deficit)}</td>
                    <td style={{ minWidth: 150 }}><NgiBar value={r.ngi} /></td>
                  </tr>))}</tbody>
              </table></div>
            )}
          </Card>
          <div className="stack-md">
            <Card title="What matters most?" sub="Your choice as a policymaker" actions={<button className="btn" onClick={() => setW(DEFAULTS)}><RotateCcw size={14} aria-hidden="true" />{t('Reset')}</button>}>
              <div className="stack-md">
                {Object.keys(DEFAULTS).map((k) => (
                  <div key={k} className="field">
                    <div className="row-between"><label htmlFor={`w-${k}`}>{t(LABELS[k][0])}</label><Badge tone={w[k] === 0 ? '' : 'blue'}>{t(weightWord(w[k]))}</Badge></div>
                    <input id={`w-${k}`} type="range" min="0" max="1" step="0.05" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
                      aria-valuetext={t(weightWord(w[k]))} style={{ minHeight: 44 }} />
                    <span className="help">{t(LABELS[k][1])}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="How the list is made">
              <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
                <li>{t('We add up the five things above.')}</li>
                <li>{t('Each slider says how much it counts.')}</li>
                <li>{t('Need level goes from 0 (low) to 100 (very high).')}</li>
              </ul>
              <p className="help">{t('Tip: set "How many people asked" to zero. Then loud places do not win.')}</p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="stack-md">
          <div className="alert alert-violet"><VolumeX size={20} aria-hidden="true" />
            <div><strong>{t('Silent areas')}</strong>: {t('services are very poor, but almost nobody reports. Often people have no phone. Send someone to listen.')}</div></div>
          {silent.loading ? <Loading height={300} /> : (
            <div className="grid g-2">
              {(silent.data || []).map((r) => (
                <Card key={`${r.area_id}-${r.sector}`} className="highlight" title={<>{r.area}</>} sub={<>{t(r.district)}, {t(r.state)}</>} actions={<SectorTag sector={r.sector} short />}>
                  <dl className="kv">
                    <dt>{t('Services there')}</dt><dd className="mono">{pct(1 - r.deficit)}</dd>
                    <dt>{t('How poor or at risk')}</dt><dd className="mono">{Math.round(r.vulnerability * 100)} / 100</dd>
                    <dt>{t('Phone / internet access')}</dt><dd className="mono">{pct(r.connectivity)}</dd>
                    <dt>{t('Reports received')}</dt><dd className="mono">{t('{n} (among the lowest {p}% in India)', { n: r.reports, p: Math.round(r.raw_demand_pct * 100) || 1 })}</dd>
                    <dt>{t('Need level')}</dt><dd><NgiBar value={r.ngi} /></dd>
                  </dl>
                  <p className="small mt"><strong>{t('What to do')}:</strong> {t('Send an ASHA or CSC worker door to door. Hold a Gram Sabha listening meeting.')}</p>
                  {r.recommended_outreach && <p className="xs muted" lang="en">{r.recommended_outreach}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
