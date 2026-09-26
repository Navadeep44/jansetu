// Chart conventions (dataviz skill): fixed categorical order, thin marks, recessive grid, legend for >=2 series,
// tooltip on hover, single axis, text in text tokens (never series colour).
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SECTORS, SECTOR_KEYS } from '../../lib/format'

const AXIS = { stroke: '#94a3b8', fontSize: 12, tickLine: false }
const GRID = <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
const tipStyle = { contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }, labelStyle: { color: '#0f172a', fontWeight: 600 } }

export function TrendChart({ data, height = 260, sectors = SECTOR_KEYS }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="week" {...AXIS} />
        <YAxis {...AXIS} allowDecimals={false} />
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#475569' }} iconType="circle" />
        {sectors.map((s) => (
          <Area isAnimationActive={false} key={s} type="monotone" dataKey={s} name={SECTORS[s].short} stackId="1" stroke="#fff" strokeWidth={1.5}
            fill={SECTORS[s].hex} fillOpacity={0.9} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HBar({ data, dataKey, nameKey = 'name', height, color = '#2a78d6', format = (v) => v, colorBy }) {
  const h = height || Math.max(160, data.length * 34 + 30)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap={6}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" {...AXIS} tickFormatter={format} />
        <YAxis type="category" dataKey={nameKey} {...AXIS} width={120} />
        <Tooltip {...tipStyle} formatter={(v) => format(v)} cursor={{ fill: '#f1f5f9' }} />
        <Bar isAnimationActive={false} dataKey={dataKey} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fill: '#334155', formatter: format }}>
          {data.map((d, i) => <Cell key={i} fill={colorBy ? colorBy(d) : color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BeforeAfter({ data, height = 220 }) {
  // data: [{ period: 'Before', treated: x, comparison: y }, { period: 'After', ... }]
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="period" {...AXIS} interval={0} padding={{ left: 40, right: 40 }} />
        <YAxis {...AXIS} />
        <Tooltip {...tipStyle} formatter={(v) => `${v} per 1k households / month`} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        <Line isAnimationActive={false} type="linear" dataKey="treated" name="Project area" stroke="#2a78d6" strokeWidth={2} dot={{ r: 5 }} />
        <Line isAnimationActive={false} type="linear" dataKey="comparison" name="Comparison areas" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GroupedBars({ data, keys, nameKey = 'name', height = 280, colors, labels, format = (v) => v }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
        {GRID}
        <XAxis dataKey={nameKey} {...AXIS} interval={0} />
        <YAxis {...AXIS} tickFormatter={format} />
        <Tooltip {...tipStyle} formatter={(v) => format(v)} cursor={{ fill: '#f1f5f9' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
        {keys.map((k, i) => <Bar isAnimationActive={false} key={k} dataKey={k} name={labels?.[i] || k} fill={colors[i]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
