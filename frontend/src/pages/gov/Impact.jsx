import { CheckCircle2, Clock, Mic, RotateCcw, ShieldAlert, Star, UserRound, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { BeforeAfter, HBar } from '../../components/charts/Charts'
import { Card, Loading, PageHead, SectorTag, Stat } from '../../components/ui'
import { COUNTRIES, LANG_NAMES, fmt, pct, usd } from '../../lib/format'

export default function Impact() {
  const { countryParam } = useApp()
  const imp = useAsync(() => api.impactProjects(countryParam), [countryParam])
  const k = useAsync(() => api.kpis(countryParam), [countryParam])
  const d = k.data
  const langs = d ? Object.entries(d.language_mix).map(([l, v]) => ({ name: LANG_NAMES[l] || l, value: v })) : []
  return (
    <div className="stack-md">
      <PageHead title="Results & impact">Did the work solve the problem? And is everyone being heard?</PageHead>
      <h2>Completed projects</h2>
      {imp.loading ? <Loading height={300} /> : (
        <div className="grid g-2">
          {imp.data.map((p) => {
            const c = p.complaints_per_1000hh_month
            return (
              <Card key={p.project_id} title={p.title} sub={`${p.area} · ${COUNTRIES[p.country]} · ${usd(p.cost_usd)} · ${fmt(p.beneficiaries)} beneficiaries`} actions={<SectorTag sector={p.sector} short />}>
                <div className="grid g-3">
                  <div><div className="stat-label">Complaints fell</div><div className="stat-value" style={{ color: 'var(--color-success)' }}>{p.reduction_pct}%</div></div>
                  <div><div className="stat-label">Vs. similar areas</div><div className="stat-value">{p.did_estimate}</div><div className="xs muted">per 1k HH / month</div></div>
                  <div><div className="stat-label">Provisioning</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{pct(p.indicator.before)} → {pct(p.indicator.after)}</div></div>
                </div>
                <BeforeAfter data={[{ period: 'Before completion', treated: c.treated_before, comparison: c.control_before }, { period: 'After completion', treated: c.treated_after, comparison: c.control_after }]} />
                <p className="help">Blue line falling faster than grey = the project worked.</p>
              </Card>
            )
          })}
        </div>
      )}
      <h2 className="mt">Is everyone being heard?</h2>
      {!d ? <Loading height={200} /> : (
        <>
          <div className="grid g-4">
            <Stat tone="blue" icon={Mic} label="Voice / IVR share" value={pct(d.inclusion.voice_share)} note="Feature-phone & low-literacy access" />
            <Stat tone="blue" icon={UserRound} label="Women (of disclosed)" value={pct(d.inclusion.women_share_of_disclosed)} note="Target: parity" />
            <Stat tone="blue" icon={Users} label="Assisted + community" value={pct(d.inclusion.assisted_share)} note="Filed via CSC / ASHA / meetings" />
            <Stat tone="blue" icon={ShieldAlert} label="Anonymous reports" value={pct(d.inclusion.anonymous_share)} note="Safe to speak up" />
            <Stat tone="green" icon={CheckCircle2} label="Citizen-verified closures" value={pct(d.trust.citizen_verified_share)} note={`${fmt(d.trust.verified_fixed)} confirmed fixed`} />
            <Stat tone="red" icon={RotateCcw} label="Reopened by citizens" value={fmt(d.trust.reopened)} note="Disputed 'fixes' reopened automatically" />
            <Stat tone="amber" icon={ShieldAlert} label="Fake closures caught" value={fmt(d.trust.formulaic_closures_flagged)} note={'"Grievance disposed" without action'} />
            <Stat tone="green" icon={Star} label="Average rating" value={`${d.trust.avg_rating}/5`} note={<><Clock size={12} aria-hidden="true" /> median {d.responsiveness.median_days_to_plan ?? '–'} days from report to plan</>} />
          </div>
          <div className="grid g-2">
            <Card title="Languages heard" sub={`${d.languages} languages · ${pct(d.inclusion.non_english_share)} non-English`}><HBar data={langs} dataKey="value" format={(v) => fmt(v)} /></Card>
            <Card title="Monthly reports" sub="Volume through all channels"><HBar data={d.monthly_volume.slice(-8).map((m) => ({ name: m.month, value: m.requests }))} dataKey="value" format={(v) => fmt(v)} /></Card>
          </div>
        </>
      )}
    </div>
  )
}
