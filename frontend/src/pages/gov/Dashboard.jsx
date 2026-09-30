import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertOctagon, CheckCircle2, ChevronDown, ChevronUp, Ear, Globe2, HandCoins,
  Languages, Layers, Lightbulb, ListOrdered, Lock, MapPin, PauseCircle,
  RotateCcw, ShieldCheck, Siren, Sliders, Sparkles, Users, VolumeX, XCircle, Hammer, Clock
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import DemandMap, { COUNTRY_REGION, MapLegend, REGIONS } from '../../components/map/DemandMap'
import { HBar, TrendChart } from '../../components/charts/Charts'
import { Badge, Card, ColorGuide, ErrorBox, Loading, NgiBar, PageHead, SectorTag, Seg, Stat, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, COUNTRIES, LANG_NAMES, SECTORS, SECTOR_KEYS, fmt, money, pct, usd } from '../../lib/format'

const DEFAULT_WEIGHTS = { demand: 0.3, deficit: 0.3, vulnerability: 0.2, severity: 0.2, coverage: 0.5 }
const WEIGHT_LABELS = {
  demand: ['Citizen demand volume', 'Adjusted so low-phone areas are not underweighted'],
  deficit: ['Infrastructure deficit', 'Verified baseline deficit from local data'],
  vulnerability: ['Vulnerability index', 'Poverty rate, marginalized groups, geography'],
  severity: ['Severity & risk to life', 'Urgent health and safety issues prioritized'],
  coverage: ['Existing project discount', 'Avoid duplicating already-sanctioned schemes'],
}

function ProjectWhyCard({ project, onChanged }) {
  const { t } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.project(project.id), [project.id])
  const [reason, setReason] = useState('')
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)

  if (loading) return <div style={{ padding: 20 }}><Loading height={180} /></div>
  if (error) return <ErrorBox error={error} />
  const p = data || project
  const ex = p?.explanation

  const decide = async (decision) => {
    setErr(null)
    try {
      const r = await api.decide(p.id, decision, reason)
      setDone(`${decision.toUpperCase()} recorded. ${r.citizens_notified || 0} citizens notified in their own languages.`)
      reload()
      onChanged?.()
    } catch (e) {
      setErr(e)
    }
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: 18, marginTop: 12 }}>
      <div className="grid g-3">
        <div>
          <div className="stat-label">{t('priority_score', 'Priority Score')}</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{p.score}</div>
        </div>
        <div>
          <div className="stat-label">{t('estimated_cost', 'Estimated Cost')}</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{money(p.cost_local, p.country)}</div>
          <div className="xs muted">{usd(p.cost_usd)}</div>
        </div>
        <div>
          <div className="stat-label">{t('beneficiaries', 'Beneficiaries')}</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{fmt(p.beneficiaries)}</div>
        </div>
      </div>
      <div className="row mt" style={{ gap: 8 }}>
        <SectorTag sector={p.sector} />
        <Badge tone="blue">Scheme: {p.scheme || 'PMGSY / AMRUT / Jal Jeevan'}</Badge>
        {p.explanation?.facts?.some(f => f.includes('SILENT')) && (
          <Badge tone="violet">🔇 Silent Zone Area</Badge>
        )}
      </div>

      {ex && (
        <>
          <div className="divider" style={{ margin: '14px 0' }} />
          <h4 className="row" style={{ margin: '0 0 8px', gap: 6, color: '#1e293b' }}>
            <Lightbulb size={17} aria-hidden="true" style={{ color: '#d97706' }} />
            {t('why_this_project', 'Why this project?')}
          </h4>
          <ul className="small" style={{ paddingLeft: 18, margin: '6px 0 12px' }}>
            {ex.facts.map((f, i) => (
              <li key={i} style={{ color: f.startsWith('SILENT') ? 'var(--color-silent)' : '#334155', fontWeight: f.startsWith('SILENT') ? 600 : 400 }}>
                {f}
              </li>
            ))}
          </ul>
          <div className="stack" style={{ gap: 6 }}>
            {ex.drivers.map((d) => (
              <div key={d.factor} className="small" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 40% 40px', gap: 10, alignItems: 'center' }}>
                <span className="muted">{d.factor}</span>
                <span className="ngi-track" style={{ height: 8 }}>
                  <span className="ngi-fill" style={{ display: 'block', width: `${Math.min(100, d.points * 3)}%`, background: '#2563eb' }} />
                </span>
                <span className="mono xs" style={{ textAlign: 'right', fontWeight: 600 }}>{d.points} pts</span>
              </div>
            ))}
          </div>

          <h4 style={{ margin: '14px 0 6px', fontSize: '0.9rem', color: '#1e293b' }}>
            {t('citizen_evidence', 'Citizen Ground Evidence')}
          </h4>
          <div className="stack" style={{ gap: 8 }}>
            {ex.evidence.map((q) => (
              <div key={q.tracking_id} className="quote" style={{ margin: 0, padding: '8px 12px', background: '#fff', borderLeft: '3px solid #2563eb' }}>
                <div className="orig" style={{ fontWeight: 500 }}>"{q.original}"</div>
                {q.english && q.english !== q.original && <div className="en xs muted mt-xs">{q.english}</div>}
                <div className="xs muted mt-xs">
                  {LANG_NAMES[q.language] || q.language} · <Link to={`/track/${q.tracking_id}`} className="mono">{q.tracking_id}</Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {p.decision_reason && (
        <div className="alert alert-info mt" style={{ marginTop: 12 }}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <div className="small">Decision by {p.decided_by || 'Officer'}: {p.decision_reason}</div>
        </div>
      )}

      {p.source === 'recommended' && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <div className="field">
            <label htmlFor={`reason-${p.id}`} className="xs font-semibold uppercase muted">
              Official Decision Note (required for sanction or rejection)
            </label>
            <input
              id={`reason-${p.id}`}
              className="input small"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Approved under District Convergence Budget; DPR sanctioned"
            />
          </div>
          <div className="row mt-xs" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-primary" onClick={() => decide('approve')}>
              <CheckCircle2 size={14} aria-hidden="true" /> Approve Project
            </button>
            <button className="btn btn-sm" onClick={() => decide('defer')}>
              <PauseCircle size={14} aria-hidden="true" /> Defer
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => decide('reject')}>
              <XCircle size={14} aria-hidden="true" /> Reject
            </button>
          </div>
          {done && <div className="alert alert-success mt-xs" style={{ padding: '6px 10px', fontSize: '0.85rem' }}>{done}</div>}
          <ErrorBox error={err} />
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { user, isOfficial, role, countryParam, country, t } = useApp()
  const [layer, setLayer] = useState('hotspot') // default to demand hotspots color-coded by severity
  const [sector, setSector] = useState('all')
  const [region, setRegion] = useState(COUNTRY_REGION[country] || 'all')
  const [selected, setSelected] = useState(null)
  const [silentOnly, setSilentOnly] = useState(false)
  const [expandedWhy, setExpandedWhy] = useState({})
  const [showSliders, setShowSliders] = useState(true)

  // Live scoring weights sliders
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [debouncedWeights, setDebouncedWeights] = useState(DEFAULT_WEIGHTS)

  useEffect(() => {
    const h = setTimeout(() => setDebouncedWeights(weights), 200)
    return () => clearTimeout(h)
  }, [weights])

  // Data fetching
  const ov = useAsync(() => api.overview(countryParam), [countryParam])
  const areas = useAsync(() => api.mapAreas({ sector, country: countryParam }), [sector, countryParam])
  const silentZonesData = useAsync(() => api.silent(countryParam), [countryParam])
  const plans = useAsync(() => api.projects({ source: 'plan', country: countryParam }), [countryParam])
  
  // Ranked projects & need gaps with live scoring weights
  const topNeedGap = useAsync(() => api.needGap({
    country: countryParam,
    sector,
    limit: 20,
    w_demand: debouncedWeights.demand,
    w_deficit: debouncedWeights.deficit,
    w_vulnerability: debouncedWeights.vulnerability,
    w_severity: debouncedWeights.severity,
    w_coverage: debouncedWeights.coverage,
  }), [countryParam, sector, debouncedWeights])

  const recProjects = useAsync(() => api.projects({
    source: 'recommended',
    country: countryParam,
    sector: sector === 'all' ? undefined : sector
  }), [countryParam, sector])

  const o = ov.data
  const allSilent = silentZonesData.data || []
  const silentAreaIds = new Set(allSilent.map(s => s.area_id))

  // Filter map areas if silentOnly is active
  const displayedAreas = (areas.data || []).map(a => {
    if (silentOnly) {
      return { ...a, is_highlighted_silent: silentAreaIds.has(a.id) || a.silent_zone }
    }
    return a
  })

  // Filter or prioritize projects based on silent toggle
  const rankedProjectsList = (recProjects.data || []).filter(p => {
    if (!silentOnly) return true
    return p.explanation?.facts?.some(f => f.includes('SILENT')) || silentAreaIds.has(p.area_id)
  })

  const toggleWhy = (id) => {
    setExpandedWhy(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="stack-md">
      {/* Official Header with Role Badge */}
      <PageHead
        title={
          <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span>Policymaker Demand &amp; Planning Dashboard</span>
            <span className="badge badge-amber" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <ShieldCheck size={13} style={{ marginRight: 4 }} />
              {role?.replace(/_/g, ' ') || 'Official'} Access
            </span>
          </span>
        }
        actions={
          <div className="row" style={{ gap: 8 }}>
            <Link to="/priorities" className="btn btn-sm btn-ghost">
              <ListOrdered size={16} /> Need-Gap Ranking
            </Link>
            <Link to="/ask" className="btn btn-sm btn-primary">
              <Sparkles size={16} /> {t('ask_title', 'Ask AI Intelligence')}
            </Link>
          </div>
        }
      >
        Real-time citizen demand intelligence, spatial deficit mapping, silent area outreach, and project prioritization.
      </PageHead>

      <ErrorBox error={ov.error || topNeedGap.error} />

      {/* KPI Stats Bar */}
      <div className="grid g-4">
        {o ? (
          <>
            <Stat tone="blue" icon={Ear} label={t('nav_report', 'Total Complaints')} value={fmt(o.total_requests)} note={`from ${fmt(o.unique_households)} households`} />
            <Stat tone="blue" icon={Layers} label={t('stat_grouped_needs', 'Grouped Needs')} value={fmt(o.clusters)} note={`${fmt(o.recommended_projects)} AI projects suggested`} />
            <Stat
              tone="violet"
              icon={VolumeX}
              label={t('stat_silent_areas', 'Silent Zones')}
              value={fmt(o.silent_zones || allSilent.length)}
              note="High deficit, low complaint volume"
            />
            <Stat tone="green" icon={Languages} label={t('stat_languages_heard', 'Languages Heard')} value={fmt(o.languages)} note={`${pct(o.voice_share)} via speech/audio`} />
          </>
        ) : [1, 2, 3, 4].map((i) => <Loading key={i} height={100} />)}
      </div>

      {/* SILENT ZONES OUTREACH BANNER (Visible when toggled) */}
      {silentOnly && (
        <div style={{ background: '#f5f3ff', border: '2px solid #8b5cf6', borderRadius: 8, padding: 16 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
            <span className="icon-tile tone-violet"><VolumeX size={24} aria-hidden="true" /></span>
            <div>
              <h3 style={{ margin: '0 0 4px', color: '#5b21b6' }}>
                Silent Zones Outreach Mode Active ({allSilent.length} Under-Heard Areas Flagged)
              </h3>
              <p className="small" style={{ color: '#4c1d95', margin: 0, lineHeight: 1.5 }}>
                These geographic clusters have verified <strong>infrastructure deficits &gt; 50%</strong> but statistically low grievance volume due to lack of digital connectivity or marginalization.
                Under government charter standards, JanSetu flags them as <strong>"under-heard — needs outreach"</strong>. Prioritize mobile facilitation desks and Gram Sabha hearings for these communities.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAP & SECTOR CONTROLS */}
      <div className="grid g-main" style={{ gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)' }}>
        {/* MAP CARD */}
        <Card
          title={
            <span className="row" style={{ gap: 8 }}>
              <span>{silentOnly ? 'Silent Zones & Outreach Map' : 'Demand Hotspots & Severity Map'}</span>
              {silentOnly && <Badge tone="violet">Outreach Priority</Badge>}
            </span>
          }
          sub="Circles represent planning areas color-coded by severity or deficit level. Click any area circle to inspect."
          actions={
            <div className="row" style={{ gap: 8 }}>
              {/* SILENT ZONES TOGGLE BUTTON */}
              <button
                type="button"
                className={`btn btn-sm ${silentOnly ? 'btn-primary' : 'btn-outline'}`}
                style={silentOnly ? { background: '#7c3aed', borderColor: '#6d28d9', color: '#fff' } : {}}
                onClick={() => {
                  const next = !silentOnly
                  setSilentOnly(next)
                  if (next) setLayer('silent')
                  else setLayer('hotspot')
                }}
                title="Toggle Silent Zones needing outreach"
              >
                <VolumeX size={15} />
                <span>{silentOnly ? '✓ Silent Zones Filtered' : 'Filter Silent Zones'}</span>
              </button>

              <Seg
                label="Map Layer"
                value={layer}
                onChange={(l) => {
                  setLayer(l)
                  if (l === 'silent') setSilentOnly(true)
                  else if (silentOnly) setSilentOnly(false)
                }}
                options={[
                  { value: 'hotspot', label: '🔥 Hotspots' },
                  { value: 'ngi', label: 'Need Index' },
                  { value: 'silent', label: '🔇 Silent Zones' },
                  { value: 'plans', label: 'Sanctioned' },
                ]}
              />
            </div>
          }
        >
          {/* Filters Row */}
          <div className="row" style={{ marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
            <label className="row small">
              <span className="muted">{t('category', 'Sector')}:</span>
              <select className="select" style={{ minHeight: 34, width: 'auto' }} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="all">{t('all_sectors', 'All sectors')}</option>
                {SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}
              </select>
            </label>
            <label className="row small">
              <span className="muted">{t('zoom_to', 'Region')}:</span>
              <select className="select" style={{ minHeight: 34, width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value)}>
                {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
              </select>
            </label>
          </div>

          {areas.data ? (
            <DemandMap
              areas={displayedAreas}
              layer={layer}
              region={region}
              sector={sector}
              onSelect={setSelected}
              plans={plans.data || []}
              tall
            />
          ) : <Loading height={540} />}

          <div className="mt"><MapLegend layer={layer} /></div>
          <div className="mt"><ColorGuide compact /></div>
        </Card>

        {/* RIGHT COLUMN: SCORING WEIGHTS & AREA INSPECTOR */}
        <div className="stack-md">
          {/* Selected Area Drawer */}
          {selected && (
            <Card
              title={selected.area}
              sub={`${selected.district}, ${selected.state} · ${COUNTRIES[selected.country] || selected.country}`}
              actions={<button className="btn btn-sm" onClick={() => setSelected(null)}>{t('close', 'Close')}</button>}
            >
              <dl className="kv">
                <dt>Population</dt><dd className="mono">{fmt(selected.population)}</dd>
                <dt>Vulnerability</dt><dd className="mono">{Math.round(selected.vulnerability * 100)} / 100</dd>
                <dt>Phone / Connectivity</dt><dd className="mono">{pct(selected.connectivity)}</dd>
                <dt>Complaints Received</dt><dd className="mono">{fmt(selected.reports)}</dd>
                <dt>Hotspot Status</dt><dd>{selected.hotspot?.class?.startsWith('hot') ? <Badge tone="red">Critical Hotspot</Badge> : 'Normal'}</dd>
                <dt>Silent Area</dt><dd>{selected.silent_zone ? <Badge tone="violet">Yes · Needs Outreach</Badge> : 'No'}</dd>
              </dl>
              {selected.silent_zone && (
                <div className="alert alert-violet mt" style={{ padding: '8px 12px' }}>
                  <VolumeX size={16} aria-hidden="true" />
                  <div className="xs">Under-heard in {selected.silent_sectors?.map((s) => SECTORS[s]?.short || s).join(', ')}. Outreach van recommended.</div>
                </div>
              )}
              <div className="stack mt" style={{ gap: 6 }}>
                {SECTOR_KEYS.map((s) => (
                  <div key={s} className="row-between">
                    <SectorTag sector={s} short />
                    <div style={{ width: '55%' }}><NgiBar value={selected.sectors?.[s]?.ngi} /></div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* INTERACTIVE SCORING WEIGHTS SLIDER CONTROL */}
          <Card
            title={
              <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                <Sliders size={18} />
                <span>Policy Scoring Weights (NGI)</span>
              </span>
            }
            sub="Move sliders to adjust decision priorities. Ranked projects and need scores recompute live."
            actions={
              <button className="btn btn-sm btn-ghost" onClick={() => setWeights(DEFAULT_WEIGHTS)}>
                <RotateCcw size={14} /> {t('reset', 'Reset')}
              </button>
            }
          >
            <div className="stack" style={{ gap: 12 }}>
              {Object.keys(DEFAULT_WEIGHTS).map((k) => (
                <div key={k} className="field" style={{ margin: 0 }}>
                  <div className="row-between">
                    <label htmlFor={`w-${k}`} className="small font-semibold">{WEIGHT_LABELS[k][0]}</label>
                    <span className="mono small font-bold" style={{ color: '#2563eb' }}>{weights[k].toFixed(2)}</span>
                  </div>
                  <input
                    id={`w-${k}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[k]}
                    onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
                    style={{ width: '100%', margin: '4px 0' }}
                  />
                  <span className="xs muted">{WEIGHT_LABELS[k][1]}</span>
                </div>
              ))}
            </div>
            <div className="alert alert-info mt" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              <strong>Policymaker Tip:</strong> Reduce citizen demand weight to 0.0 to discover critical infrastructure needs in silent villages where residents have no mobile connectivity.
            </div>
          </Card>
        </div>
      </div>

      {/* RANKED LIST OF RECOMMENDED PROJECTS PER AREA WITH "WHY THIS PROJECT?" CARDS */}
      <Card
        title={
          <span className="row" style={{ gap: 10, alignItems: 'center' }}>
            <ListOrdered size={20} />
            <span>Ranked Project Recommendations ({rankedProjectsList.length})</span>
            {silentOnly && <Badge tone="violet">Filtered: Silent Outreach</Badge>}
          </span>
        }
        sub="Ranked by Need-Gap Index and cost-efficiency based on current scoring weights. Click 'Why this project?' on any recommendation for citizen evidence, drivers, and approval."
        actions={
          <Link to="/projects" className="btn btn-sm btn-ghost">
            View All Projects &rarr;
          </Link>
        }
      >
        {recProjects.loading ? (
          <Loading height={200} />
        ) : rankedProjectsList.length === 0 ? (
          <p className="muted small" style={{ padding: 20 }}>No projects match the current sector/silent filter.</p>
        ) : (
          <div className="stack" style={{ gap: 12 }}>
            {rankedProjectsList.slice(0, 10).map((p, idx) => {
              const isExpanded = !!expandedWhy[p.id]
              return (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                      <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                        <span className="badge" style={{ background: idx < 3 ? '#2563eb' : '#64748b', color: '#fff', fontWeight: 700 }}>
                          #{idx + 1}
                        </span>
                        <SectorTag sector={p.sector} short />
                        <span className="font-bold">{p.title}</span>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="small muted">
                        📍 <strong>{p.area}</strong> ({p.district}, {COUNTRIES[p.country] || p.country}) · Beneficiaries: <strong>{fmt(p.beneficiaries)}</strong> · Cost: <strong>{money(p.cost_local, p.country)}</strong>
                      </div>
                    </div>

                    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right', minWidth: 100 }}>
                        <div className="xs muted font-semibold uppercase">Priority Score</div>
                        <div className="mono font-bold" style={{ fontSize: '1.2rem', color: '#1e293b' }}>{p.score}</div>
                      </div>
                      <button
                        className={`btn btn-sm ${isExpanded ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => toggleWhy(p.id)}
                        aria-expanded={isExpanded}
                      >
                        <Lightbulb size={15} />
                        <span>Why this project?</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Inline Expandable "Why this project?" Card */}
                  {isExpanded && (
                    <ProjectWhyCard project={p} onChanged={() => recProjects.reload()} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
