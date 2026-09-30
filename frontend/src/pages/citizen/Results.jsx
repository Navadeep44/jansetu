import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ChevronRight, Hammer, Layers, MessageCircle, RotateCcw, ThumbsUp, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Loading, Modal, PageHead, SectorTag, Seg, StatusBadge } from '../../components/ui'
import { COUNTRIES, date, fmt } from '../../lib/format'

const COUNTRY_OPTIONS = [
  { value: 'all', label: 'All Nodes (BRICS)' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'BR', label: '🇧🇷 Brazil' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
]

export default function Results() {
  const { t } = useApp()
  const [country, setCountry] = useState('all')
  const [showDisputed, setShowDisputed] = useState(false)
  const { data, loading } = useAsync(() => api.board(country), [country])

  const groups = [
    { status: 'completed', title: t('results_done', 'Done'), tone: 'green', Icon: CheckCircle2 },
    { status: 'in_progress', title: t('results_work_started', 'Work started'), tone: 'blue', Icon: Hammer },
    { status: 'approved', title: t('results_approved', 'Approved'), tone: 'blue', Icon: ThumbsUp },
  ]

  return (
    <div className="stack-md">
      <PageHead
        title={t('results_title', 'Public results: you said, we did')}
        actions={
          <Seg
            label={t('country', 'Country')}
            value={country}
            onChange={setCountry}
            options={COUNTRY_OPTIONS}
          />
        }
      >
        {t('results_subtitle', 'What people asked for, and what the government did. Open to everyone across all BRICS member nodes.')}
      </PageHead>

      {loading || !data ? (
        <Loading height={300} />
      ) : (
        <>
          <div className="grid g-4">
            <div className="card stat tile-blue">
              <span className="stat-label"><MessageCircle size={16} aria-hidden="true" />{t('stat_reports_received', 'Reports')}</span>
              <span className="stat-value">{fmt(data.requests)}</span>
            </div>
            <div className="card stat tile-green">
              <span className="stat-label"><CheckCircle2 size={16} aria-hidden="true" />{t('stat_projects_completed', 'Projects done')}</span>
              <span className="stat-value">{data.completed}</span>
            </div>
            <div className="card stat tile-green">
              <span className="stat-label"><ThumbsUp size={16} aria-hidden="true" />{t('stat_fixes_confirmed', 'Fixes confirmed by citizens')}</span>
              <span className="stat-value">{fmt(data.verified_fixed)}</span>
            </div>
            <div className="card stat tile-red">
              <span className="stat-label"><RotateCcw size={16} aria-hidden="true" />{t('not_fixed', 'Reopened ("not fixed")')}</span>
              <span className="stat-value">{fmt(data.reopened)}</span>
              <button
                type="button"
                className="btn btn-xs btn-outline"
                style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
                onClick={() => setShowDisputed(true)}
              >
                See details ({fmt(data.reopened)})
              </button>
            </div>
          </div>

          {/* Grouping Explainer Banner */}
          <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px' }}>
            <div className="row" style={{ gap: 8, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
              <Layers size={18} color="var(--color-primary)" />
              <span>How individual reports turn into sanctioned projects ({fmt(data.requests)} reports → {data.items.length} community projects)</span>
            </div>
            <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
              Many similar reports from the same village or neighborhood are combined by JanSetu into one collective project — here's how they group. Rather than closing individual tickets in isolation, civic departments sanction and fund permanent infrastructure that solves the root problem for the entire community.
            </p>
          </div>

          {groups.map((g) => {
            const items = data.items.filter((i) => i.status === g.status)
            if (!items.length) return null
            return (
              <section key={g.status}>
                <h2 className="section-title row">
                  <span className={`icon-tile tone-${g.tone}`}><g.Icon size={18} aria-hidden="true" /></span>
                  {g.title} ({items.length})
                </h2>
                <div className="grid g-3">
                  {items.map((p) => (
                    <article key={p.id} className={`card stack tile-${g.tone}`}>
                      <div className="row-between">
                        <SectorTag sector={p.sector} short />
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="small muted">{t('results_you_said', 'You said')}</div>
                      <div className="row">
                        <Users size={16} aria-hidden="true" />
                        <strong>{fmt(p.citizen_voices)} {t('th_families', 'families')}</strong>
                        <span className="small muted">in {p.area}, {COUNTRIES[p.country] || p.country}</span>
                      </div>
                      <div className="small muted">{t('results_we_did', 'We did')}</div>
                      <strong>{p.title}</strong>
                      <div className="xs muted">
                        {fmt(p.beneficiaries)} {t('results_beneficiaries', 'people benefit')} · {p.completed_at ? `done ${date(p.completed_at)}` : p.scheme}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}

          {/* Disputed Cases Modal */}
          <Modal
            isOpen={showDisputed}
            onClose={() => setShowDisputed(false)}
            title={`Citizen Disputed Cases (${fmt(data.reopened)} Reopened)`}
            maxWidth={800}
          >
            <div className="stack-md">
              <p className="small muted" style={{ margin: 0 }}>
                When a department marks a grievance "resolved", citizens are prompted to verify the work on the ground. If the citizen replies "No, not fixed", the case is automatically reopened and escalated for independent field inspection.
              </p>
              {(!data.disputed_cases || data.disputed_cases.length === 0) ? (
                <div className="empty" style={{ padding: 24, textAlign: 'center' }}>
                  <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
                  <p>No active disputed cases in this jurisdiction.</p>
                </div>
              ) : (
                <div className="stack" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {data.disputed_cases.map((c) => (
                    <div
                      key={c.id || c.tracking_id}
                      className="card"
                      style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca' }}
                    >
                      <div className="row-between" style={{ marginBottom: 6 }}>
                        <div className="row" style={{ gap: 8 }}>
                          <span className="mono" style={{ fontWeight: 600 }}>{c.tracking_id}</span>
                          <span className="badge badge-red">Reopened (Disputed)</span>
                        </div>
                        <span className="xs muted">{c.updated_at ? date(c.updated_at) : 'Recent'}</span>
                      </div>

                      <div className="row" style={{ gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <SectorTag sector={c.category} short />
                        <span className="small">📍 {c.area}{c.state ? `, ${c.state}` : ''} ({c.country})</span>
                        <span className="small muted">🏛️ {c.department}</span>
                      </div>

                      <div style={{ background: '#fff', borderRadius: 6, padding: '8px 12px', border: '1px solid #fee2e2', marginBottom: 8 }}>
                        <div className="row" style={{ gap: 6, color: '#991b1b', fontSize: '0.8rem', fontWeight: 600 }}>
                          <AlertCircle size={14} />
                          <span>Citizen Feedback:</span>
                        </div>
                        <div className="small" style={{ color: '#450a0a', marginTop: 2 }}>
                          "{c.dispute_reason || 'Citizen verified in-person that repair was not executed.'}"
                        </div>
                      </div>

                      <div className="row-between">
                        <span className="xs muted">Status: Escalated to District Inspection Officer</span>
                        <Link to={`/track/${c.tracking_id}`} className="row small" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                          Track case timeline <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
