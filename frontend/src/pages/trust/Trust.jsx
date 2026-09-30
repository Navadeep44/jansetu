import { CheckCircle2, Database, EyeOff, ExternalLink, FileSpreadsheet, Languages, Lock, Scale, Server, Trash2, UserCheck } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, Empty, Loading, PageHead } from '../../components/ui'
import { date } from '../../lib/format'
import { AreaLine, placeName, useLevel } from '../gov/levelScope'

// Simple promises to every citizen (India: DPDP Act 2023 + DPDP Rules 2025).
const PROMISES = [
  { Icon: Scale, tone: 'blue', t: 'Follows Indian law', d: 'DPDP Act 2023 and DPDP Rules 2025.' },
  { Icon: Server, tone: 'blue', t: 'Data stays in India', d: 'Stored on servers inside India only.' },
  { Icon: EyeOff, tone: 'green', t: 'Personal numbers hidden', d: 'Aadhaar, phone, PAN and voter ID are removed.' },
  { Icon: UserCheck, tone: 'green', t: 'No one can be picked out', d: 'Open data shows only groups of 5 or more.' },
  { Icon: Trash2, tone: 'amber', t: 'Delete your data', d: 'You can delete your report any time.' },
  { Icon: Languages, tone: 'violet', t: 'Your language', d: 'Bhashini helps with 22 Indian languages.' },
]

const DPG = [
  ['1. Helps the SDGs', 'Water, roads, power, health, schools, sanitation, fair spending.'],
  ['2. Open licence', 'Code Apache-2.0. Documents and demo data CC-BY-4.0.'],
  ['3. Clear owner', 'Public code with rules for who decides and how to help.'],
  ['4. No lock-in', 'Works with any AI model, or none. Runs on any cloud or office server.'],
  ['5. Documented', 'Guides for setup, data and the open API.'],
  ['6. Open data without personal details', 'CSV and Open311 feeds have totals only, no names.'],
  ['7. Privacy and Indian law', 'DPDP Act 2023. Consent, hidden IDs, right to delete.'],
  ['8. Open standards', 'Open311, OpenAPI, GeoJSON and SDG labels.'],
  ['9. Do no harm', 'Urgent cases go to people fast. Abuse is filtered. Every decision is logged.'],
]

const ROLE = { field_officer: 'Field officer', district: 'District collector', state: 'State planning officer', national: 'National planner', admin: 'Admin',
  district_officer: 'District collector', state_officer: 'State planning officer', dept_officer: 'Department officer', super_admin: 'Super admin', citizen: 'Citizen' }
const ACTION = {
  approve_project: 'Approved a project', reject_project: 'Rejected a project', defer_project: 'Put a project on hold',
  review_request: 'Checked a report', close_request: 'Closed a report', force_close: 'Closed without citizen check',
  regenerate_projects: 'Made new project list', optimise_budget: 'Ran the budget planner',
  project_approve: 'Approved a project', project_reject: 'Rejected a project', project_defer: 'Put a project on hold',
  project_start: 'Started work on a project', project_complete: 'Marked a project done', propose_project: 'Proposed a project',
  regenerate_recommendations: 'Made new project list', assign_field_officer: 'Gave a case to a field officer',
}
const ENTITY = { project: 'Project', request: 'Citizen report', cluster: 'Grouped need', user: 'User account' }

// Officers of a state or district see only decisions about projects and reports in their own area.
async function loadAudit(scoped) {
  const log = await api.auditLog()
  if (!scoped) return log
  const [projects, reqs] = await Promise.all([
    api.projects({ limit: 5000 }),
    log.some((a) => a.entity === 'request') ? api.requests({ limit: 5000 }) : Promise.resolve({ items: [] }),
  ])
  const ids = new Set([...(projects || []).map((p) => p.code), ...(reqs?.items || []).map((r) => r.tracking_id)])
  return log.filter((a) => (a.entity === 'project' || a.entity === 'request') && ids.has(a.entity_id))
}

export function Audit() {
  const t = useT()
  const { scoped, state, district } = useLevel()
  const place = placeName(t, { state, district })
  const { data, loading } = useAsync(() => loadAudit(scoped), [scoped])
  return (
    <div className="stack-md">
      <PageHead title="Decision log" eyebrow="Official workspace" steps={['Every decision is saved', 'See who decided and why']}>
        {scoped ? <>{t('Every decision about {p}, with who and why.', { p: place })}</> : 'Every decision by an official, with who and why.'}
      </PageHead>
      <AreaLine place={place} />
      <Card>
        {loading ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>{t('When')}</th><th>{t('Who')}</th><th>{t('What was done')}</th><th>{t('Item')}</th><th>{t('Reason')}</th></tr></thead>
            <tbody>{data.map((a) => (
              <tr key={a.id}>
                <td className="xs">{date(a.at)}</td>
                <td><Badge>{t(ROLE[a.actor_role] || a.actor_role)}</Badge></td>
                <td>{ACTION[a.action] ? t(ACTION[a.action]) : a.action.replace(/_/g, ' ')}</td>
                <td className="xs"><span>{t(ENTITY[a.entity] || a.entity)}</span> <span className="mono">{a.entity_id}</span></td>
                <td className="xs" style={{ maxWidth: 420 }}>{a.detail?.reason || a.detail?.note || JSON.stringify(a.detail).slice(0, 160)}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}

export default function Trust() {
  const t = useT()
  const { meta } = useApp()
  const cap = meta?.capabilities || {}
  const on = (x, off = 'Demo (simulator)') => t(x ? 'Connected' : off)
  return (
    <div className="stack-md">
      <PageHead title="Privacy & open standards" eyebrow="Open to everyone"
        steps={['Your data is safe', 'Open data has no names', 'Free for every state to use']}>
        How we keep your data safe. And why every Indian state can use JanSetu free.
      </PageHead>

      <section className="grid g-3" aria-label={t('Our promises to you')}>
        {PROMISES.map(({ Icon, tone, t: title, d }) => (
          <div key={title} className="card feature-card">
            <span className={`icon-tile tone-${tone}`}><Icon size={22} aria-hidden="true" /></span>
            <h3>{t(title)}</h3><p className="muted">{t(d)}</p>
          </div>
        ))}
      </section>

      <div className="grid g-main">
        <Card title="Digital Public Good: 9 checks" sub="JanSetu meets all 9 DPG standard checks.">
          <div className="stack">
            {DPG.map(([title, d]) => (
              <div key={title} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                <CheckCircle2 size={20} color="#15803d" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                <div><strong>{t(title)}</strong><div className="small muted">{t(d)}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <div className="stack-md">
          <Card title="This system's setup">
            <dl className="kv">
              <dt>{t('Language AI')}</dt><dd>{cap.llm_provider && cap.llm_provider !== 'offline rules' ? cap.llm_provider : t('Offline rules')}</dd>
              <dt>Bhashini</dt><dd>{on(cap.bhashini, 'Not set up')}</dd>
              <dt>{t('Speech to text')}</dt><dd>{!cap.asr || cap.asr === 'none' ? t('On the phone + human check') : cap.asr}</dd>
              <dt>{t('WhatsApp')}</dt><dd>{on(cap.whatsapp)}</dd>
              <dt>{t('Telegram')}</dt><dd>{on(cap.telegram)}</dd>
              <dt>IVR / SMS</dt><dd>{on(cap.ivr)}</dd>
              <dt>{t('Smallest group in open data')}</dt><dd className="mono">k = {cap.k_anonymity ?? 5}</dd>
              <dt>{t('Extra noise on numbers')}</dt><dd className="mono">{cap.dp_epsilon ? `ε = ${cap.dp_epsilon}` : t('Off')}</dd>
            </dl>
          </Card>
          <Card title="Open APIs and data">
            <div className="stack small">
              <a href="/docs" target="_blank" rel="noreferrer" className="row"><Database size={16} aria-hidden="true" />{t('API guide (OpenAPI)')} <ExternalLink size={14} aria-hidden="true" /></a>
              <a href="/open311/v2/services.json" target="_blank" rel="noreferrer" className="row"><Database size={16} aria-hidden="true" />{t('Open311: list of services')} <ExternalLink size={14} aria-hidden="true" /></a>
              <a href="/open311/v2/requests.json?service_code=water" target="_blank" rel="noreferrer" className="row"><Database size={16} aria-hidden="true" />{t('Open311: water reports')} <ExternalLink size={14} aria-hidden="true" /></a>
              <a href={api.exportUrl()} className="row"><FileSpreadsheet size={16} aria-hidden="true" />{t('Open data CSV (no names)')} <ExternalLink size={14} aria-hidden="true" /></a>
              <span className="help">{t('Old complaints can be imported from CPGRAMS and state portals.')}</span>
            </div>
          </Card>
          <Card title="Responsible AI">
            <ul className="check-list small">
              <li><Lock size={16} aria-hidden="true" /><span>{t('Unsure AI answers go to a person. AI never rejects a citizen.')}</span></li>
              <li><Lock size={16} aria-hidden="true" /><span>{t('Every score shows its reasons.')}</span></li>
              <li><Lock size={16} aria-hidden="true" /><span>{t('Officials can see and change the weights.')}</span></li>
              <li><Lock size={16} aria-hidden="true" /><span>{t('Your own words and voice are kept next to the translation.')}</span></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
