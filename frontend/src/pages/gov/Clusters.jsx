import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, SectorTag, Stat, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, SECTOR_KEYS, date, fmt, money } from '../../lib/format'

const GROUP = { children: 'Children', women: 'Women', pregnant_women: 'Pregnant women', elderly: 'Elderly people', disabled: 'People with disability' }
const GENDER = { male: 'Men', female: 'Women', undisclosed: 'Not said', other: 'Other' }

export function ClusterList() {
  const { stateParam } = useApp()
  const t = useT()
  const [sector, setSector] = useState('all')
  const [sort, setSort] = useState('households')
  const { data, loading, error } = useAsync(() => api.clusters({ state: stateParam, category: sector, sort, limit: 60 }), [stateParam, sector, sort])
  return (
    <div className="stack-md">
      <PageHead title="Grouped needs" eyebrow="Official workspace" steps={['One card = one problem in one place', 'Sort by families, how serious, or date', 'Open a card to read what people said']}>
        Same problem, same place = one need. We count families, not messages.
      </PageHead>
      <div className="card row">
        <label className="row small"><span className="muted">{t('Type of need')}</span>
          <select className="select" style={{ width: 'auto', minHeight: 44 }} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="all">{t('All needs')}</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{t(SECTORS[s].label)}</option>)}</select></label>
        <label className="row small"><span className="muted">{t('Sort')}</span>
          <select className="select" style={{ width: 'auto', minHeight: 44 }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="households">{t('Most families')}</option><option value="severity">{t('Most serious')}</option><option value="recent">{t('Newest')}</option></select></label>
        {data && <span className="small muted">{t('{n} grouped needs', { n: fmt(data.total) })}</span>}
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading height={400} /> : (
        <div className="grid g-3">
          {data.items.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="card role-card">
              <div className="row-between"><SectorTag sector={c.category} short /><StatusBadge status={c.status} /></div>
              <h3>{c.title}</h3>
              <div className="row small"><span className="mono"><strong>{fmt(c.unique_households)}</strong> {t('families')}</span><span className="muted">· {t('{n} reports', { n: fmt(c.request_count) })}</span></div>
              <div className="row">
                {c.languages.slice(0, 4).map((l) => <Badge key={l}>{t(LANG_NAMES[l] || l)}</Badge>)}
                {c.vulnerable_groups.slice(0, 2).map((g) => <Badge key={g} tone="violet">{t(GROUP[g] || g.replace(/_/g, ' '))}</Badge>)}
                {c.campaign_share > 0.2 && <Badge tone="amber">{t('Copy-paste {p}%', { p: Math.round(c.campaign_share * 100) })}</Badge>}
              </div>
              <div className="xs muted">{t(c.district)}, {t(c.state)} · {t('How serious')}: {c.severity_avg}/5 · {t('Last report')}: {date(c.last_seen)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClusterDetail() {
  const { id } = useParams()
  const t = useT()
  const { data, loading, error } = useAsync(() => api.cluster(id), [id])
  if (loading) return <Loading height={400} />
  if (error) return <ErrorBox error={error} />
  const c = data.cluster
  return (
    <div className="stack-md">
      <PageHead title={<>{c.title}</>} eyebrow="Official workspace" actions={<Link to="/clusters" className="btn"><ArrowLeft size={16} aria-hidden="true" />{t('All grouped needs')}</Link>}>
        {<>{t('{h} families asked for this in {n} reports.', { h: fmt(c.unique_households), n: fmt(c.request_count) })}</>}
      </PageHead>
      <div className="grid g-4">
        <Stat tone="blue" label="Families" value={fmt(c.unique_households)} />
        <Stat tone="blue" label="Reports" value={fmt(c.request_count)} />
        <Stat tone="green" label="Supporters at meetings" value={fmt(c.supporters)} />
        <Stat tone="amber" label="How serious (out of 5)" value={`${c.severity_avg}/5`} />
      </div>
      <div className="grid g-main">
        <Card title="What people said" sub="Their own words, with English below. Names and phone numbers removed.">
          <div className="stack">
            {data.quotes.map((q, i) => (
              <div key={i} className="quote"><div className="orig">{q.original}</div><div className="en">{q.english}</div>
                <div className="xs muted">{t(LANG_NAMES[q.language] || q.language)} · {t(CHANNEL_LABEL[q.channel] || q.channel)}</div></div>
            ))}
          </div>
        </Card>
        <div className="stack-md">
          <Card title="Reports per week" sub="Last 26 weeks">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.weekly} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="weeks_ago" tickFormatter={(v) => (v === 0 ? t('now') : t('{n} wk ago', { n: v }))} fontSize={11} stroke="#94a3b8" tickLine={false} interval={5} />
                <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => (v === 0 ? t('This week') : t('{n} weeks ago', { n: v }))} formatter={(v) => [v, t('Reports')]} />
                <Bar isAnimationActive={false} dataKey="reports" fill={SECTORS[c.category]?.hex} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Who and how">
            <dl className="kv">
              <dt>{t('Place')}</dt><dd>{data.area.name}, {t(data.area.district)}, {t(data.area.state)}</dd>
              <dt>{t('How they reached us')}</dt><dd>{Object.entries(c.channels).map(([k, v]) => `${t(CHANNEL_LABEL[k] || k)} ${v}`).join(' · ')}</dd>
              <dt>{t('Men / women')}</dt><dd>{Object.entries(data.gender).map(([k, v]) => `${t(GENDER[k] || k)} ${v}`).join(' · ')}</dd>
              <dt>{t('Groups at risk')}</dt><dd>{c.vulnerable_groups.map((g) => t(GROUP[g] || g)).join(', ') || '—'}</dd>
              <dt>{t('Service there now')}</dt><dd className="mono">{Math.round((data.area.infra[c.category] || 0) * 100)}%</dd>
            </dl>
          </Card>
          <Card title="Linked projects">
            {data.projects.length ? data.projects.map((p) => (
              <div key={p.id} className="stack" style={{ marginBottom: 10 }}>
                <div className="row-between"><Link to={`/projects?id=${p.id}`}><strong>{p.title}</strong></Link><StatusBadge status={p.status} /></div>
                <div className="xs muted">{t(p.source === 'plan' ? 'Existing plan' : 'Suggested by AI')} · {money(p.cost_local)} · {p.scheme}</div>
              </div>
            )) : <p className="small muted">{t('No project yet.')}</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
