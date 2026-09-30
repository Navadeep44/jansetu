// Chart conventions (dataviz skill): fixed categorical order, thin marks, recessive grid, legend for >=2 series,
// tooltip on hover, single axis, text in text tokens (never series colour). All chart words go through useT().
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useT } from '../../i18n'
import { SECTORS, SECTOR_KEYS } from '../../lib/format'

const AXIS = { stroke: '#94a3b8', fontSize: 12, tickLine: false }
const GRID = <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
const tipStyle = { contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }, labelStyle: { color: '#0f172a', fontWeight: 600 } }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "09 Sep" or "2026-05" -> day/month words in the chosen language
export function useMonthLabel() {
  const t = useT()
  return (v) => {
    const s = String(v ?? '')
    const iso = s.match(/^(\d{4})-(\d{2})$/)
    if (iso) return `${t(MONTHS[Number(iso[2]) - 1])} ${iso[1].slice(2)}`
    return s.replace(/[A-Z][a-z]{2}/, (m) => (MONTHS.includes(m) ? t(m) : m))
  }
}

export function TrendChart({ data, height = 260, sectors = SECTOR_KEYS }) {
  const t = useT()
  const ml = useMonthLabel()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="week" {...AXIS} tickFormatter={ml} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip {...tipStyle} labelFormatter={(v) => t('Week of {d}', { d: ml(v) })} formatter={(v, name) => [t('{n} reports', { n: v }), name]} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} iconType="circle" />
        {sectors.map((s) => (
          <Area isAnimationActive={false} key={s} type="monotone" dataKey={s} name={t(SECTORS[s].short)} stackId="1" stroke="#fff" strokeWidth={1.5}
            fill={SECTORS[s].hex} fillOpacity={0.9} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HBar({ data, dataKey, nameKey = 'name', height, color = '#2a78d6', format = (v) => v, colorBy, labelWidth = 130 }) {
  const t = useT()
  const h = height || Math.max(160, data.length * 34 + 30)
  const rows = data.map((d) => ({ ...d, [nameKey]: typeof d[nameKey] === 'string' ? t(d[nameKey]) : d[nameKey] }))
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 44, left: 4, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={format} />
        <YAxis type="category" dataKey={nameKey} {...AXIS} width={labelWidth} />
        <Tooltip {...tipStyle} formatter={(v) => [format(v), t('Reports')]} cursor={{ fill: '#f1f5f9' }} />
        <Bar isAnimationActive={false} dataKey={dataKey} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fill: '#334155', formatter: format }}>
          {rows.map((d, i) => <Cell key={i} fill={colorBy ? colorBy(d) : color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BeforeAfter({ data, height = 220 }) {
  // data: [{ period: 'Before', treated: x, comparison: y }, { period: 'After', ... }]
  const t = useT()
  const rows = data.map((d) => ({ ...d, period: t(d.period) }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="period" {...AXIS} interval={0} padding={{ left: 40, right: 40 }} />
        <YAxis {...AXIS} />
        <Tooltip {...tipStyle} formatter={(v, name) => [t('{n} complaints per 1,000 families a month', { n: v }), name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Line isAnimationActive={false} type="linear" dataKey="treated" name={t('Project area')} stroke="#2a78d6" strokeWidth={2} dot={{ r: 5 }} />
        <Line isAnimationActive={false} type="linear" dataKey="comparison" name={t('Similar areas')} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GroupedBars({ data, keys, nameKey = 'name', height = 280, colors, labels, format = (v) => v }) {
  const t = useT()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
        {GRID}
        <XAxis dataKey={nameKey} {...AXIS} interval={0} tickFormatter={(v) => (typeof v === 'string' ? t(v) : v)} />
        <YAxis {...AXIS} tickFormatter={format} />
        <Tooltip {...tipStyle} formatter={(v) => format(v)} cursor={{ fill: '#f1f5f9' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        {keys.map((k, i) => <Bar isAnimationActive={false} key={k} dataKey={k} name={t(labels?.[i] || k)} fill={colors[i]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
