import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { SECTORS, fmt, money, ngiColor } from '../../lib/format'
import { useT } from '../../i18n'

export const REGIONS = {
  all: { label: 'All India', center: [23.2, 81.0], zoom: 5 },
  adilabad: { label: 'Adilabad, Telangana', center: [19.5, 78.72], zoom: 9 },
  hyderabad: { label: 'Hyderabad, Telangana', center: [17.4, 78.46], zoom: 11 },
  koraput: { label: 'Koraput, Odisha', center: [18.9, 82.8], zoom: 9 },
  delhi: { label: 'Delhi', center: [28.64, 77.18], zoom: 11 },
  gaya: { label: 'Gaya, Bihar', center: [24.62, 84.85], zoom: 9 },
  bahraich: { label: 'Bahraich, Uttar Pradesh', center: [27.65, 81.6], zoom: 9 },
}
// which map view to open when an official picks a state
export const STATE_REGION = { all: 'all', Telangana: 'adilabad', Odisha: 'koraput', Delhi: 'delhi', Bihar: 'gaya', 'Uttar Pradesh': 'bahraich' }
export const COUNTRY_REGION = STATE_REGION // legacy name

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
    plans.forEach((p) => { m[p.area_id] = (m[p.area_id] || 0) + (p.cost_local || 0) })
    return m
  }, [plans])
  const r0 = REGIONS[region] || REGIONS.all
  const t = useT()

  return (
    <div className={`map-box ${tall ? 'tall' : ''}`}>
      <MapContainer center={r0.center} zoom={r0.zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }} worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                  {t('Need level')}: <strong>{ngi?.toFixed?.(0)} / 100</strong>{a.top_sector ? ` · ${t('biggest need')}: ${t(SECTORS[a.top_sector]?.short)}` : ''}<br />
                  {t('Reports')}: {fmt(a.reports)}<br />
                  {a.hotspot?.class?.startsWith('hot') && <><span style={{ color: '#b91c1c', fontWeight: 600 }}>{t('Hotspot')}</span><br /></>}
                  {a.silent_zone && <span style={{ color: '#6d28d9', fontWeight: 600 }}>{t('Silent area')}: {a.silent_sectors.map((s) => t(SECTORS[s]?.short)).join(', ')}</span>}
                  {planByArea[a.area_id] ? <div>{t('Money already planned')}: {money(planByArea[a.area_id])}</div> : null}
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
  const t = useT()
  if (layer === 'hotspot') return (
    <div className="legend" aria-label={t('Legend')}>
      <span><i className="legend-swatch" style={{ background: HOT.hot_99 }} />{t('Very strong hotspot')}</span>
      <span><i className="legend-swatch" style={{ background: HOT.hot_95 }} />{t('Strong hotspot')}</span>
      <span><i className="legend-swatch" style={{ background: HOT.hot_90 }} />{t('Hotspot')}</span>
      <span><i className="legend-swatch" style={{ background: HOT.cold_95 }} />{t('Few reports')}</span>
      <span><i className="legend-swatch" style={{ background: HOT.not_significant }} />{t('Normal')}</span>
    </div>
  )
  if (layer === 'silent') return (
    <div className="legend"><span><i className="legend-swatch" style={{ background: '#8b5cf6', border: '2px dashed #6d28d9' }} />{t('Silent area: big need, few reports')}</span><span>{t('Bigger circle = more people')}</span></div>
  )
  return (
    <div className="legend" aria-label={t('Legend')}>
      <span>{t('Need level')}:</span>
      {[['Low', '#fef3c7'], ['Some', '#fcd34d'], ['Medium', '#f59e0b'], ['High', '#dc2626'], ['Very high', '#7f1d1d']].map(([l, c]) => (
        <span key={l}><i className="legend-swatch" style={{ background: c, border: '1px solid #cbd5e1' }} />{t(l)}</span>
      ))}
      {layer === 'plans' && <span><i className="legend-swatch" style={{ border: '3px solid #0f172a' }} />{t('Money already planned')}</span>}
      <span>{t('Bigger circle = more people')}</span>
    </div>
  )
}
