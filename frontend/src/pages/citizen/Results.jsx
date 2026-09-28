import { useState } from 'react'
import { CheckCircle2, Hammer, MessageCircle, RotateCcw, ThumbsUp, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Loading, PageHead, SectorTag, Seg, StatusBadge } from '../../components/ui'
import { COUNTRIES, date, fmt } from '../../lib/format'

const GROUPS = [
  { status: 'completed', title: 'Done', tone: 'green', Icon: CheckCircle2 },
  { status: 'in_progress', title: 'Work started', tone: 'blue', Icon: Hammer },
  { status: 'approved', title: 'Approved', tone: 'blue', Icon: ThumbsUp },
]

export default function Results() {
  const { t } = useApp()
  const [country, setCountry] = useState('all')
  const { data, loading } = useAsync(() => api.board(country), [country])

  const groups = [
    { status: 'completed', title: t('results_done', 'Done'), tone: 'green', Icon: CheckCircle2 },
    { status: 'in_progress', title: t('results_work_started', 'Work started'), tone: 'blue', Icon: Hammer },
    { status: 'approved', title: t('results_approved', 'Approved'), tone: 'blue', Icon: ThumbsUp },
  ]

  return (
    <div className="stack-md">
      <PageHead title={t('results_title', 'Public results: you said, we did')} actions={
        <Seg label={t('country', 'Country')} value={country} onChange={setCountry} options={[{ value: 'all', label: t('all', 'All') }, { value: 'IN', label: 'India' }]} />}>
        {t('results_subtitle', 'What people asked for, and what the government did. Open to everyone.')}
      </PageHead>
      {loading || !data ? <Loading height={300} /> : (
        <>
          <div className="grid g-4">
            <div className="card stat tile-blue"><span className="stat-label"><MessageCircle size={16} aria-hidden="true" />{t('stat_reports_received', 'Reports')}</span><span className="stat-value">{fmt(data.requests)}</span></div>
            <div className="card stat tile-green"><span className="stat-label"><CheckCircle2 size={16} aria-hidden="true" />{t('stat_projects_completed', 'Projects done')}</span><span className="stat-value">{data.completed}</span></div>
            <div className="card stat tile-green"><span className="stat-label"><ThumbsUp size={16} aria-hidden="true" />{t('stat_fixes_confirmed', 'Fixes confirmed by citizens')}</span><span className="stat-value">{fmt(data.verified_fixed)}</span></div>
            <div className="card stat tile-red"><span className="stat-label"><RotateCcw size={16} aria-hidden="true" />{t('not_fixed', 'Reopened ("not fixed")')}</span><span className="stat-value">{fmt(data.reopened)}</span></div>
          </div>
          {groups.map((g) => {
            const items = data.items.filter((i) => i.status === g.status)
            if (!items.length) return null
            return (
              <section key={g.status}>
                <h2 className="section-title row"><span className={`icon-tile tone-${g.tone}`}><g.Icon size={18} aria-hidden="true" /></span>{g.title} ({items.length})</h2>
                <div className="grid g-3">
                  {items.map((p) => (
                    <article key={p.id} className={`card stack tile-${g.tone}`}>
                      <div className="row-between"><SectorTag sector={p.sector} short /><StatusBadge status={p.status} /></div>
                      <div className="small muted">{t('results_you_said', 'You said')}</div>
                      <div className="row"><Users size={16} aria-hidden="true" /><strong>{fmt(p.citizen_voices)} {t('th_families', 'families')}</strong><span className="small muted">in {p.area}, {COUNTRIES[p.country] || p.country}</span></div>
                      <div className="small muted">{t('results_we_did', 'We did')}</div>
                      <strong>{p.title}</strong>
                      <div className="xs muted">{fmt(p.beneficiaries)} {t('results_beneficiaries', 'people benefit')} · {p.completed_at ? `done ${date(p.completed_at)}` : p.scheme}</div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </>
      )}
    </div>
  )
}
