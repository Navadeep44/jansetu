import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, CheckCircle2, CloudOff, Crosshair, Send, ShieldAlert, ThumbsUp, Users } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { tr } from '../../i18n/strings'
import VoiceInput, { SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox from '../../components/citizen/ReplyBox'
import { Badge, Card, ErrorBox, PageHead, SectorTag, Tabs } from '../../components/ui'
import { LANG_NAMES, pct } from '../../lib/format'

const SPEAK_LANGS = ['te', 'hi', 'or', 'bn', 'ta', 'en', 'pt', 'zu', 'xh', 'af', 'ru', 'zh', 'ar']

function Understanding({ u }) {
  if (!u) return null
  return (
    <dl className="kv">
      <dt>Language</dt><dd>{LANG_NAMES[u.language] || u.language} <span className="muted small">({pct(u.language_confidence)})</span></dd>
      <dt>Need</dt><dd><SectorTag sector={u.category} /></dd>
      <dt>Specific issue</dt><dd>{u.subcategory_label}</dd>
      <dt>Type</dt><dd>{u.request_type?.replace('_', ' ')}</dd>
      <dt>Severity</dt><dd><span className="mono">{u.severity}/5</span> {u.severity >= 4 && <Badge tone="red">risk to health / life</Badge>}</dd>
      {u.vulnerable_groups?.length > 0 && <><dt>Affects</dt><dd>{u.vulnerable_groups.map((g) => <Badge key={g} tone="violet">{g.replace('_', ' ')}</Badge>)}</dd></>}
      <dt>In English</dt><dd className="small">{u.translated_text} <span className="muted xs">({u.translation_mode})</span></dd>
      <dt>AI confidence</dt><dd><span className="mono">{pct(u.confidence)}</span> <span className="muted xs">{u.extraction_mode === 'llm' ? 'LLM' : 'offline multilingual rules'}</span></dd>
    </dl>
  )
}

export default function Report() {
  const { uiLang, citizenPhone } = useApp()
  const L = (k) => tr(uiLang, k)
  const [tab, setTab] = useState('individual')
  const [text, setText] = useState('')
  const [speakLang, setSpeakLang] = useState(uiLang === 'en' ? 'te' : uiLang)
  const [audio, setAudio] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [coords, setCoords] = useState(null)
  const [areaId, setAreaId] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [assisted, setAssisted] = useState(false)
  const [helper, setHelper] = useState('')
  const [gender, setGender] = useState('undisclosed')
  const [phone, setPhone] = useState(citizenPhone || '')
  const [preview, setPreview] = useState(null)
  const [areas, setAreas] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [communityRes, setCommunityRes] = useState(null)
  const [nearby, setNearby] = useState([])
  const [supported, setSupported] = useState({})
  const [outbox, setOutbox] = useState(() => { try { return JSON.parse(localStorage.getItem('js_outbox') || '[]') } catch { return [] } })
  const [offlineMsg, setOfflineMsg] = useState(null)

  const saveOutbox = (list) => { setOutbox(list); try { localStorage.setItem('js_outbox', JSON.stringify(list)) } catch { /* ignore */ } }
  // Offline-first: requests typed without a connection are kept on the phone and sent automatically later.
  useEffect(() => {
    const flush = async () => {
      let list = []
      try { list = JSON.parse(localStorage.getItem('js_outbox') || '[]') } catch { list = [] }
      if (!list.length || !navigator.onLine) return
      const left = []
      for (const item of list) { try { await api.intakeText(item) } catch { left.push(item) } }
      saveOutbox(left)
      if (left.length < list.length) setOfflineMsg(`${list.length - left.length} saved request(s) sent now that you are online.`)
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])
  useEffect(() => {
    if (!areaId && !coords) { setNearby([]); return }
    api.nearby(areaId ? { area_id: areaId } : { lat: coords.lat, lng: coords.lng }).then(setNearby).catch(() => setNearby([]))
  }, [areaId, coords])
  const meToo = async (c) => {
    try { const r = await api.support(c.id, phone, uiLang); setSupported((s) => ({ ...s, [c.id]: r })) } catch (e) { setError(e) }
  }

  useEffect(() => { if (uiLang !== 'en') setSpeakLang(uiLang) }, [uiLang])
  useEffect(() => { api.areas().then(setAreas).catch(() => {}) }, [])
  useEffect(() => {
    if (text.trim().length < 8) { setPreview(null); return }
    const h = setTimeout(() => api.preview(text, undefined).then(setPreview).catch(() => {}), 450)
    return () => clearTimeout(h)
  }, [text])

  const grouped = useMemo(() => {
    const g = {}
    areas.forEach((a) => { const k = `${a.country} · ${a.district}`; (g[k] = g[k] || []).push(a) })
    return g
  }, [areas])

  const locate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => setCoords(null), { timeout: 8000 })
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try {
      const f = new FormData()
      f.append('text', text)
      f.append('channel', assisted ? 'assisted' : 'web')
      if (coords) { f.append('lat', coords.lat); f.append('lng', coords.lng) }
      if (areaId) f.append('area_id', areaId)
      if (phone) f.append('phone', phone)
      f.append('anonymous', anonymous)
      f.append('gender', gender)
      if (assisted && helper) f.append('assisted_by', helper)
      if (!text && speakLang) f.append('language', speakLang)
      if (audio) f.append('audio', audio, 'voice.webm')
      if (photo) f.append('photo', photo, photo.name)
      const res = await api.intakeForm(f)
      setResult(res)
      try { localStorage.setItem('js_last_tid', res.tracking_id) } catch { /* ignore */ }
    } catch (err) {
      if (!navigator.onLine || err instanceof TypeError) {
        saveOutbox([...outbox, { text, channel: assisted ? 'assisted' : 'web', area_id: areaId ? Number(areaId) : null, lat: coords?.lat, lng: coords?.lng,
          phone: phone || null, anonymous, gender, assisted_by: assisted ? helper : null }])
        setOfflineMsg('No internet. Your request is saved on this phone and will be sent automatically when you are online.')
        setText('')
      } else setError(err)
    } finally { setBusy(false) }
  }

  const submitCommunity = async (e) => {
    e.preventDefault()
    setBusy(true); setError(null)
    try { setCommunityRes(await api.community({ transcript, area_id: Number(areaId), facilitator: helper || 'Gram Sabha secretary' })) }
    catch (err) { setError(err) } finally { setBusy(false) }
  }

  if (result) {
    const r = result
    return (
      <div className="stack-md narrow">
        <PageHead title="We got your request" eyebrow="For citizens · no login needed" icon={CheckCircle2} overlap={false}>Keep your tracking ID. We will tell you every time something changes.</PageHead>
        <div className={`alert ${r.reply_kind === 'safety' ? 'alert-danger' : r.reply_kind === 'ask_location' || r.reply_kind === 'clarify' ? 'alert-warn' : 'alert-success'}`} role="status">
          {r.reply_kind === 'safety' ? <ShieldAlert size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
          <div className="stack" style={{ gap: 6 }}>
            <strong style={{ fontSize: '1.05rem' }}>{r.reply}</strong>
            <div className="row"><SpeakButton text={r.reply} lang={r.request.language} label={L('listen')} /></div>
          </div>
        </div>
        {r.request.waiting_for && (
          <div className="card action-card">
            <h2>{r.request.waiting_for === 'location' ? 'Answer here: where is this?' : 'Answer here: what is it about?'}</h2>
            <ReplyBox tid={r.tracking_id} waitingFor={r.request.waiting_for}
              onReplied={(x) => x.resolved && api.track(r.tracking_id).then((t) => setResult({ ...r, reply: x.reply, reply_kind: 'ack', request: t.request, cluster: t.cluster }))} />
          </div>
        )}
        <div className="grid g-2">
          <Card title={L('your_id')}>
            <div className="stat-value" style={{ fontSize: '2rem' }}>{r.tracking_id}</div>
            {r.cluster && (
              <div className="alert alert-info mt"><Users size={18} aria-hidden="true" />
                <div className="small"><strong>{r.cluster.unique_households} households</strong> in {r.cluster.area} share this need: “{r.cluster.title}”.
                  Your voice is counted once, together with theirs.</div></div>
            )}
            <div className="row mt">
              <Link className="btn btn-primary" to={`/track/${r.tracking_id}`}>{L('track_it')}</Link>
              <button className="btn" onClick={() => { setResult(null); setText(''); setAudio(null); setPhoto(null) }}>{L('new_one')}</button>
            </div>
          </Card>
          <Card title={L('understood')} sub={`Location: ${r.understanding.geo.area || 'not yet known'} (${r.understanding.geo.method})`}>
            <Understanding u={r.understanding} />
            {r.understanding.flags?.length > 0 && <div className="row mt">{r.understanding.flags.map((f) => <Badge key={f} tone="amber">{f.replace(/_/g, ' ')}</Badge>)}</div>}
            <p className="help mt">Personal details (names, phone and ID numbers) are removed before any official sees the text.</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="stack-md">
      <PageHead title={L('title')} eyebrow="For citizens · no login needed" steps={['Speak or type the problem', 'Choose your place', 'Get a tracking ID']}>{L('subtitle')}</PageHead>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'individual', label: L('individual') }, { value: 'community', label: L('community') }]} />
      <ErrorBox error={error} />
      {offlineMsg && <div className="alert alert-info" role="status"><CloudOff size={18} aria-hidden="true" /><div>{offlineMsg}</div></div>}
      {outbox.length > 0 && <div className="alert alert-warn"><CloudOff size={18} aria-hidden="true" /><div>{outbox.length} request(s) waiting to be sent when you are online.</div></div>}

      {tab === 'individual' ? (
        <form onSubmit={submit} className="grid g-main">
          <div className="stack-md">
            <Card title="1. Tell us the problem">
              <div className="grid g-2" style={{ alignItems: 'center' }}>
                <VoiceInput lang={speakLang} onTranscript={(t) => setText((p) => (p ? p + ' ' : '') + t)} onAudio={setAudio}
                  labels={{ speak: L('speak'), stop: L('stop'), listening: L('listening'), unsupported: L('voice_unsupported') }} />
                <div className="field">
                  <label htmlFor="speak-lang">Speaking language</label>
                  <select id="speak-lang" className="select" value={speakLang} onChange={(e) => setSpeakLang(e.target.value)}>
                    {SPEAK_LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
                  </select>
                  {audio && <span className="help">Voice recording attached ({Math.round(audio.size / 1024)} KB). The original audio is kept with your request.</span>}
                </div>
              </div>
              <div className="field mt">
                <label htmlFor="msg">{L('or_type')}</label>
                <textarea id="msg" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={L('placeholder')} />
              </div>
            </Card>

            <Card title={`2. ${L('where')}`}>
              <div className="grid g-2">
                <div className="stack">
                  <button type="button" className="btn" onClick={locate}><Crosshair size={18} aria-hidden="true" />{coords ? L('located') : L('use_location')}</button>
                  {coords && <span className="help mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>}
                </div>
                <div className="field">
                  <label htmlFor="area">{L('choose_area')}</label>
                  <select id="area" className="select" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                    <option value="">—</option>
                    {Object.entries(grouped).map(([g, list]) => (
                      <optgroup key={g} label={g}>{list.map((a) => <option key={a.id} value={a.id}>{a.name}{a.aliases?.[0] && a.aliases[0] !== a.name ? ` · ${a.aliases[0]}` : ''}</option>)}</optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <p className="help mt">{L('place_hint')}</p>
            </Card>

            {nearby.length > 0 && (
              <Card title="Already reported near you?" sub="Tap Me too instead of writing it again. Your family is counted once.">
                <div className="stack">
                  {nearby.map((c) => (
                    <div key={c.id} className="me-too">
                      <div><SectorTag sector={c.category} short /><div className="small"><strong>{c.title}</strong></div>
                        <div className="xs muted">{supported[c.id]?.cluster?.unique_households ?? c.unique_households} families</div></div>
                      {supported[c.id] ? <Badge tone="green"><CheckCircle2 size={12} aria-hidden="true" />Counted</Badge>
                        : <button type="button" className="btn btn-sm btn-primary" onClick={() => meToo(c)}><ThumbsUp size={16} aria-hidden="true" />Me too</button>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="3. Optional details">
              <div className="grid g-2">
                <div className="field">
                  <label htmlFor="phone">Phone number (optional, to get updates)</label>
                  <input id="phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="gender">{L('gender')}</label>
                  <select id="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="undisclosed">—</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <label className="check mt"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />{L('anonymous')}</label>
              <label className="check"><input type="checkbox" checked={assisted} onChange={(e) => setAssisted(e.target.checked)} />{L('assisted')}</label>
              {assisted && <div className="field"><label htmlFor="helper">{L('helper_id')}</label><input id="helper" className="input" value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="CSC-TS-0412 / ASHA-102" /></div>}
              <div className="field mt">
                <label htmlFor="photo" className="row"><Camera size={16} aria-hidden="true" />{L('photo')}</label>
                <input id="photo" type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </div>
            </Card>
            <button className="btn btn-primary btn-lg" disabled={busy || (!text && !audio)}><Send size={18} aria-hidden="true" />{busy ? L('sending') : L('submit')}</button>
          </div>

          <aside className="stack-md">
            <Card title={L('understood')} sub="Check it looks right before sending.">
              {preview ? <Understanding u={preview} /> : <p className="muted small">Start speaking or typing…</p>}
            </Card>
            <Card title="Try an example">
              <div className="stack">
                {[
                  'మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. నార్నూర్',
                  'गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती। Bawana',
                  'Esgoto a céu aberto na frente das casas em Grajaú, as crianças estão doentes',
                  'Awukho ugesi kusukela izolo eSoweto, i-load shedding ayipheli',
                  'Gas leak near the school in Tembisa, children trapped!',
                ].map((ex) => <button key={ex} type="button" className="btn btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '8px 12px' }} onClick={() => setText(ex)}>{ex}</button>)}
              </div>
            </Card>
          </aside>
        </form>
      ) : (
        <form onSubmit={submitCommunity} className="grid g-main">
          <Card title="Gram Sabha / ward meeting" sub="One meeting becomes many collective demands, each weighted by how many people supported it.">
            <div className="field">
              <label htmlFor="c-area">Village / ward</label>
              <select id="c-area" className="select" required value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">—</option>
                {Object.entries(grouped).map(([g, list]) => <optgroup key={g} label={g}>{list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</optgroup>)}
              </select>
            </div>
            <div className="field mt"><label htmlFor="fac">Facilitator</label><input id="fac" className="input" value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="Panchayat secretary / ward councillor" /></div>
            <div className="field mt">
              <label htmlFor="tr">{L('transcript')}</label>
              <textarea id="tr" className="textarea" style={{ minHeight: 180 }} value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder={'Road to the village washes away every monsoon (120 people).\nThe school has only one teacher (64 people).\nHandpump broken for three weeks (80 people).'} />
            </div>
            <button className="btn btn-primary btn-lg mt" disabled={busy || !areaId || transcript.length < 10}><Send size={18} aria-hidden="true" />Extract demands</button>
          </Card>
          <Card title="Extracted demands">
            {!communityRes ? <p className="muted small">Paste the minutes or a transcript of the recording.</p> : (
              <div className="stack">
                {communityRes.demands.map((d) => (
                  <div key={d.tracking_id} className="card" style={{ boxShadow: 'none' }}>
                    <div className="row-between"><SectorTag sector={d.understanding.category} /><Badge tone="blue">{d.request.supporters} supporters</Badge></div>
                    <p className="small mt">{d.request.text}</p>
                    <div className="row xs muted"><span className="mono">{d.tracking_id}</span>{d.cluster && <span>· cluster now {d.cluster.unique_households} households</span>}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </form>
      )}
    </div>
  )
}
