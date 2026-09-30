import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead, SectorTag, StatusBadge } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, SECTOR_KEYS, date, fmt, money } from '../../lib/format'

export function ClusterList() {
  const { countryParam } = useApp()
  const [sector, setSector] = useState('all')
  const [sort, setSort] = useState('households')
  const { data, loading, error } = useAsync(() => api.clusters({ country: countryParam, category: sector, sort, limit: 60 }), [countryParam, sector, sort])
  return (
    <div className="stack-md">
      <PageHead title="Grouped needs" eyebrow="Official workspace" steps={["One card = one problem in one place", "Sort by families, severity or date", "Open a card to read what people said"]}>Same problem, same place = one need. We count families, not messages.</PageHead>
      <div className="card row">
        <label className="row small"><span className="muted">Sector</span>
          <select className="select" style={{ width: 'auto' }} value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="all">All</option>{SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}</select></label>
        <label className="row small"><span className="muted">Sort</span>
          <select className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="households">Most households</option><option value="severity">Most severe</option><option value="recent">Most recent</option></select></label>
        {data && <span className="small muted">{fmt(data.total)} clusters</span>}
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading height={400} /> : (
        <div className="grid g-3">
          {data.items.map((c) => (
            <Link key={c.id} to={`/clusters/${c.id}`} className="card role-card">
              <div className="row-between"><SectorTag sector={c.category} short /><StatusBadge status={c.status} /></div>
              <h3>{c.title}</h3>
              <div className="row small"><span className="mono"><strong>{fmt(c.unique_households)}</strong> households</span><span className="muted">· {fmt(c.request_count)} reports</span></div>
              <div className="row">
                {c.languages.slice(0, 4).map((l) => <Badge key={l}>{LANG_NAMES[l] || l}</Badge>)}
                {c.vulnerable_groups.slice(0, 2).map((g) => <Badge key={g} tone="violet">{g.replace('_', ' ')}</Badge>)}
                {c.campaign_share > 0.2 && <Badge tone="amber">campaign {Math.round(c.campaign_share * 100)}%</Badge>}
              </div>
              <div className="xs muted">{c.district} · severity {c.severity_avg}/5 · last report {date(c.last_seen)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClusterDetail() {
  const { id } = useParams()
  const { data, loading, error } = useAsync(() => api.cluster(id), [id])
  if (loading) return <Loading height={400} />
  if (error) return <ErrorBox error={error} />
  const c = data.cluster
  return (
    <div className="stack-md">
      <PageHead title={c.title} eyebrow="Official workspace" actions={<Link to="/clusters" className="btn btn-sm">All grouped needs</Link>}>{c.summary}</PageHead>
      <div className="grid g-4">
        <div className="card stat"><span className="stat-label">Unique households</span><span className="stat-value">{fmt(c.unique_households)}</span></div>
        <div className="card stat"><span className="stat-label">Reports</span><span className="stat-value">{fmt(c.request_count)}</span></div>
        <div className="card stat"><span className="stat-label">Meeting supporters</span><span className="stat-value">{fmt(c.supporters)}</span></div>
        <div className="card stat"><span className="stat-label">Avg severity</span><span className="stat-value">{c.severity_avg}/5</span></div>
      </div>
      <div className="grid g-main">
        <Card title="What people said" sub="Original words (PII removed) with English translation. Diversity of languages is preserved.">
          <div className="stack">
            {data.quotes.map((q, i) => (
              <div key={i} className="quote"><div className="orig">{q.original}</div><div className="en">{q.english}</div>
                <div className="xs muted">{LANG_NAMES[q.language] || q.language} · {CHANNEL_LABEL[q.channel] || q.channel}</div></div>
            ))}
          </div>
        </Card>
        <div className="stack-md">
          <Card title="Reports per week" sub="Last 26 weeks">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.weekly} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="weeks_ago" tickFormatter={(v) => (v === 0 ? 'now' : `-${v}w`)} fontSize={11} stroke="#94a3b8" tickLine={false} interval={4} />
                <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
                <Tooltip labelFormatter={(v) => `${v} weeks ago`} />
                <Bar isAnimationActive={false} dataKey="reports" fill={SECTORS[c.category]?.hex} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Who and how">
            <dl className="kv">
              <dt>Area</dt><dd>{data.area.name}, {data.area.district}</dd>
              <dt>Channels</dt><dd>{Object.entries(c.channels).map(([k, v]) => `${CHANNEL_LABEL[k] || k} ${v}`).join(' · ')}</dd>
              <dt>Gender</dt><dd>{Object.entries(data.gender).map(([k, v]) => `${k} ${v}`).join(' · ')}</dd>
              <dt>Vulnerable</dt><dd>{c.vulnerable_groups.join(', ') || '—'}</dd>
              <dt>Infra score</dt><dd className="mono">{Math.round((data.area.infra[c.category] || 0) * 100)}% provisioned</dd>
            </dl>
          </Card>
          <Card title="Linked projects">
            {data.projects.length ? data.projects.map((p) => (
              <div key={p.id} className="stack" style={{ marginBottom: 10 }}>
                <div className="row-between"><Link to={`/projects?id=${p.id}`}><strong>{p.title}</strong></Link><StatusBadge status={p.status} /></div>
                <div className="xs muted">{p.source === 'plan' ? 'Existing plan' : 'AI recommended'} · {money(p.cost_local, p.country)} · {p.scheme}</div>
              </div>
            )) : <p className="small muted">No project yet.</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
