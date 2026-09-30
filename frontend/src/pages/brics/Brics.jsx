import { useMemo, useState } from 'react'
import { Lock, Radio, Server } from 'lucide-react'
import { api } from '../../api/client'
import { useAsync } from '../../lib/useAsync'
import { GroupedBars } from '../../components/charts/Charts'
import { Badge, Card, Loading, PageHead, SectorTag, Seg } from '../../components/ui'
import { SECTORS, SECTOR_KEYS, fmt } from '../../lib/format'

const METRICS = {
  avg_ngi: { label: 'Average Need-Gap Index', fmt: (v) => v?.toFixed?.(1) ?? '–' },
  avg_deficit: { label: 'Average infrastructure deficit', fmt: (v) => (v == null ? '–' : `${Math.round(v * 100)}%`) },
  demand_per_10k_households: { label: 'Households reporting per 10k', fmt: (v) => v?.toFixed?.(1) ?? 'suppressed' },
  silent_zones: { label: 'Silent zones', fmt: (v) => fmt(v) },
}

export default function Brics() {
  const { data, loading } = useAsync(() => api.brics(), [])
  const [metric, setMetric] = useState('avg_ngi')
  const [sector, setSector] = useState('water')
  const chart = useMemo(() => (data || []).map((n) => ({ name: n.name || n.country, value: n.sectors?.[sector]?.[metric] ?? null, status: n.node_status }))
    .filter((r) => r.value !== null), [data, metric, sector])
  return (
    <div className="stack-md">
      <PageHead title="BRICS comparison" eyebrow="Open to everyone" steps={["Each country keeps its own data", "Only totals are shared", "Compare needs side by side"]}>Each country keeps its own data. Only totals are shared, never personal details.</PageHead>
      <div className="grid g-3">
        <Card><div className="row"><span className="icon-tile"><Server size={20} aria-hidden="true" /></span><div><strong>Sovereign nodes</strong><div className="small muted">Data stays in-country: satisfies India DPDP, Brazil LGPD, SA POPIA, Russia 152-FZ, China PIPL.</div></div></div></Card>
        <Card><div className="row"><span className="icon-tile"><Lock size={20} aria-hidden="true" /></span><div><strong>Privacy-safe exchange</strong><div className="small muted">k-anonymity (cells under 5 households suppressed) and optional differential-privacy noise.</div></div></div></Card>
        <Card><div className="row"><span className="icon-tile"><Radio size={20} aria-hidden="true" /></span><div><strong>Common taxonomy</strong><div className="small muted">Six SDG-mapped sectors, Open311 service codes and SDMX-style indicators make nodes comparable.</div></div></div></Card>
      </div>
      <Card title="Compare nodes" sub="Live nodes compute aggregates from real-time data; simulated partner nodes are illustrative placeholders."
        actions={<>
          <select className="select" style={{ width: 'auto', minHeight: 36 }} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
            {SECTOR_KEYS.map((s) => <option key={s} value={s}>{SECTORS[s].label}</option>)}</select>
          <Seg label="Metric" value={metric} onChange={setMetric} options={Object.entries(METRICS).map(([k, v]) => ({ value: k, label: v.label.split(' ').slice(0, 2).join(' ') }))} />
        </>}>
        {loading ? <Loading height={300} /> : (
          <>
            <div className="small muted" style={{ marginBottom: 6 }}>{METRICS[metric].label} · <SectorTag sector={sector} /></div>
            <GroupedBars data={chart} keys={['value']} colors={[SECTORS[sector].hex]} labels={[METRICS[metric].label]} format={METRICS[metric].fmt} height={300} />
          </>
        )}
      </Card>
      <Card title="Exchange payload" sub="Exactly what each node publishes (no rows, no PII)">
        {loading ? <Loading /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Node</th><th>Status</th><th className="num">Requests</th><th className="num">Languages</th><th className="num">Alignment</th>
              {SECTOR_KEYS.map((s) => <th key={s} className="num">{SECTORS[s].short} NGI</th>)}</tr></thead>
            <tbody>{data.map((n) => (
              <tr key={n.country}><td><strong>{n.name}</strong> <span className="mono xs muted">{n.country}</span></td>
                <td>{n.node_status === 'live' ? <Badge tone="green">live</Badge> : <Badge>simulated</Badge>}</td>
                <td className="num">{fmt(n.requests)}</td><td className="num">{n.languages}</td><td className="num">{n.alignment_score ?? '–'}%</td>
                {SECTOR_KEYS.map((s) => <td key={s} className="num">{n.sectors?.[s]?.avg_ngi ?? '–'}</td>)}</tr>))}</tbody>
          </table></div>
        )}
        <p className="help mt">API: <span className="mono">GET /api/brics/exchange</span> (all nodes) and <span className="mono">GET /api/brics/node/IN</span> (one sovereign node's outbound aggregate).</p>
      </Card>
    </div>
  )
}
