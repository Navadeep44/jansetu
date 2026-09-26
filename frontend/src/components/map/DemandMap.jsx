import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { SECTORS, fmt, ngiColor } from '../../lib/format'

export const REGIONS = {
  all: { label: 'All nodes', center: [2, 30], zoom: 2 },
  adilabad: { label: 'Adilabad (IN)', center: [19.5, 78.72], zoom: 9 },
  koraput: { label: 'Koraput (IN)', center: [18.9, 82.8], zoom: 9 },
  delhi: { label: 'Delhi (IN)', center: [28.64, 77.18], zoom: 11 },
  saopaulo: { label: 'São Paulo (BR)', center: [-23.66, -46.6], zoom: 10 },
  gauteng: { label: 'Gauteng (ZA)', center: [-26.15, 28.05], zoom: 9 },
}
export const COUNTRY_REGION = { IN: 'adilabad', BR: 'saopaulo', ZA: 'gauteng', all: 'all' }

const HOT = { hot_99: '#7f1d1d', hot_95: '#dc2626', hot_90: '#f59e0b', cold_95: '#0369a1', not_significant: '#94a3b8' }

function FlyTo({ region, fitPoints }) {
  const map = useMap()
  const fitKey = fitPoints ? fitPoints.map((a) => `${a.lat},${a.lng}`).join('|') : ''
  useEffect(() => {
    if (fitPoints?.length) {
      map.fitBounds(fitPoints.map((a) => [a.lat, a.lng]), { padding: [30, 30], maxZoom: 10 })
      return
    }
    const r = REGIONS[region] || REGIONS.all
    map.flyTo(r.center, r.zoom, { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, map, fitKey])
  return null
}

export default function DemandMap({ areas = [], layer = 'ngi', region = 'all', sector, onSelect, tall = false, plans = [], fit = false }) {
  const maxPop = useMemo(() => Math.max(1, ...areas.map((a) => a.population || 1)), [areas])
  const planByArea = useMemo(() => {
    const m = {}
    plans.forEach((p) => { m[p.area_id] = (m[p.area_id] || 0) + (p.cost_usd || 0) })
    return m
  }, [plans])
  const r0 = REGIONS[region] || REGIONS.all

  return (
    <div className={`map-box ${tall ? 'tall' : ''}`}>
      <MapContainer center={r0.center} zoom={r0.zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }} worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FlyTo region={region} fitPoints={fit ? areas : null} />
        {areas.map((a, i) => {
          const ngi = sector && sector !== 'all' ? a.sectors?.[sector]?.ngi ?? a.ngi_max : a.ngi_max
          const radius = 6 + 16 * Math.sqrt((a.population || 1) / maxPop)
          let color = ngiColor(ngi), fill = ngiColor(ngi), dash, weight = 1.5, opacity = 0.85
          if (layer === 'hotspot') { color = fill = HOT[a.hotspot?.class] || HOT.not_significant }
          if (layer === 'silent') {
            if (a.silent_zone) { color = '#6d28d9'; fill = '#8b5cf6'; dash = '5 4'; weight = 3 } else { color = fill = '#cbd5e1'; opacity = 0.5 }
          }
          if (layer === 'plans') {
            const inv = planByArea[a.area_id] || 0
            color = inv ? '#0f172a' : '#cbd5e1'
            fill = ngiColor(ngi)
            weight = inv ? 4 : 1
          }
          return (
            <CircleMarker key={`${a.area_id}-${i}`} center={[a.lat, a.lng]} radius={radius}
              pathOptions={{ color, fillColor: fill, fillOpacity: opacity, weight, dashArray: dash }}
              eventHandlers={{ click: () => onSelect && onSelect(a) }}>
              <Tooltip direction="top" offset={[0, -4]}>
                <div style={{ minWidth: 180 }}>
                  <strong>{a.area}</strong> <span style={{ color: '#64748b' }}>{a.district}</span><br />
                  Need-Gap Index: <strong>{ngi?.toFixed?.(0)}</strong>{a.top_sector ? ` · top: ${SECTORS[a.top_sector]?.short}` : ''}<br />
                  Reports: {fmt(a.reports)} · per 1k HH: {a.demand_per_1000hh}<br />
                  Hotspot Gi* z = {a.hotspot?.z} {a.hotspot?.class?.startsWith('hot') ? '(hot)' : ''}<br />
                  {a.silent_zone && <span style={{ color: '#6d28d9', fontWeight: 600 }}>Silent zone: {a.silent_sectors.map((s) => SECTORS[s]?.short).join(', ')}</span>}
                  {planByArea[a.area_id] ? <div>Planned investment: ${fmt(planByArea[a.area_id])}</div> : null}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export function MapLegend({ layer }) {
  if (layer === 'hotspot') return (
    <div className="legend" aria-label="Legend">
      <span><i className="legend-swatch" style={{ background: HOT.hot_99 }} />Hotspot 99%</span>
      <span><i className="legend-swatch" style={{ background: HOT.hot_95 }} />Hotspot 95%</span>
      <span><i className="legend-swatch" style={{ background: HOT.hot_90 }} />Hotspot 90%</span>
      <span><i className="legend-swatch" style={{ background: HOT.cold_95 }} />Cold spot</span>
      <span><i className="legend-swatch" style={{ background: HOT.not_significant }} />Not significant</span>
    </div>
  )
  if (layer === 'silent') return (
    <div className="legend"><span><i className="legend-swatch" style={{ background: '#8b5cf6', border: '2px dashed #6d28d9' }} />Silent zone: severe deficit, few reports</span><span>Circle size = population</span></div>
  )
  return (
    <div className="legend" aria-label="Need-Gap Index legend">
      <span>Need-Gap Index:</span>
      {[['<38', '#fef3c7'], ['38–50', '#fcd34d'], ['50–62', '#f59e0b'], ['62–75', '#dc2626'], ['75+', '#7f1d1d']].map(([l, c]) => (
        <span key={l}><i className="legend-swatch" style={{ background: c, border: '1px solid #cbd5e1' }} />{l}</span>
      ))}
      {layer === 'plans' && <span><i className="legend-swatch" style={{ border: '3px solid #0f172a' }} />Has planned investment</span>}
      <span>Circle size = population</span>
    </div>
  )
}
