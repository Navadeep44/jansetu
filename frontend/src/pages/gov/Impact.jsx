import { CheckCircle2, Clock, Mic, RotateCcw, ShieldAlert, Star, UserRound, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { BeforeAfter, HBar, useMonthLabel } from '../../components/charts/Charts'
import { Card, ListenButton, Loading, PageHead, SectorTag, Stat } from '../../components/ui'
import { LANG_NAMES, fmt, money, pct } from '../../lib/format'

export default function Impact() {
  const { stateParam } = useApp()
  const t = useT()
  const ml = useMonthLabel()
  const imp = useAsync(() => api.impactProjects(stateParam), [stateParam])
  const k = useAsync(() => api.kpis(), [])
  const d = k.data
  const langs = d ? Object.entries(d.language_mix).map(([l, v]) => ({ name: LANG_NAMES[l] || l, value: v })) : []
  return (
    <div className="stack-md">
      <PageHead title="Results & impact" eyebrow="Official workspace" overlap={false} steps={['See finished work', 'Compare before and after', 'Check who is not being heard']}>
        Did the work solve the problem? And is everyone being heard?
      </PageHead>
      <h2>{t('Finished works')}</h2>
      {imp.loading ? <Loading height={300} /> : !imp.data?.length ? <Card><p className="muted">{t('No finished works here yet.')}</p></Card> : (
        <div className="grid g-2">
          {imp.data.map((p) => {
            const c = p.complaints_per_1000hh_month
            const fell = Math.round(p.reduction_pct)
            const line = t('Complaints fell by {p}%', { p: fell })
            return (
              <Card key={p.project_id} title={<>{p.title}</>} sub={<>{p.area}, {t(p.state)} · {money(p.cost_local)} · {t('{n} people helped', { n: fmt(p.beneficiaries) })}</>} actions={<SectorTag sector={p.sector} short />}>
                <div className="alert alert-success" style={{ marginBottom: 12 }}><CheckCircle2 size={18} aria-hidden="true" />
                  <div style={{ flex: 1 }}><strong style={{ fontSize: '1.15rem' }}>{line}</strong>
                    <div className="small">{t('Service went from {a} to {b}.', { a: pct(p.indicator.before), b: pct(p.indicator.after) })}</div></div>
                  <ListenButton text={`${p.title}. ${line}.`} className="btn" /></div>
                <div className="small muted">{p.did_estimate < 0
                  ? t('Better than similar places: {n} fewer complaints per 1,000 families a month.', { n: Math.abs(p.did_estimate) })
                  : t('Not better than similar places yet.')}</div>
                <BeforeAfter data={[{ period: 'Before the work', treated: c.treated_before, comparison: c.control_before }, { period: 'After the work', treated: c.treated_after, comparison: c.control_after }]} />
                <p className="help">{t('Blue line falls faster than grey = the work helped.')}</p>
              </Card>
            )
          })}
        </div>
      )}
      <h2 className="mt">{t('Is everyone being heard?')}</h2>
      {!d ? <Loading height={200} /> : (
        <>
          <div className="grid g-4">
            <Stat tone="blue" icon={Mic} label="By voice call" value={pct(d.inclusion.voice_share)} note="For basic phones and people who cannot read" />
            <Stat tone="blue" icon={UserRound} label="Women" value={pct(d.inclusion.women_share_of_disclosed)} note="Goal: half" />
            <Stat tone="blue" icon={Users} label="Helped by CSC, ASHA or meetings" value={pct(d.inclusion.assisted_share)} note="Someone helped them report" />
            <Stat tone="blue" icon={ShieldAlert} label="Without a name" value={pct(d.inclusion.anonymous_share)} note="Safe to speak up" />
            <Stat tone="green" icon={CheckCircle2} label="Citizens confirmed the fix" value={pct(d.trust.citizen_verified_share)} note={<>{t('{n} said it is fixed', { n: fmt(d.trust.verified_fixed) })}</>} />
            <Stat tone="red" icon={RotateCcw} label="Reopened by citizens" value={fmt(d.trust.reopened)} note="They said it was not fixed" />
            <Stat tone="amber" icon={ShieldAlert} label="Fake closures caught" value={fmt(d.trust.formulaic_closures_flagged)} note="Closed on paper, not fixed" />
            <Stat tone="green" icon={Star} label="Average rating" value={`${d.trust.avg_rating}/5`} note={<><Clock size={12} aria-hidden="true" /> {t('{n} days from report to plan', { n: d.responsiveness.median_days_to_plan ?? '–' })}</>} />
          </div>
          <div className="grid g-2">
            <Card title="Languages heard" sub={<>{t('{n} languages · {p} not in English', { n: d.languages, p: pct(d.inclusion.non_english_share) })}</>}><HBar data={langs} dataKey="value" format={(v) => fmt(v)} /></Card>
            <Card title="Reports per month" sub="All ways of reporting"><HBar data={d.monthly_volume.slice(-8).map((m) => ({ name: ml(m.month), value: m.requests }))} dataKey="value" format={(v) => fmt(v)} /></Card>
          </div>
        </>
      )}
    </div>
  )
}
