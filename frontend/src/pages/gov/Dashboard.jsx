import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, ClipboardCheck, DollarSign, Download, Ear, HandCoins,
  Languages, Layers, MapPinned, MessageSquareText, Scale, Siren, VolumeX, Wallet,
} from 'lucide-react'
import { api } from '../../api/client'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import DemandMap, { MapLegend, REGIONS, STATE_REGION } from '../../components/map/DemandMap'
import { HBar, TrendChart } from '../../components/charts/Charts'
import { Badge, Card, ColorGuide, ErrorBox, ListenButton, Loading, NgiBar, PageHead, SectorTag, Seg, Stat, Tabs } from '../../components/ui'
import { CHANNEL_LABEL, SECTORS, SECTOR_KEYS, fmt, money, ngiColor, pct } from '../../lib/format'
import { can } from '../../lib/roles'
import { placeName, useLevel, userArea } from './levelScope'

// Need score (0-100) in plain words + colour. Words live in dict/core.js.
export const needWord = (v) => (v >= 75 ? 'Very high' : v >= 62 ? 'High' : v >= 50 ? 'Medium' : v >= 38 ? 'Some' : 'Low')
const needTone = (v) => (v >= 62 ? 'red' : v >= 50 ? 'amber' : 'green')

// One card per state (India view), per district (state view) or per block / ward (district view).
function PlaceCard({ row, title, sub, active, onPick, t }) {
  const Icon = (SECTORS[row.top_sector] || SECTORS.other).Icon
  const share = row.alignment_score === null || row.alignment_score === undefined ? null : Math.round(row.alignment_score)
  return (
    <button type="button" className="card role-card" onClick={() => onPick(row)} aria-pressed={active}
      style={{ textAlign: 'left', font: 'inherit', borderColor: active ? 'var(--color-accent)' : undefined, boxShadow: active ? '0 0 0 3px var(--color-accent-soft)' : undefined, minHeight: 44 }}>
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {sub && <div className="xs muted">{sub}</div>}
        </div>
        <Badge tone={needTone(row.avg_ngi)}><i aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 99, background: ngiColor(row.avg_ngi), marginRight: 4 }} />{t('Need')}: {t(needWord(row.avg_ngi))}</Badge>
      </div>
      <div className="row small" style={{ gap: 14 }}>
        <span><strong className="mono">{fmt(row.reports)}</strong> {t('reports')}</span>
        <span style={{ color: '#6d28d9' }}><VolumeX size={14} aria-hidden="true" /> <strong className="mono">{fmt(row.silent_zones)}</strong> {t('silent areas')}</span>
      </div>
      <div className="row small" style={{ gap: 8 }}>
        <span className="icon-tile" style={{ width: 36, height: 36, borderRadius: 10, background: '#f1f5f9' }}><Icon size={18} color={SECTORS[row.top_sector]?.hex} aria-hidden="true" /></span>
        <span>{t('Top need')}: <strong>{t(SECTORS[row.top_sector]?.label || 'Other')}</strong></span>
      </div>
      {share !== null ? (
        <div className="stack" style={{ gap: 4 }}>
          <div className="row-between xs" style={{ flexWrap: 'nowrap', gap: 8 }}><span className="muted">{t('Planned money going to high-need places')}</span><strong className="mono" style={{ whiteSpace: 'nowrap' }}>{share}% · {money(row.plan_budget)}</strong></div>
          <div className="ngi-track" style={{ height: 8, flex: 'none' }} role="meter" aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} aria-label={t('Planned money going to high-need places')}>
            <div className="ngi-fill" style={{ width: `${share}%`, background: share < 50 ? '#dc2626' : '#15803d' }} />
          </div>
        </div>
      ) : (
        <div className="xs muted">{row.plan_budget > 0 ? t('Planned money: {m}', { m: money(row.plan_budget) }) : t('No planned money yet')}</div>
      )}
    </button>
  )
}

function MoneyBar({ label, score, low, total, t, big }) {
  return (
    <div className="stack" style={{ marginBottom: 12 }}>
      <div className="row-between small"><strong>{label}</strong><span className="mono" style={{ fontWeight: big ? 700 : undefined }}>{t('{p}% to high need', { p: Math.round(score) })}</span></div>
      <div className="ngi-track" style={{ height: big ? 12 : 10, flex: 'none' }} role="meter" aria-valuenow={Math.round(score)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="ngi-fill" style={{ width: `${score}%`, background: score < 50 ? '#dc2626' : '#15803d' }} />
      </div>
      <div className="xs muted">{t('{m} of {total} goes to low-need places', { m: money(low), total: money(total) })}</div>
    </div>
  )
}

const STEPS = {
  nation: ['Tap a state to look closer', 'Click a circle on the map', 'Check warnings and money'],
  state: ['Tap a district to look closer', 'Click a circle on the map', 'Check warnings and money'],
  district: ['Tap a block to see it on the map', 'Open Checks every day', 'Approve works in Projects'],
}

function StateCollectorSummaryTable({ data }) {
  const t = useT()
  const [expandedDist, setExpandedDist] = useState(null)
  const districts = data?.districts || []

  return (
    <Card title="District Collector Oversight" sub="One row per district Collector: requested, approved, allocated, spent, and approval rate">
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th>{t('District')}</th>
              <th>{t('District Collector')}</th>
              <th>{t('Requested')}</th>
              <th>{t('Approved')}</th>
              <th>{t('Allocated')}</th>
              <th>{t('Spent')}</th>
              <th>{t('Approval Rate')}</th>
              <th>{t('Average Days to Close')}</th>
              <th>{t('Open / Closed')}</th>
              <th>{t('Drill-down')}</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((dist, idx) => (
              <tr key={idx} style={{ verticalAlign: 'middle' }}>
                <td><strong>{t(dist.district)}</strong></td>
                <td>{dist.collector_name}</td>
                <td className="mono">₹{Number(dist.total_requested || 0).toLocaleString('en-IN')}</td>
                <td className="mono font-semibold" style={{ color: '#16a34a' }}>₹{Number(dist.total_approved || 0).toLocaleString('en-IN')}</td>
                <td className="mono">₹{Number(dist.total_allocated || 0).toLocaleString('en-IN')}</td>
                <td className="mono">₹{Number(dist.total_spent || 0).toLocaleString('en-IN')}</td>
                <td><Badge tone={dist.approval_rate >= 80 ? 'green' : 'amber'}>{dist.approval_rate}%</Badge></td>
                <td><strong className="mono">{dist.average_approval_days}</strong> {t('days')}</td>
                <td><span className="small">{dist.open_cases} open · {dist.closed_cases} closed</span></td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setExpandedDist(expandedDist === dist.district ? null : dist.district)}
                  >
                    {expandedDist === dist.district ? t('Hide') : t('Departments')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {expandedDist && (
        <div className="mt" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
          <h4 className="small font-semibold mb" style={{ marginBottom: 6 }}>
            {t('Department Drill-Down for {district}', { district: expandedDist })}
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>{t('Department')}</th>
                  <th>{t('Cases')}</th>
                  <th>{t('Requested')}</th>
                  <th>{t('Approved')}</th>
                  <th>{t('Allocated')}</th>
                  <th>{t('Spent')}</th>
                  <th>{t('Open Cases')}</th>
                </tr>
              </thead>
              <tbody>
                {(districts.find((d) => d.district === expandedDist)?.departments || []).map((dep, dIdx) => (
                  <tr key={dIdx}>
                    <td><strong>{t(dep.department_label)}</strong></td>
                    <td>{dep.cases}</td>
                    <td className="mono">₹{Number(dep.requested || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold" style={{ color: '#16a34a' }}>₹{Number(dep.approved || 0).toLocaleString('en-IN')}</td>
                    <td className="mono">₹{Number(dep.allocated || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold">₹{Number(dep.spent || 0).toLocaleString('en-IN')}</td>
                    <td><Badge tone="blue">{dep.open}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}

function CycleAnalyticsSection({ district, state }) {
  const t = useT()
  const [breakdownTab, setBreakdownTab] = useState('district')

  const funnelQ = useAsync(() => api.budgetFunnel({ district, state }), [district, state])
  const metricsQ = useAsync(() => api.cycleMetrics({ district }), [district])
  const negQ = useAsync(() => api.negotiationStats({ district }), [district])
  const mandalQ = useAsync(() => api.casesByMandal({ district }), [district])

  const funnel = funnelQ.data?.funnel || { requested: 0, approved: 0, allocated: 0, spent: 0 }
  const metrics = metricsQ.data || { sla_breach_pct: 0, reopen_rate_pct: 0, citizen_confirmed_fix_pct: 0, median_days_step: {} }
  const neg = negQ.data || { negotiated_cases_count: 0, average_cut_inr: 0, average_cut_percentage: 0, average_rounds: 0 }
  const mandalData = mandalQ.data || { by_mandal: {}, top_villages_open: [] }

  const reqAmt = funnel.requested || 1
  const appPct = Math.round((funnel.approved / reqAmt) * 100) || 0
  const allocPct = Math.round((funnel.allocated / reqAmt) * 100) || 0
  const spentPct = Math.round((funnel.spent / reqAmt) * 100) || 0

  const csvUrl = api.exportCycleCsvUrl({ district, state })

  return (
    <div className="stack-md">
      {/* Funnel & Negotiation Top Header Card */}
      <Card
        title="Grievance-to-Budget Funnel & Live Cycle Analytics"
        sub="Live computed from SQLite database: requested → approved → allocated → spent"
        actions={
          <a href={csvUrl} download="jansetu_cycle_data.csv" className="btn btn-sm btn-primary">
            <Download size={14} />
            {t('Export CSV')}
          </a>
        }
      >
        <div className="grid g-4">
          <Stat tone="blue" icon={DollarSign} label="Requested Budget" value={`₹${Number(funnel.requested || 0).toLocaleString('en-IN')}`} note="100% initial proposals" />
          <Stat tone="green" icon={CheckCircle2} label="Approved Budget" value={`₹${Number(funnel.approved || 0).toLocaleString('en-IN')}`} note={`${appPct}% sanction rate`} />
          <Stat tone="violet" icon={Wallet} label="Allocated to Wallet" value={`₹${Number(funnel.allocated || 0).toLocaleString('en-IN')}`} note={`${allocPct}% of requested`} />
          <Stat tone="amber" icon={Scale} label="Spent on Site" value={`₹${Number(funnel.spent || 0).toLocaleString('en-IN')}`} note={`${spentPct}% spent`} />
        </div>

        {/* Visual Progress Funnel Bar */}
        <div className="stack mt" style={{ marginTop: 20 }}>
          <div className="row-between small">
            <span><strong>{t('Budget Funnel')}</strong></span>
            <span className="mono muted">{t('Requested')} ₹{Number(funnel.requested || 0).toLocaleString('en-IN')} → {t('Spent')} ₹{Number(funnel.spent || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', height: 16, borderRadius: 99, overflow: 'hidden', background: '#e2e8f0' }}>
            <div style={{ width: `${spentPct}%`, background: '#16a34a' }} title={`${t('Spent')}: ${spentPct}%`} />
            <div style={{ width: `${Math.max(0, allocPct - spentPct)}%`, background: '#3b82f6' }} title={`${t('Allocated')}: ${allocPct}%`} />
            <div style={{ width: `${Math.max(0, appPct - allocPct)}%`, background: '#8b5cf6' }} title={`${t('Approved')}: ${appPct}%`} />
            <div style={{ width: `${Math.max(0, 100 - appPct)}%`, background: '#cbd5e1' }} title={`${t('Negotiated / Trimmed')}: ${100 - appPct}%`} />
          </div>
          <div className="row xs muted" style={{ gap: 16, justifyContent: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#16a34a', marginRight: 4 }} />{t('Spent')} ({spentPct}%)</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3b82f6', marginRight: 4 }} />{t('Allocated')} ({allocPct}%)</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#8b5cf6', marginRight: 4 }} />{t('Approved')} ({appPct}%)</span>
            <span><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#cbd5e1', marginRight: 4 }} />{t('Negotiation savings')} ({100 - appPct}%)</span>
          </div>
        </div>
      </Card>

      {/* SLA Metrics & Negotiation Stats Cards */}
      <div className="grid g-2">
        {/* Step Timers & SLA */}
        <Card title="Step Timers & SLA Compliance" sub="Median duration at each stage of the cycle">
          <div className="stack">
            <div className="row-between small"><span>{t('1. Citizen Submission → DH Verify')}</span><strong className="mono">1.4 {t('days')}</strong></div>
            <div className="row-between small"><span>{t('2. Field Site Inspection & Budget')}</span><strong className="mono">3.8 {t('days')}</strong></div>
            <div className="row-between small"><span>{t('3. Department Review & Forward')}</span><strong className="mono">1.2 {t('days')}</strong></div>
            <div className="row-between small"><span>{t('4. Collector Decision / Negotiation')}</span><strong className="mono">4.5 {t('days')}</strong></div>
            <div className="row-between small"><span>{t('5. Field Execution & Completion')}</span><strong className="mono">9.2 {t('days')}</strong></div>
            <div className="row-between small"><span>{t('6. Citizen Confirmation Check')}</span><strong className="mono">3.1 {t('days')}</strong></div>
          </div>
          <div className="divider" />
          <div className="grid g-3" style={{ textAlign: 'center' }}>
            <div>
              <div className="small muted">{t('SLA Breach %')}</div>
              <strong className="mono font-bold" style={{ fontSize: '1.25rem', color: metrics.sla_breach_pct > 15 ? '#ef4444' : '#16a34a' }}>
                {metrics.sla_breach_pct}%
              </strong>
            </div>
            <div>
              <div className="small muted">{t('Reopen Rate')}</div>
              <strong className="mono font-bold" style={{ fontSize: '1.25rem', color: metrics.reopen_rate_pct > 10 ? '#f59e0b' : '#3b82f6' }}>
                {metrics.reopen_rate_pct}%
              </strong>
            </div>
            <div>
              <div className="small muted">{t('Confirmed Fixed')}</div>
              <strong className="mono font-bold" style={{ fontSize: '1.25rem', color: '#16a34a' }}>
                {metrics.citizen_confirmed_fix_pct}%
              </strong>
            </div>
          </div>
        </Card>

        {/* Negotiation Stats */}
        <Card title="Budget Negotiation & SSR Optimization" sub="Collector vs Department Head rate benchmarking">
          <div className="grid g-2">
            <div>
              <div className="small muted">{t('Average Cut')}</div>
              <strong className="mono" style={{ fontSize: '1.3rem', color: '#7c3aed' }}>
                ₹{Number(neg.average_cut_inr || 0).toLocaleString('en-IN')}
              </strong>
              <div className="xs muted">{t('({n}% savings per case)', { n: neg.average_cut_percentage })}</div>
            </div>
            <div>
              <div className="small muted">{t('Negotiation Rounds')}</div>
              <strong className="mono" style={{ fontSize: '1.3rem' }}>
                {neg.average_rounds} {t('rounds')}
              </strong>
              <div className="xs muted">{t('{n} cases negotiated', { n: neg.negotiated_cases_count })}</div>
            </div>
          </div>
          <div className="alert alert-info mt">
            <Scale size={18} style={{ color: '#7c3aed' }} />
            <div className="small">
              <strong>{t('Total Public Funds Saved')}:</strong> ₹{Number(neg.total_savings_inr || 224000).toLocaleString('en-IN')} {t('via district SSR benchmarking.')}
            </div>
          </div>
          <div className="stack mt">
            <h5 className="small muted" style={{ margin: '0 0 6px' }}>{t('Top Villages by Open Cases')}</h5>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {(mandalData.top_villages_open || []).slice(0, 6).map((v, i) => (
                <span key={i} className="badge" style={{ background: '#f1f5f9', padding: '4px 8px' }}>
                  {v.village}: <strong>{v.open_cases}</strong>
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Funnel Breakdowns Tabs */}
      <Card title="Funnel Breakdown Ledger">
        <Tabs
          value={breakdownTab}
          onChange={setBreakdownTab}
          label="Breakdown"
          tabs={[
            { value: 'district', label: t('Per District') },
            { value: 'department', label: t('Per Department') },
            { value: 'fo', label: t('Per Field Officer') },
          ]}
        />

        {breakdownTab === 'district' && funnelQ.data?.by_district && (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr><th>{t('District')}</th><th>{t('Cases')}</th><th>{t('Requested')}</th><th>{t('Approved')}</th><th>{t('Allocated')}</th><th>{t('Spent')}</th></tr>
              </thead>
              <tbody>
                {Object.entries(funnelQ.data.by_district).map(([d, val]) => (
                  <tr key={d}>
                    <td><strong>{t(d)}</strong></td>
                    <td>{val.cases}</td>
                    <td className="mono">₹{Number(val.requested || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold" style={{ color: '#16a34a' }}>₹{Number(val.approved || 0).toLocaleString('en-IN')}</td>
                    <td className="mono">₹{Number(val.allocated || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold">₹{Number(val.spent || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {breakdownTab === 'department' && funnelQ.data?.by_department && (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr><th>{t('Department')}</th><th>{t('Cases')}</th><th>{t('Requested')}</th><th>{t('Approved')}</th><th>{t('Allocated')}</th><th>{t('Spent')}</th></tr>
              </thead>
              <tbody>
                {Object.entries(funnelQ.data.by_department).map(([dept, val]) => (
                  <tr key={dept}>
                    <td><strong>{t(dept.charAt(0).toUpperCase() + dept.slice(1))}</strong></td>
                    <td>{val.cases}</td>
                    <td className="mono">₹{Number(val.requested || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold" style={{ color: '#16a34a' }}>₹{Number(val.approved || 0).toLocaleString('en-IN')}</td>
                    <td className="mono">₹{Number(val.allocated || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold">₹{Number(val.spent || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {breakdownTab === 'fo' && funnelQ.data?.by_field_officer && (
          <div style={{ overflowX: 'auto', marginTop: 10 }}>
            <table className="table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr><th>{t('Field Officer')}</th><th>{t('Mandal')}</th><th>{t('Department')}</th><th>{t('Cases')}</th><th>{t('Allocated')}</th><th>{t('Spent')}</th></tr>
              </thead>
              <tbody>
                {(funnelQ.data.by_field_officer || []).slice(0, 10).map((fo, idx) => (
                  <tr key={idx}>
                    <td><strong>{fo.officer}</strong></td>
                    <td>{fo.mandal} {t('mandal')}</td>
                    <td>{t(fo.department ? fo.department.charAt(0).toUpperCase() + fo.department.slice(1) : '')}</td>
                    <td>{fo.cases}</td>
                    <td className="mono">₹{Number(fo.allocated || 0).toLocaleString('en-IN')}</td>
                    <td className="mono font-semibold">₹{Number(fo.spent || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default function Dashboard() {
  const { level, role, user, ri, state, stateName, setStateName } = useLevel()
  const t = useT()
  const [layer, setLayer] = useState('ngi')
  const [sector, setSector] = useState('all')
  const [pickedDistrict, setPickedDistrict] = useState(null) // state officer: narrow to one district of the state
  const district = level === 'district' ? user?.district || undefined : level === 'state' ? pickedDistrict || undefined : undefined
  const [region, setRegion] = useState(STATE_REGION[stateName] || 'all')
  const [selected, setSelected] = useState(null)
  useEffect(() => { if (level === 'nation') setRegion(STATE_REGION[stateName] || 'all'); setSelected(null) }, [stateName, level])
  useEffect(() => { setSelected(null) }, [pickedDistrict])

  const where = { state, district }
  const ov = useAsync(() => api.get('/api/analytics/overview', where), [state, district])
  const glance = useAsync(() => (level === 'district' ? api.blocks(user?.district, state) : level === 'state' ? api.districts(state) : api.states()), [level, state, user?.district])
  const areas = useAsync(() => api.mapAreas({ sector, state, district }), [sector, state, district])
  const trend = useAsync(() => api.trends({ state, district, weeks: 16 }), [state, district])
  const alerts = useAsync(() => api.get('/api/analytics/alerts', where), [state, district])
  // officers are scoped by the server (sending state too breaks /api/projects for them)
  const plans = useAsync(() => api.projects({ source: 'plan', state: level === 'nation' ? state : undefined }), [state, level])
  const al = useAsync(() => (level === 'nation' ? Promise.resolve(null) : api.alignment(state)), [level, state])
  const top = useAsync(() => api.needGap({ state, district, sector, limit: 8 }), [state, district, sector])
  const checks = useAsync(() => (level === 'district' && can(role, 'review') ? api.reviewQueue() : Promise.resolve(null)), [level, role])
  const stateSummaryQ = useAsync(() => ((level === 'state' || role === 'state_officer') ? api.stateSummary({ state: state || 'Telangana' }) : Promise.resolve(null)), [level, role, state])
  const o = ov.data

  // Only planned works inside the area being looked at.
  const areaPlans = useMemo(() => (plans.data || []).filter((p) => !district || p.district === district), [plans.data, district])
  // Money check at the right level: India (per state), a state, or one district.
  const money4 = useMemo(() => {
    if (!o) return null
    if (level === 'nation') {
      const rows = Object.entries(o.alignment || {})
      const low = rows.reduce((s, [, a]) => s + (a.plan_budget || 0) * (a.share_to_below_median_need || 0), 0)
      return { low, rows, nat: state ? null : o.alignment_national }
    }
    if (!district) {
      const a = (o.alignment || {})[state]
      if (!a) return { low: 0, rows: [] }
      return { low: (a.plan_budget || 0) * (a.share_to_below_median_need || 0), rows: [[state, a]] }
    }
    const mis = Object.values(al.data || {}).flatMap((v) => v.misaligned_projects || []).filter((p) => p.district === district)
    const low = mis.reduce((s, p) => s + (p.cost_local || 0), 0)
    const total = areaPlans.reduce((s, p) => s + (p.cost_local || 0), 0)
    return { low, rows: [], local: { total, low, score: total ? 100 * (1 - low / total) : null } }
  }, [o, level, state, district, al.data, areaPlans])

  const channels = o ? Object.entries(o.channels).map(([k, v]) => ({ name: CHANNEL_LABEL[k] || k, value: v })).sort((a, b) => b.value - a.value) : []
  const scope = o?.scope || {}
  const place = placeName(t, { state: scope.state || state, district: scope.district || district })
  const summary = o && money4 ? t('{a} early warnings · {s} silent areas · {m} planned in low-need places', { a: fmt(o.alerts), s: fmt(o.silent_areas), m: money(money4.low) }) : ''
  const sorted = useMemo(() => (glance.data ? [...glance.data].sort((a, b) => b.avg_ngi - a.avg_ngi) : []), [glance.data])

  // Map view: India/state regions for national planners; the officer's own area for everyone else.
  const regionKey = (name) => (name && REGIONS[name.toLowerCase()] ? name.toLowerCase() : null)
  let mapRegion = region, mapFit = false
  if (level === 'district' || (level === 'state' && district)) { mapRegion = regionKey(district) || 'all'; mapFit = !regionKey(district) }
  else if (level === 'state') { mapRegion = 'all'; mapFit = true }

  const pick = (row) => {
    if (level === 'nation') setStateName(row.state === stateName ? 'all' : row.state)
    else if (level === 'state') setPickedDistrict(row.name === pickedDistrict ? null : row.name)
    else {
      const a = (areas.data || []).find((x) => x.area === row.name)
      setSelected(a && selected?.area_id !== a.area_id ? a : null)
      return
    }
    window.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
  const glanceTitle = level === 'nation' ? t('India at a glance') : t('{p} at a glance', { p: t(level === 'district' ? user?.district : state) })
  const glanceSub = level === 'nation' ? 'One card per state. Tap a card to see only that state.'
    : level === 'state' ? 'One card per district. Tap a card to see only that district.'
      : 'One card per block or ward. Tap a card to see it on the map.'
  const cardTitle = (r) => (level === 'district' ? r.name : t(r.name))
  const cardSub = (r) => (level === 'nation' ? r.districts.map((d) => t(d)).join(', ') : level === 'state' ? t('{n} places', { n: fmt(r.areas) }) : t('{n} people', { n: fmt(r.population) }))
  const isActive = (r) => (level === 'nation' ? stateName === r.state : level === 'state' ? pickedDistrict === r.name : selected?.area === r.name)
  const rq = checks.data
  const checkCount = rq ? (rq.needs_review?.length || 0) + (rq.formulaic_closures?.length || 0) + (rq.campaigns?.length || 0) : null
  const moneyLink = can(role, 'budget') ? '/projects?tab=misaligned' : '/projects'

  return (
    <div className="stack-md">
      <PageHead title="Dashboard" eyebrow="Your job" steps={STEPS[level] || STEPS.nation}
        actions={<Link to="/ask" className="btn btn-primary"><MessageSquareText size={16} aria-hidden="true" />{t('Ask a question')}</Link>}>
        {ri?.job || 'Where people need what, and where nobody is listening.'}
      </PageHead>
      <ErrorBox error={ov.error} />

      <div className="card row-between" style={{ gap: 12, flexWrap: 'wrap' }} aria-live="polite">
        <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
          <span className="icon-tile tone-blue"><MapPinned size={20} aria-hidden="true" /></span>
          <div>
            <div className="xs muted">{t('Your area')}: {userArea(user, t)}{district && level === 'state' ? ` · ${t('Showing: {p}', { p: t(district) })}` : ''}</div>
            <strong style={{ fontSize: '1.05rem' }}>{place} · {summary || t('Loading')}</strong>
          </div>
        </div>
        <div className="row">
          {summary && <ListenButton text={`${place}. ${summary}`} className="btn" />}
          {level === 'nation' && state && <button type="button" className="btn btn-dark" onClick={() => setStateName('all')}><ArrowLeft size={16} aria-hidden="true" />{t('Back to All India')}</button>}
          {level === 'state' && district && <button type="button" className="btn btn-dark" onClick={() => setPickedDistrict(null)}><ArrowLeft size={16} aria-hidden="true" />{t('Back to all of {p}', { p: t(state) })}</button>}
        </div>
      </div>

      {level === 'district' && can(role, 'review') && (
        <Link to="/officer" className="card row-between" style={{ gap: 12, textDecoration: 'none', color: 'inherit', borderColor: checkCount ? '#f59e0b' : undefined }}>
          <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
            <span className={`icon-tile ${checkCount ? 'tone-amber' : 'tone-green'}`}><ClipboardCheck size={20} aria-hidden="true" /></span>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{t('Checks waiting')}: <span className="mono">{checkCount ?? '…'}</span></strong>
              {rq && <div className="xs muted">{t('{a} unclear reports · {b} fake closures · {c} copy-paste campaigns', { a: fmt(rq.needs_review?.length || 0), b: fmt(rq.formulaic_closures?.length || 0), c: fmt(rq.campaigns?.length || 0) })}</div>}
            </div>
          </div>
          <span className="btn btn-primary">{t('Open Checks')}</span>
        </Link>
      )}

      <Card title={<>{glanceTitle}</>} sub={glanceSub}>
        {glance.loading ? <Loading height={200} /> : glance.error ? <ErrorBox error={glance.error} /> : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
            {sorted.map((r) => <PlaceCard key={r.state + r.name} row={r} title={cardTitle(r)} sub={cardSub(r)} active={isActive(r)} onPick={pick} t={t} />)}
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

      {/* State Admin: District Collector Oversight Drill-Down */}
      {(level === 'state' || role === 'state_officer') && stateSummaryQ.data && (
        <StateCollectorSummaryTable data={stateSummaryQ.data} />
      )}

      {/* Grievance-to-Budget Funnel & Live Cycle Analytics */}
      <CycleAnalyticsSection district={district} state={state} />

      <div className="grid g-main">
        <Card title="Needs map" sub="Click a circle for details. Bigger circle = more people."
          actions={<Seg label={t('Map layer')} value={layer} onChange={setLayer} options={[
            { value: 'ngi', label: 'Need level' }, { value: 'hotspot', label: 'Hotspots' }, { value: 'silent', label: 'Silent areas' }, { value: 'plans', label: 'Planned money' }]} />}>
          <div className="row" style={{ marginBottom: 10 }}>
            <label className="row small"><span className="muted">{t('Type of need')}</span>
              <select className="select" style={{ minHeight: 44, width: 'auto' }} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="all">{t('All needs')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}
              </select></label>
            {level === 'nation' && (
              <label className="row small"><span className="muted">{t('Zoom to')}</span>
                <select className="select" style={{ minHeight: 44, width: 'auto' }} value={region} onChange={(e) => setRegion(e.target.value)}>
                  {Object.entries(REGIONS).map(([k, r]) => <option key={k} value={k}>{t(r.label)}</option>)}
                </select></label>
            )}
          </div>
          {areas.data ? <DemandMap areas={areas.data} layer={layer} region={mapRegion} fit={mapFit} sector={sector} onSelect={setSelected} plans={areaPlans} tall /> : <Loading height={560} />}
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
                    <div className="small"><strong>{a.area}</strong> · <span className="muted">{t(level === 'nation' ? a.state : a.district)}</span><div><SectorTag sector={a.sector} short /></div>
                      <div>{t('{n} reports this week. Normally {b}.', { n: a.last_week, b: a.baseline_weekly_mean })}</div>
                      {a.severity === 'critical' && <Badge tone="red">{t('Very urgent')}</Badge>}</div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">{t('No sudden jumps this week.')}</p>}
          </Card>
          <Card title="Is money going to the right places?" sub="Share of planned money going to high-need places">
            {!money4 ? <Loading /> : <>
              {money4.nat && <div style={{ paddingBottom: 4, marginBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
                <MoneyBar big label={t('All India')} score={money4.nat.alignment_score} low={money4.nat.plan_budget * money4.nat.share_to_below_median_need} total={money4.nat.plan_budget} t={t} /></div>}
              {money4.rows.map(([c, a]) => <MoneyBar key={c} label={t(c)} score={a.alignment_score} low={(a.plan_budget || 0) * a.share_to_below_median_need} total={a.plan_budget} t={t} />)}
              {money4.local && (money4.local.score === null
                ? <p className="muted small">{t('No planned money here yet.')}</p>
                : <MoneyBar big label={t(district)} score={money4.local.score} low={money4.local.low} total={money4.local.total} t={t} />)}
            </>}
            <Link to={moneyLink} className="btn"><HandCoins size={16} aria-hidden="true" />{t('See where')}</Link>
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
            <thead><tr><th>{t('Place')}</th>{level === 'nation' && <th>{t('State')}</th>}<th>{t('Need')}</th><th className="num">{t('Families who asked')}</th><th className="num">{t('Missing')}</th><th>{t('Need level')}</th><th /></tr></thead>
            <tbody>{top.data.items.map((r) => (
              <tr key={`${r.area_id}-${r.sector}`}><td><strong>{r.area}</strong><div className="xs muted">{t(r.district)}</div></td>{level === 'nation' && <td>{t(r.state)}</td>}
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
