import { useEffect, useMemo, useState } from 'react'
import { Check, Crosshair, HelpCircle, Info, MapPin, RefreshCw, X } from 'lucide-react'
import { api } from '../../api/client'
import { Badge } from '../ui'

/**
 * Calculates distance in kilometers between two geo-coordinates
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * LocationPicker Component
 * Implements clean 3-step hierarchical selection: State -> District -> Village / City / Ward
 * with real-world Indian demographic data, GPS auto-detect, and Gram Sabha filtering.
 */
export default function LocationPicker({
  areas: propAreas,
  value,
  onChange,
  onCoordsChange,
  filterSetting = 'all', // 'all' | 'rural' | 'urban'
  showSummary = true,
  allowGps = true,
  required = false,
  disabled = false,
  stateLabel = '1. State / Province',
  districtLabel = '2. District',
  villageLabel = '3. Village / Gram Panchayat / Ward / City',
  idPrefix = 'loc',
}) {
  const [areas, setAreas] = useState(propAreas || [])
  const [loading, setLoading] = useState(!propAreas?.length)
  const [selectedState, setSelectedState] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState(value ? String(value) : '')
  const [gpsLocating, setGpsLocating] = useState(false)
  const [gpsMessage, setGpsMessage] = useState(null)

  // Fetch areas if not passed via props
  useEffect(() => {
    if (propAreas && propAreas.length > 0) {
      setAreas(propAreas)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .areas()
      .then((res) => {
        if (!cancelled) {
          setAreas(Array.isArray(res) ? res : [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAreas([])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [propAreas])

  // Sync internal state when external value changes
  useEffect(() => {
    if (value && areas.length > 0) {
      const match = areas.find((a) => String(a.id) === String(value))
      if (match) {
        setSelectedState(match.state)
        setSelectedDistrict(match.district)
        setSelectedAreaId(String(match.id))
      }
    } else if (!value) {
      setSelectedAreaId('')
    }
  }, [value, areas])

  // Filtered areas based on setting (e.g. Gram Sabha: rural)
  const applicableAreas = useMemo(() => {
    if (filterSetting === 'rural') {
      return areas.filter((a) => a.setting === 'rural' || a.level === 'village' || a.level === 'block')
    }
    if (filterSetting === 'urban') {
      return areas.filter((a) => a.setting === 'urban' || a.level === 'ward' || a.level === 'district')
    }
    return areas
  }, [areas, filterSetting])

  // Unique sorted States
  const availableStates = useMemo(() => {
    const stateCounts = {}
    applicableAreas.forEach((a) => {
      if (a.state) {
        stateCounts[a.state] = (stateCounts[a.state] || 0) + 1
      }
    })
    return Object.keys(stateCounts)
      .sort((a, b) => a.localeCompare(b))
      .map((st) => ({
        name: st,
        count: stateCounts[st],
      }))
  }, [applicableAreas])

  // Unique sorted Districts for selected State
  const availableDistricts = useMemo(() => {
    if (!selectedState) return []
    const distCounts = {}
    applicableAreas.forEach((a) => {
      if (a.state === selectedState && a.district) {
        distCounts[a.district] = (distCounts[a.district] || 0) + 1
      }
    })
    return Object.keys(distCounts)
      .sort((a, b) => a.localeCompare(b))
      .map((dst) => ({
        name: dst,
        count: distCounts[dst],
      }))
  }, [applicableAreas, selectedState])

  // Villages / Wards / Cities for selected State + District
  const availableVillages = useMemo(() => {
    if (!selectedState || !selectedDistrict) return []
    return applicableAreas
      .filter((a) => a.state === selectedState && a.district === selectedDistrict)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [applicableAreas, selectedState, selectedDistrict])

  // Currently selected area object
  const currentAreaObj = useMemo(() => {
    if (!selectedAreaId) return null
    return areas.find((a) => String(a.id) === String(selectedAreaId)) || null
  }, [areas, selectedAreaId])

  // Handle State Change
  const handleStateChange = (e) => {
    const newState = e.target.value
    setSelectedState(newState)
    setSelectedDistrict('')
    setSelectedAreaId('')
    setGpsMessage(null)
    onChange?.('', null)
  }

  // Handle District Change
  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value
    setSelectedDistrict(newDistrict)
    setSelectedAreaId('')
    setGpsMessage(null)
    onChange?.('', null)
  }

  // Handle Village/Ward Selection
  const handleVillageChange = (e) => {
    const newId = e.target.value
    setSelectedAreaId(newId)
    setGpsMessage(null)
    if (newId) {
      const found = areas.find((a) => String(a.id) === String(newId))
      onChange?.(Number(newId), found || null)
      if (found?.lat && found?.lng && onCoordsChange) {
        onCoordsChange({ lat: found.lat, lng: found.lng })
      }
    } else {
      onChange?.('', null)
    }
  }

  // Clear Selection
  const handleClear = () => {
    setSelectedState('')
    setSelectedDistrict('')
    setSelectedAreaId('')
    setGpsMessage(null)
    onChange?.('', null)
  }

  // Auto-detect location via GPS and match nearest village/ward
  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setGpsMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' })
      return
    }
    setGpsLocating(true)
    setGpsMessage(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        let closest = null
        let minDistance = Infinity

        areas.forEach((a) => {
          if (a.lat && a.lng) {
            const dist = haversineKm(latitude, longitude, a.lat, a.lng)
            if (dist < minDistance) {
              minDistance = dist
              closest = a
            }
          }
        })

        setGpsLocating(false)
        if (closest && minDistance <= 80) {
          setSelectedState(closest.state)
          setSelectedDistrict(closest.district)
          setSelectedAreaId(String(closest.id))
          onChange?.(closest.id, closest)
          if (onCoordsChange) {
            onCoordsChange({ lat: latitude, lng: longitude })
          }
          setGpsMessage({
            type: 'success',
            text: `Detected location matched to ${closest.name} (${minDistance.toFixed(1)} km away).`,
          })
        } else if (closest) {
          // Nearest is somewhat far but set coords
          setSelectedState(closest.state)
          setSelectedDistrict(closest.district)
          setSelectedAreaId(String(closest.id))
          onChange?.(closest.id, closest)
          if (onCoordsChange) {
            onCoordsChange({ lat: latitude, lng: longitude })
          }
          setGpsMessage({
            type: 'info',
            text: `Closest administrative unit found: ${closest.name}, ${closest.district} (${minDistance.toFixed(0)} km away).`,
          })
        } else {
          setGpsMessage({
            type: 'info',
            text: `GPS coordinates captured: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°. Please choose your state & district.`,
          })
          if (onCoordsChange) {
            onCoordsChange({ lat: latitude, lng: longitude })
          }
        }
      },
      (err) => {
        setGpsLocating(false)
        setGpsMessage({
          type: 'error',
          text: `Could not fetch GPS location: ${err.message}. Please select your location from the lists below.`,
        })
      },
      { timeout: 9000, enableHighAccuracy: true }
    )
  }

  return (
    <div className="location-picker-container stack-sm" style={{ width: '100%' }}>
      {/* Quick GPS Bar */}
      {allowGps && (
        <div className="row-between" style={{ marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <span className="small muted">
            Hierarchical Location: <strong style={{ color: 'var(--text-heading)' }}>State → District → Village / City</strong>
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleGpsDetect}
            disabled={gpsLocating || disabled}
            style={{ fontSize: '0.82rem', padding: '4px 10px', height: 'auto', borderRadius: 6 }}
          >
            <Crosshair size={14} className={gpsLocating ? 'spin' : ''} aria-hidden="true" />
            {gpsLocating ? 'Detecting GPS…' : 'Use My GPS Location'}
          </button>
        </div>
      )}

      {/* GPS feedback message */}
      {gpsMessage && (
        <div
          className={`alert ${gpsMessage.type === 'error' ? 'alert-danger' : gpsMessage.type === 'success' ? 'alert-success' : 'alert-info'}`}
          style={{ padding: '6px 12px', fontSize: '0.85rem' }}
        >
          {gpsMessage.type === 'success' && <Check size={15} />}
          {gpsMessage.type === 'error' && <X size={15} />}
          {gpsMessage.type === 'info' && <Info size={15} />}
          <div>{gpsMessage.text}</div>
        </div>
      )}

      {/* 3 Hierarchical Selectors in a Grid */}
      <div className="grid g-3" style={{ gap: 12 }}>
        {/* Step 1: State */}
        <div className="field">
          <label htmlFor={`${idPrefix}-state`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {stateLabel} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </label>
          <select
            id={`${idPrefix}-state`}
            className="select"
            value={selectedState}
            onChange={handleStateChange}
            disabled={disabled || loading}
            required={required}
            style={{
              borderColor: selectedState ? 'var(--primary)' : undefined,
              background: selectedState ? '#f0f9ff' : undefined,
            }}
          >
            <option value="">— Select State —</option>
            {availableStates.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} ({st.count} {st.count === 1 ? 'place' : 'places'})
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: District */}
        <div className="field">
          <label htmlFor={`${idPrefix}-district`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {districtLabel} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </label>
          <select
            id={`${idPrefix}-district`}
            className="select"
            value={selectedDistrict}
            onChange={handleDistrictChange}
            disabled={disabled || loading || !selectedState}
            required={required}
            style={{
              borderColor: selectedDistrict ? 'var(--primary)' : undefined,
              background: selectedDistrict ? '#f0f9ff' : undefined,
            }}
          >
            <option value="">{selectedState ? '— Select District —' : '← Select State First'}</option>
            {availableDistricts.map((dst) => (
              <option key={dst.name} value={dst.name}>
                {dst.name} ({dst.count} {dst.count === 1 ? 'unit' : 'units'})
              </option>
            ))}
          </select>
        </div>

        {/* Step 3: Village / City / Ward */}
        <div className="field">
          <label htmlFor={`${idPrefix}-village`} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {villageLabel} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
          </label>
          <select
            id={`${idPrefix}-village`}
            className="select"
            value={selectedAreaId}
            onChange={handleVillageChange}
            disabled={disabled || loading || !selectedDistrict}
            required={required}
            style={{
              borderColor: selectedAreaId ? 'var(--green, #16a34a)' : undefined,
              background: selectedAreaId ? '#f0fdf4' : undefined,
              fontWeight: selectedAreaId ? 600 : 'normal',
            }}
          >
            <option value="">
              {!selectedState
                ? '← Select State First'
                : !selectedDistrict
                ? '← Select District First'
                : '— Select Village / City / Ward —'}
            </option>
            {availableVillages.map((a) => {
              const alias = a.aliases && a.aliases[0] && a.aliases[0] !== a.name ? ` (${a.aliases[0]})` : ''
              const settingBadge = a.setting === 'rural' ? ' [Rural GP]' : ' [Urban Ward]'
              return (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {alias}
                  {settingBadge}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Selected Location Information Card */}
      {showSummary && currentAreaObj && (
        <div
          className="card"
          style={{
            marginTop: 8,
            padding: '12px 16px',
            background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: 'none',
          }}
        >
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: currentAreaObj.setting === 'rural' ? '#dcfce7' : '#e0f2fe',
                  color: currentAreaObj.setting === 'rural' ? '#15803d' : '#0369a1',
                }}
              >
                <MapPin size={18} />
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                  {currentAreaObj.name}
                  {currentAreaObj.aliases?.[0] && currentAreaObj.aliases[0] !== currentAreaObj.name ? (
                    <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                      ({currentAreaObj.aliases[0]})
                    </span>
                  ) : null}
                </div>
                <div className="xs muted mono" style={{ marginTop: 2 }}>
                  {currentAreaObj.state} &gt; {currentAreaObj.district} &gt; {currentAreaObj.name}
                </div>
              </div>
            </div>

            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <Badge tone={currentAreaObj.setting === 'rural' ? 'green' : 'blue'}>
                {currentAreaObj.setting === 'rural' ? '🌾 Rural Village / GP' : '🏙️ Urban Ward'}
              </Badge>
              {currentAreaObj.population > 0 && (
                <Badge tone="gray">
                  Pop: {Number(currentAreaObj.population).toLocaleString()}
                </Badge>
              )}
              {currentAreaObj.admin_code && (
                <span className="badge badge-dark xs mono">{currentAreaObj.admin_code}</span>
              )}
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={handleClear}
                title="Change or Clear Selection"
                style={{ height: 26, padding: '2px 8px', fontSize: '0.78rem' }}
              >
                <X size={12} /> Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
