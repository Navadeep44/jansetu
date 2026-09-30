import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Camera, CheckCircle2, CloudOff, Copy, FileText,
  HelpCircle, Info, Landmark, MapPin, Send, Share2, ShieldAlert,
  ShieldCheck, Sparkles, ThumbsUp, UserCheck, Users, Vote, X
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { tr } from '../../i18n/strings'
import VoiceInput, { SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import LocationPicker from '../../components/common/LocationPicker'
import { Badge, Card, ErrorBox, SectorTag, Tabs } from '../../components/ui'
import { LANG_NAMES, pct } from '../../lib/format'

const SPEAK_LANGS = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa', 'or', 'bho']

const GRAM_SABHA_TEMPLATES = [
  {
    label: '💧 Drinking Water & Borewell',
    text: 'Drinking water borewell dried up; new deep submersible solar pump and pipeline needed for ward 2 (140 votes).',
  },
  {
    label: '🛣️ All-Weather Road Link',
    text: 'PMGSY all-weather blacktop road link needed from main highway to village school and clinic (95 people).',
  },
  {
    label: '🏥 PHC Doctor & Medicine Supply',
    text: 'Primary Health Centre lacks regular ANM nurse and essential fever/antibiotic medicine stock (80 people).',
  },
  {
    label: '⚡ Transformer & Power Supply',
    text: '3-phase transformer burnt out; agricultural feeder power cut for 6 days (110 people).',
  },
  {
    label: '🚯 Drainage & Sanitation',
    text: 'Open drain overflowing onto main village street; construction of covered pucca drain required (75 votes).',
  },
  {
    label: '🏫 School Classrooms & Boundary',
    text: 'Government primary school roof leaking and requires 2 additional classrooms and boundary wall (65 people).',
  },
]

function Understanding({ u, onOptionClick, isConfirmed }) {
  if (!u) return null
  return (
    <div className="stack-sm">
      {/* Native Language Audio & Summary Banner */}
      <div style={{
        background: isConfirmed ? '#f0fdf4' : '#eff6ff',
        border: `1px solid ${isConfirmed ? '#86efac' : '#bfdbfe'}`,
        borderRadius: 8,
        padding: '12px 14px'
      }}>
        <div className="row-between" style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: isConfirmed ? '#166534' : '#1e40af', fontSize: '0.88rem' }}>
            {LANG_NAMES[u.language] || u.language} · What JanSetu Understood
          </span>
          <SpeakButton text={u.native_summary || u.translated_text} lang={u.language || 'en'} />
        </div>
        <p style={{ margin: 0, fontSize: '0.94rem', color: isConfirmed ? '#14532d' : '#1e3a8a', fontWeight: 500, lineHeight: 1.4 }}>
          {u.native_summary || u.translated_text}
        </p>
      </div>

      {/* Clarifying Question & Confirmation Dialogue */}
      {u.clarifying_question && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 8,
          padding: '12px 14px'
        }}>
          <div className="row" style={{ gap: 6, color: '#92400e', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6 }}>
            <HelpCircle size={16} />
            <span>Clarifying Dialogue / पुष्टि संवाद:</span>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#78350f', lineHeight: 1.35 }}>
            {u.clarifying_question}
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {u.clarifying_options?.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className={`btn btn-xs ${opt.action === 'confirm' ? (isConfirmed ? 'btn-success' : 'btn-primary') : 'btn-outline'}`}
                style={opt.action === 'confirm' && isConfirmed ? { background: '#16a34a', color: '#fff', borderColor: '#16a34a' } : {}}
                onClick={() => onOptionClick ? onOptionClick(opt) : null}
              >
                {opt.action === 'confirm' && isConfirmed ? '✅ Confirmed by Citizen' : opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation indicator */}
      {isConfirmed && (
        <div className="row" style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, gap: 6, padding: '4px 0' }}>
          <CheckCircle2 size={16} />
          <span>You confirmed this problem description matches your area's need.</span>
        </div>
      )}

      {/* Technical breakdown */}
      <dl className="kv" style={{ marginTop: 8 }}>
        <dt>Language</dt>
        <dd>
          {LANG_NAMES[u.language] || u.language} <span className="muted small">({pct(u.language_confidence)})</span>
        </dd>
        <dt>Need</dt>
        <dd>
          <SectorTag sector={u.category} />
        </dd>
        <dt>Specific issue</dt>
        <dd>{u.subcategory_label}</dd>
        <dt>Type</dt>
        <dd>{u.request_type?.replace('_', ' ')}</dd>
        <dt>Severity</dt>
        <dd>
          <span className="mono">{u.severity}/5</span>{' '}
          {u.severity >= 4 && <Badge tone="red">risk to health / life</Badge>}
        </dd>
        {u.vulnerable_groups?.length > 0 && (
          <>
            <dt>Affects</dt>
            <dd>
              {u.vulnerable_groups.map((g) => (
                <Badge key={g} tone="violet">
                  {g.replace('_', ' ')}
                </Badge>
              ))}
            </dd>
          </>
        )}
        <dt>In English</dt>
        <dd className="small">
          {u.translated_text} <span className="muted xs">({u.translation_mode})</span>
        </dd>
        <dt>AI confidence</dt>
        <dd>
          <span className="mono">{pct(u.confidence)}</span>{' '}
          <span className="muted xs">
            {u.extraction_mode === 'llm' ? 'LLM' : 'offline multilingual rules'}
          </span>
        </dd>
      </dl>
    </div>
  )
}

export default function Report() {
  const { uiLang, t } = useApp()
  const L = (k) => t(k, tr(uiLang, k))
  const [tab, setTab] = useState('individual')
  const [text, setText] = useState('')
  const [speakLang, setSpeakLang] = useState(uiLang)
  const [audio, setAudio] = useState(null)
  const [photos, setPhotos] = useState([])
  const [coords, setCoords] = useState(null)
  const [areaId, setAreaId] = useState('')
  const [selectedAreaObj, setSelectedAreaObj] = useState(null)
  const [anonymous, setAnonymous] = useState(false)
  const [assisted, setAssisted] = useState(false)
  const [helper, setHelper] = useState('')
  const [gender, setGender] = useState('undisclosed')
  const [phone, setPhone] = useState('')
  const [preview, setPreview] = useState(null)
  const [confirmedUnderstood, setConfirmedUnderstood] = useState(false)
  const [areas, setAreas] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [nearby, setNearby] = useState([])
  const [supported, setSupported] = useState({})
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [copiedId, setCopiedId] = useState(false)
  const [outbox, setOutbox] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('js_outbox') || '[]')
    } catch {
      return []
    }
  })
  const [offlineMsg, setOfflineMsg] = useState(null)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handlePhotoChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setError(null)

    if (photos.length + files.length > 5) {
      setError(new Error('You can upload a maximum of 5 photos in total.'))
      return
    }

    const validFiles = []
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        setError(new Error(`"${f.name}" exceeds the 5MB size limit. Please choose a smaller image.`))
        return
      }
      validFiles.push(f)
    }
    setPhotos((prev) => [...prev, ...validFiles])
  }

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const shareTrackingId = async (tid) => {
    const trackUrl = `${window.location.origin}/track/${tid}`
    const shareData = {
      title: 'JanSetu Grievance Tracking ID',
      text: `My JanSetu grievance tracking ID is: ${tid}. Track progress at: ${trackUrl}`,
      url: trackUrl,
    }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        /* share dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(trackUrl)
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 3000)
    } catch {
      /* clipboard fallback */
    }
  }

  // Gram Sabha specific states
  const [meetingType, setMeetingType] = useState('rural') // 'rural' | 'urban' | 'all'
  const [facilitatorRole, setFacilitatorRole] = useState('Panchayat Secretary (Sachiv)')
  const [facilitatorName, setFacilitatorName] = useState('')
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0])
  const [attendeeCount, setAttendeeCount] = useState('95')
  const [transcript, setTranscript] = useState('')
  const [communityRes, setCommunityRes] = useState(null)

  const saveOutbox = (list) => {
    setOutbox(list)
    try {
      localStorage.setItem('js_outbox', JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }

  // Offline-first sync
  useEffect(() => {
    const flush = async () => {
      let list = []
      try {
        list = JSON.parse(localStorage.getItem('js_outbox') || '[]')
      } catch {
        list = []
      }
      if (!list.length || !navigator.onLine) return
      const left = []
      for (const item of list) {
        try {
          await api.intakeText(item)
        } catch {
          left.push(item)
        }
      }
      saveOutbox(left)
      if (left.length < list.length) {
        setOfflineMsg(`${list.length - left.length} saved request(s) sent now that you are online.`)
      }
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  // Check nearby demands
  useEffect(() => {
    if (!areaId && !coords) {
      setNearby([])
      return
    }
    api
      .nearby(areaId ? { area_id: areaId } : { lat: coords.lat, lng: coords.lng })
      .then((res) => setNearby(Array.isArray(res) ? res : []))
      .catch(() => setNearby([]))
  }, [areaId, coords])

  const meToo = async (c) => {
    try {
      const r = await api.support(c.id, phone, uiLang)
      setSupported((s) => ({ ...s, [c.id]: r }))
    } catch (e) {
      setError(e)
    }
  }

  useEffect(() => {
    setSpeakLang(uiLang)
  }, [uiLang])

  useEffect(() => {
    api
      .areas()
      .then((res) => setAreas(Array.isArray(res) ? res : []))
      .catch(() => setAreas([]))
  }, [])

  useEffect(() => {
    setConfirmedUnderstood(false)
    if (text.trim().length < 8) {
      setPreview(null)
      return
    }
    const h = setTimeout(() => api.preview(text, speakLang || uiLang).then(setPreview).catch(() => {}), 450)
    return () => clearTimeout(h)
  }, [text, speakLang, uiLang])

  const handleOptionClick = (opt) => {
    if (opt.action === 'confirm') {
      setConfirmedUnderstood(true)
    } else if (opt.append) {
      setText((prev) => (prev ? prev.trim() + ' ' + opt.append : opt.append))
      setConfirmedUnderstood(false)
    } else if (opt.action === 'use_location') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {}
        )
      }
    } else if (opt.action === 'focus_location') {
      const el = document.querySelector('select[aria-label="Village / Ward"]') || document.querySelector('select')
      if (el) el.focus()
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const f = new FormData()
      f.append('text', text)
      f.append('channel', assisted ? 'assisted' : 'web')
      if (coords) {
        f.append('lat', coords.lat)
        f.append('lng', coords.lng)
      }
      if (areaId) f.append('area_id', areaId)
      if (phone) f.append('phone', phone)
      f.append('anonymous', anonymous)
      f.append('gender', gender)
      if (assisted && helper) f.append('assisted_by', helper)
      if (!text && speakLang) f.append('language', speakLang)
      if (audio) f.append('audio', audio, 'voice.webm')
      if (photos && photos.length > 0) {
        f.append('photo', photos[0], photos[0].name)
        photos.forEach((p) => f.append('photos', p, p.name))
      }
      const res = await api.intakeForm(f)
      setResult(res)
      try {
        localStorage.setItem('js_last_tid', res.tracking_id)
      } catch {
        /* ignore */
      }
    } catch (err) {
      if (!navigator.onLine || !isOnline || err instanceof TypeError) {
        saveOutbox([
          ...outbox,
          {
            text,
            channel: assisted ? 'assisted' : 'web',
            area_id: areaId ? Number(areaId) : null,
            lat: coords?.lat,
            lng: coords?.lng,
            phone: phone || null,
            anonymous,
            gender,
            assisted_by: assisted ? helper : null,
          },
        ])
        setOfflineMsg(
          "You're offline — this will be sent automatically once you're back online."
        )
        setText('')
        setPhotos([])
      } else setError(err)
    } finally {
      setBusy(false)
    }
  }

  const submitCommunity = async (e) => {
    e.preventDefault()
    if (!areaId) {
      setError(new Error('Please select a State, District, and Village/Ward for this Gram Sabha meeting.'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const facilitatorLabel = `${facilitatorRole}: ${facilitatorName || 'Official'} (${attendeeCount} present on ${meetingDate})`
      const res = await api.community({
        transcript,
        area_id: Number(areaId),
        facilitator: facilitatorLabel,
      })
      setCommunityRes(res)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  const addTemplateResolution = (tplText) => {
    setTranscript((prev) => (prev ? `${prev.trim()}\n${tplText}` : tplText))
  }

  if (result) {
    const r = result
    return (
      <div className="stack-md" style={{ maxWidth: 860 }}>
        <div
          className={`alert ${
            r.reply_kind === 'safety'
              ? 'alert-danger'
              : r.reply_kind === 'ask_location' || r.reply_kind === 'clarify'
              ? 'alert-warn'
              : 'alert-success'
          }`}
          role="status"
        >
          {r.reply_kind === 'safety' ? (
            <ShieldAlert size={22} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={22} aria-hidden="true" />
          )}
          <div className="stack" style={{ gap: 6 }}>
            <strong style={{ fontSize: '1.05rem' }}>{r.reply}</strong>
            <div className="row">
              <SpeakButton text={r.reply} lang={r.request.language} label={L('listen')} />
            </div>
          </div>
        </div>
        {r.request.waiting_for && (
          <div className="card action-card">
            <h2>{r.request.waiting_for === 'location' ? 'Answer here: where is this?' : 'Answer here: what is it about?'}</h2>
            <ReplyBox
              tid={r.tracking_id}
              waitingFor={r.request.waiting_for}
              onReplied={(x) =>
                x.resolved &&
                api.track(r.tracking_id).then((t) =>
                  setResult({
                    ...r,
                    reply: x.reply,
                    reply_kind: 'ack',
                    request: t.request,
                    cluster: t.cluster,
                  })
                )
              }
            />
          </div>
        )}
        <div className="grid g-2">
          <Card title={L('your_id')}>
            <div className="stat-value" style={{ fontSize: '1.9rem', letterSpacing: '0.04em', wordBreak: 'break-all' }}>
              {r.tracking_id}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={() => {
                  navigator.clipboard.writeText(r.tracking_id)
                  setCopiedId(true)
                  setTimeout(() => setCopiedId(false), 3000)
                }}
              >
                <Copy size={16} />
                {copiedId ? 'Copied ID!' : 'Copy ID'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => shareTrackingId(r.tracking_id)}
              >
                <Share2 size={16} />
                Save or share this ID
              </button>
            </div>
            {copiedId && (
              <div className="xs" style={{ color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                ✓ Tracking link copied to clipboard!
              </div>
            )}
            {r.cluster && (
              <div className="alert alert-info mt">
                <Users size={18} aria-hidden="true" />
                <div className="small">
                  <strong>{r.cluster.unique_households} households</strong> in {r.cluster.area} share this need: “
                  {r.cluster.title}”. Your voice is counted once, together with theirs.
                </div>
              </div>
            )}
            <div className="row mt">
              <Link className="btn btn-primary" to={`/track/${r.tracking_id}`}>
                {L('track_it')}
              </Link>
              <button
                className="btn"
                onClick={() => {
                  setResult(null)
                  setText('')
                  setAudio(null)
                  setPhotos([])
                }}
              >
                {L('new_one')}
              </button>
            </div>
          </Card>
          <Card
            title={L('understood')}
            sub={`Location: ${r.understanding.geo.area || 'not yet known'} (${r.understanding.geo.method})`}
          >
            <Understanding u={r.understanding} />
            {r.understanding.flags?.length > 0 && (
              <div className="row mt">
                {r.understanding.flags.map((f) => (
                  <Badge key={f} tone="amber">
                    {f.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}
            <p className="help mt">
              Personal details (names, phone and ID numbers) are removed before any official sees the text.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-md" style={{ maxWidth: 1100 }}>
      <header>
        <h1>{L('title')}</h1>
        <p className="muted">{L('subtitle')}</p>
      </header>
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v)
          setError(null)
        }}
        tabs={[
          { value: 'individual', label: L('individual') },
          { value: 'community', label: '🏛️ Gram Sabha / Ward Meeting' },
        ]}
      />
      <ErrorBox error={error} />
      {!isOnline && (
        <div className="alert alert-warn" role="alert" style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', padding: '12px 16px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CloudOff size={22} color="#b45309" aria-hidden="true" />
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>You're offline — this will be sent automatically once you're back online</strong>
            <span style={{ fontSize: '0.88rem' }}>You can record voice or write your grievance now. It is safely stored on this device and will be submitted as soon as your connection returns.</span>
          </div>
        </div>
      )}
      {offlineMsg && (
        <div className="alert alert-info" role="status">
          <CloudOff size={18} aria-hidden="true" />
          <div>{offlineMsg}</div>
        </div>
      )}
      {outbox.length > 0 && (
        <div className="alert alert-warn">
          <CloudOff size={18} aria-hidden="true" />
          <div>{outbox.length} request(s) waiting to be sent when you are online.</div>
        </div>
      )}

      {tab === 'individual' ? (
        <form onSubmit={submit} className="grid g-main">
          <div className="stack-md">
            <Card title="1. Tell us the problem">
              <div className="grid g-2" style={{ alignItems: 'center' }}>
                <VoiceInput
                  lang={speakLang}
                  onTranscript={(t) => setText((p) => (p ? p + ' ' : '') + t)}
                  onAudio={setAudio}
                  labels={{
                    speak: L('speak'),
                    stop: L('stop'),
                    listening: L('listening'),
                    unsupported: L('voice_unsupported'),
                  }}
                />
                <div className="field">
                  <label htmlFor="speak-lang">Speaking language</label>
                  <select
                    id="speak-lang"
                    className="select"
                    value={speakLang}
                    onChange={(e) => setSpeakLang(e.target.value)}
                  >
                    {SPEAK_LANGS.map((l) => (
                      <option key={l} value={l}>
                        {LANG_NAMES[l]}
                      </option>
                    ))}
                  </select>
                  {audio && (
                    <span className="help">
                      Voice recording attached ({Math.round(audio.size / 1024)} KB). The original audio is kept with your request.
                    </span>
                  )}
                </div>
              </div>
              <div className="field mt">
                <label htmlFor="msg">{L('or_type')}</label>
                <textarea
                  id="msg"
                  className="textarea"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={L('placeholder')}
                />
              </div>
            </Card>

            <Card title={`2. ${L('where')}`} sub="Select your State, District, and Village / City">
              <LocationPicker
                areas={areas}
                value={areaId}
                onChange={(id, obj) => {
                  setAreaId(id ? String(id) : '')
                  setSelectedAreaObj(obj)
                }}
                onCoordsChange={setCoords}
                allowGps={true}
                showSummary={true}
                idPrefix="report-loc"
              />
              <p className="help mt">{L('place_hint')}</p>
            </Card>

            {nearby.length > 0 && (
              <Card
                title="Already reported near you?"
                sub="Tap Me too instead of writing it again. Your family is counted once."
              >
                <div className="stack">
                  {nearby.map((c) => (
                    <div key={c.id} className="me-too">
                      <div>
                        <SectorTag sector={c.category} short />
                        <div className="small">
                          <strong>{c.title}</strong>
                        </div>
                        <div className="xs muted">
                          {supported[c.id]?.cluster?.unique_households ?? c.unique_households} families
                        </div>
                      </div>
                      {supported[c.id] ? (
                        <Badge tone="green">
                          <CheckCircle2 size={12} aria-hidden="true" />
                          Counted
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => meToo(c)}
                        >
                          <ThumbsUp size={16} aria-hidden="true" />
                          Me too
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="3. Optional details">
              <div className="grid g-2">
                <div className="field">
                  <label htmlFor="phone">Phone number (optional, to get updates)</label>
                  <input
                    id="phone"
                    className="input"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="gender">{L('gender')}</label>
                  <select
                    id="gender"
                    className="select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="undisclosed">—</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <label className="check mt">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                {L('anonymous')}
              </label>

              {/* DPDP Act 2023 Consent & Privacy Notice */}
              <div
                style={{
                  marginTop: 8,
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  color: '#475569',
                  lineHeight: 1.45,
                }}
              >
                <div className="row" style={{ gap: 6, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
                  <ShieldCheck size={16} color="#0284c7" />
                  <span>Privacy & Data Protection Notice (DPDP Act, 2023)</span>
                </div>
                <div>
                  <strong>Data collected:</strong> Only grievance description, general location, and optional phone for SMS updates. Personal identifiers are removed before officials view demand patterns.
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>Retention & Deletion:</strong> Data is retained for 90 days after grievance resolution, then archived as anonymized statistical demand. You can request immediate erasure at any time on the tracking page.
                </div>
              </div>

              <label className="check mt">
                <input
                  type="checkbox"
                  checked={assisted}
                  onChange={(e) => setAssisted(e.target.checked)}
                />
                {L('assisted')}
              </label>
              {assisted && (
                <div className="field">
                  <label htmlFor="helper">{L('helper_id')}</label>
                  <input
                    id="helper"
                    className="input"
                    value={helper}
                    onChange={(e) => setHelper(e.target.value)}
                    placeholder="CSC-TS-0412 / ASHA-102"
                  />
                </div>
              )}

              {/* Multiple Photo Upload with Guidance & Previews */}
              <div className="field mt">
                <label htmlFor="photos" className="row-between" style={{ cursor: 'pointer' }}>
                  <span className="row" style={{ gap: 6, fontWeight: 600, color: '#1e293b' }}>
                    <Camera size={18} aria-hidden="true" />
                    Photo Evidence (Optional)
                  </span>
                  <span className="xs muted">Up to 5 photos, max 5MB each (JPG, PNG, WebP)</span>
                </label>
                <input
                  id="photos"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  onChange={handlePhotoChange}
                  disabled={photos.length >= 5}
                  style={{ display: 'block', marginTop: 4 }}
                />
                <span className="help">
                  Photos help engineers quickly verify infrastructure damage (potholes, dry taps, broken wires).
                </span>

                {photos.length > 0 && (
                  <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {photos.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: 84,
                          height: 84,
                          borderRadius: 6,
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          background: '#f1f5f9',
                        }}
                      >
                        <img
                          src={URL.createObjectURL(p)}
                          alt={p.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          style={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          aria-label={`Remove photo ${idx + 1}`}
                        >
                          <X size={12} />
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            fontSize: '0.62rem',
                            textAlign: 'center',
                            padding: '1px 2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {(p.size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-submit-bold"
              disabled={busy || (!text && !audio)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: busy || (!text && !audio) ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={20} aria-hidden="true" />
              <span>{busy ? L('sending') : 'Send my request'}</span>
            </button>
          </div>

          <aside className="stack-md">
            <Card title={L('understood')} sub="Check it looks right before sending.">
              {preview ? (
                <Understanding
                  u={preview}
                  onOptionClick={handleOptionClick}
                  isConfirmed={confirmedUnderstood}
                />
              ) : (
                <p className="muted small">Start speaking or typing…</p>
              )}
            </Card>
            <Card title="Try an example">
              <div className="stack">
                {[
                  'మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. నార్నూర్',
                  'गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती। Bawana',
                  'ఎంబోర్ పాడైపోయినందున తాగునీటి సరఫరా ఆగిపోయింది. Utnoor',
                  'আমাদের গ্রামে কোনো পাকা রাস্তা নেই, বর্ষায় যোগাযোগ বিচ্ছিন্ন হয়ে যায়। Koraput',
                  'हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न। Seelampur',
                  'गावात पिण्याच्या पाण्याची तीव्र टंचाई आहे, हातपंप बंद पडला आहे. Haveli',
                ].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="btn btn-sm"
                    style={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      height: 'auto',
                      padding: '8px 12px',
                    }}
                    onClick={() => setText(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </Card>
          </aside>
        </form>
      ) : (
        /* Gram Sabha & Ward Meeting Mode */
        <form onSubmit={submitCommunity} className="grid g-main">
          <div className="stack-md">
            {/* 1. Meeting Type & Location Cascade */}
            <Card
              title="1. Gram Sabha / Ward Meeting Location"
              sub="Select meeting jurisdiction: State → District → Gram Panchayat / Village / Ward"
            >
              {/* Meeting Jurisdiction Filter */}
              <div className="row" style={{ gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${meetingType === 'rural' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMeetingType('rural')}
                >
                  🌾 Rural Gram Sabha (Panchayat)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${meetingType === 'urban' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMeetingType('urban')}
                >
                  🏙️ Urban Ward Meeting / Mohalla Sabha
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${meetingType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setMeetingType('all')}
                >
                  🌐 All Jurisdictions
                </button>
              </div>

              {/* 3-Step Cascading Dropdowns */}
              <LocationPicker
                areas={areas}
                value={areaId}
                filterSetting={meetingType}
                onChange={(id, obj) => {
                  setAreaId(id ? String(id) : '')
                  setSelectedAreaObj(obj)
                }}
                onCoordsChange={setCoords}
                stateLabel="1. State"
                districtLabel="2. District"
                villageLabel={
                  meetingType === 'rural'
                    ? '3. Gram Panchayat / Village'
                    : meetingType === 'urban'
                    ? '3. Municipal Ward / City'
                    : '3. Village / Ward / City'
                }
                allowGps={true}
                showSummary={true}
                idPrefix="gs-loc"
                required
              />

              {/* Village Demographics & Infrastructure Deficit Preview */}
              {selectedAreaObj && (
                <div
                  className="card"
                  style={{
                    marginTop: 14,
                    padding: 14,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                  }}
                >
                  <div className="row-between" style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: '0.95rem' }}>
                      📋 {selectedAreaObj.setting === 'rural' ? 'Gram Panchayat Baseline Data' : 'Ward Baseline Data'}: {selectedAreaObj.name}
                    </strong>
                    <span className="badge badge-dark xs mono">{selectedAreaObj.admin_code}</span>
                  </div>
                  <div className="grid g-3 small" style={{ gap: 8 }}>
                    <div>👥 <strong>Population:</strong> {Number(selectedAreaObj.population).toLocaleString()}</div>
                    <div>🏠 <strong>Households:</strong> {Number(selectedAreaObj.households).toLocaleString()}</div>
                    <div>⚠️ <strong>Vulnerability:</strong> {(selectedAreaObj.vulnerability * 100).toFixed(0)}%</div>
                  </div>
                  {selectedAreaObj.infra && (
                    <div style={{ marginTop: 10 }}>
                      <span className="xs muted" style={{ display: 'block', marginBottom: 4 }}>
                        Infrastructure Provisioning (Antyodaya Deficit Model):
                      </span>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        {Object.entries(selectedAreaObj.infra).map(([sec, val]) => (
                          <span key={sec} className="badge badge-gray xs" style={{ textTransform: 'capitalize' }}>
                            {sec}: <strong>{Math.round(val * 100)}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* 2. Meeting Facilitator & Quorum */}
            <Card title="2. Meeting Governance & Quorum" sub="Facilitator details and community attendance count">
              <div className="grid g-2">
                <div className="field">
                  <label htmlFor="fac-role">Facilitator Role</label>
                  <select
                    id="fac-role"
                    className="select"
                    value={facilitatorRole}
                    onChange={(e) => setFacilitatorRole(e.target.value)}
                  >
                    <option value="Panchayat Secretary (Sachiv)">Panchayat Secretary (Sachiv)</option>
                    <option value="Gram Rozgar Sahayak (GRS)">Gram Rozgar Sahayak (GRS)</option>
                    <option value="Sarpanch / Gram Pradhan">Sarpanch / Gram Pradhan</option>
                    <option value="Ward Councillor / Member">Ward Councillor / Member</option>
                    <option value="Village Development Officer (VDO)">Village Development Officer (VDO)</option>
                    <option value="ASHA / Anganwadi Worker">ASHA / Anganwadi Worker</option>
                    <option value="SHG / Community Leader">SHG / Community Leader</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fac-name">Facilitator Name / Officer ID</label>
                  <input
                    id="fac-name"
                    className="input"
                    value={facilitatorName}
                    onChange={(e) => setFacilitatorName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra (SEC-ADIL-08)"
                  />
                </div>
              </div>

              <div className="grid g-2 mt">
                <div className="field">
                  <label htmlFor="meeting-date">Meeting Date</label>
                  <input
                    id="meeting-date"
                    type="date"
                    className="input"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="quorum-count">Villagers / Attendees Present</label>
                  <input
                    id="quorum-count"
                    type="number"
                    className="input"
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(e.target.value)}
                    placeholder="e.g. 95"
                  />
                </div>
              </div>
            </Card>

            {/* 3. Meeting Minutes & Resolutions */}
            <Card
              title="3. Meeting Minutes & Resolutions"
              sub="Paste meeting minutes or speech transcript. Include vote counts in brackets like (120 people)."
            >
              {/* Quick Template Buttons */}
              <div style={{ marginBottom: 10 }}>
                <span className="small muted" style={{ display: 'block', marginBottom: 6 }}>
                  Quick insert typical resolutions:
                </span>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {GRAM_SABHA_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ fontSize: '0.8rem', padding: '4px 8px', height: 'auto' }}
                      onClick={() => addTemplateResolution(tpl.text)}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <textarea
                  id="tr"
                  className="textarea"
                  style={{ minHeight: 180, fontFamily: 'inherit', lineHeight: 1.5 }}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={
                    'Drinking water borewell dried up; new deep submersible solar pump needed for ward 2 (140 votes).\n' +
                    'All-weather blacktop road link needed from main highway to village school and clinic (95 people).\n' +
                    'Primary Health Centre lacks regular ANM nurse and essential medicine supplies (80 people).'
                  }
                />
                <div className="row-between xs muted mt" style={{ marginTop: 6 }}>
                  <span>
                    💡 JanSetu will automatically extract individual demands, score priorities, and attach vote weights.
                  </span>
                  <span>{transcript.length} characters</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg mt"
                disabled={busy || !areaId || transcript.length < 10}
              >
                <Vote size={18} aria-hidden="true" />
                {busy ? 'Extracting Collective Demands…' : 'Process Gram Sabha Resolutions'}
              </button>
            </Card>
          </div>

          {/* Results Sidebar */}
          <aside className="stack-md">
            <Card
              title="Extracted Collective Demands"
              sub={
                communityRes
                  ? `${communityRes.count} collective resolutions processed for ${selectedAreaObj?.name || 'selected area'}`
                  : 'Processed demands with supporter weights will appear here.'
              }
            >
              {!communityRes ? (
                <div className="stack" style={{ gap: 12 }}>
                  <p className="muted small">
                    Select a <strong>State → District → Village</strong>, insert meeting resolutions with supporter counts, and click <strong>Process</strong>.
                  </p>
                  <div
                    className="card"
                    style={{
                      background: '#f8fafc',
                      padding: 12,
                      border: '1px dashed #cbd5e1',
                      boxShadow: 'none',
                    }}
                  >
                    <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                      <Sparkles size={16} color="var(--primary)" />
                      <strong className="small">How Gram Sabha Intake Works:</strong>
                    </div>
                    <ul className="xs muted" style={{ paddingLeft: 18, margin: 0 }}>
                      <li>Fuses all resolutions into sovereign demand clusters.</li>
                      <li>Attaches quorum vote weighting per resolution.</li>
                      <li>Cross-references village infrastructure gaps (Need-Gap Index).</li>
                      <li>Publishes for District Collector and DPAP review.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="stack" style={{ gap: 12 }}>
                  <div className="alert alert-success" style={{ padding: '8px 12px' }}>
                    <CheckCircle2 size={16} />
                    <div className="small">
                      Successfully registered <strong>{communityRes.count}</strong> collective demands for{' '}
                      <strong>{selectedAreaObj?.name || 'Area'}</strong>.
                    </div>
                  </div>

                  {communityRes.demands.map((d) => (
                    <div
                      key={d.tracking_id}
                      className="card"
                      style={{
                        padding: 14,
                        border: '1px solid #e2e8f0',
                        boxShadow: 'none',
                        background: '#fff',
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: 6 }}>
                        <SectorTag sector={d.understanding.category} />
                        <Badge tone="blue">
                          <Users size={12} style={{ marginRight: 4 }} />
                          {d.request.supporters} supporters
                        </Badge>
                      </div>
                      <p className="small" style={{ margin: '6px 0', fontWeight: 500 }}>
                        {d.request.text}
                      </p>
                      <div className="row-between xs muted mono" style={{ marginTop: 8 }}>
                        <span>🆔 {d.tracking_id}</span>
                        {d.cluster && (
                          <span style={{ color: 'var(--primary)' }}>
                            Cluster: {d.cluster.unique_households} HHs
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>
        </form>
      )}
    </div>
  )
}
