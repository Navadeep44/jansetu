import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, Camera, Check, CheckCircle2, ClipboardList, CloudOff, Copy, Crosshair, Droplets, GraduationCap, HeartPulse,
  HelpCircle, Home as HomeIcon, MapPin, PhoneCall, Recycle, Route, Search, Send, Share2, ShieldAlert, SlidersHorizontal,
  ThumbsUp, Users, Zap,
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import VoiceInput, { CitizenStyles, SpeakButton } from '../../components/citizen/VoiceInput'
import ReplyBox, { AreaOptions, groupAreas } from '../../components/citizen/ReplyBox'
import { Badge, Card, ErrorBox, PageHead, SectorTag, Tabs } from '../../components/ui'
import { LANG_NAMES, SECTORS, pct } from '../../lib/format'

// Indian languages a citizen can speak or type in (UI itself is English / Hindi / Telugu).
export const SPEAK_LANGS = ['te', 'hi', 'en', 'or', 'bho', 'ur', 'ta', 'bn', 'mr', 'kn', 'ml', 'gu', 'pa']
export const NATIVE = {
  te: 'తెలుగు', hi: 'हिन्दी', en: 'English', or: 'ଓଡ଼ିଆ', bho: 'भोजपुरी', ur: 'اردو', ta: 'தமிழ்', bn: 'বাংলা',
  mr: 'मराठी', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', gu: 'ગુજરાતી', pa: 'ਪੰਜਾਬੀ',
}

// Big picture tiles: one tap = one problem type.
const PICK = [
  { key: 'water', word: 'Water', Icon: Droplets },
  { key: 'roads', word: 'Road', Icon: Route },
  { key: 'sanitation', word: 'Drain / Toilet', Icon: Recycle },
  { key: 'electricity', word: 'Power', Icon: Zap },
  { key: 'health', word: 'Health', Icon: HeartPulse },
  { key: 'education', word: 'School', Icon: GraduationCap },
  { key: 'other', word: 'Other', Icon: HelpCircle },
]
// Short ready-made sentences (checked with /api/intake/preview: each is classified into its own sector).
const PREFILL = {
  te: {
    water: 'మా ప్రాంతంలో తాగునీటి సమస్య ఉంది.', roads: 'మా ఊరికి మంచి రోడ్డు లేదు.',
    sanitation: 'మా ప్రాంతంలో మురుగు కాలువ, మరుగుదొడ్డి సమస్య ఉంది.', electricity: 'మా ప్రాంతంలో కరెంటు సమస్య ఉంది.',
    health: 'మా దగ్గర ఆసుపత్రి, డాక్టర్ సమస్య ఉంది.', education: 'మా బడిలో సమస్య ఉంది, టీచర్లు లేరు.',
  },
  hi: {
    water: 'हमारे इलाके में पीने के पानी की समस्या है।', roads: 'हमारे गाँव तक अच्छी सड़क नहीं है।',
    sanitation: 'हमारे इलाके में नाली और शौचालय की समस्या है।', electricity: 'हमारे इलाके में बिजली की समस्या है।',
    health: 'हमारे यहाँ अस्पताल और डॉक्टर की समस्या है।', education: 'हमारे स्कूल में समस्या है, शिक्षक नहीं हैं।',
  },
  en: {
    water: 'We have a drinking water problem in our area.', roads: 'There is no good road to our village.',
    sanitation: 'We have a drain and toilet problem in our area.', electricity: 'We have a power supply problem in our area.',
    health: 'We have a problem with the health centre and doctor here.', education: 'Our school has a problem, there are no teachers.',
  },
}
const ALL_PREFILLS = new Set(Object.values(PREFILL).flatMap((d) => Object.values(d)))
const prefillLang = (speak, ui) => (PREFILL[speak] ? speak : ['bho', 'ur'].includes(speak) ? 'hi' : PREFILL[ui] ? ui : 'en')

const EXAMPLES = [
  'మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. నార్నూర్',
  'गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती। Bawana',
  'ଆମ ଗାଁରେ ପିଇବା ପାଣି ନାହିଁ, ନଳକୂପ ଖରାପ। Koraput',
  'हमनी के गली में नाली उफना जाला, लइकन बेमार बाड़न। Seelampur',
]
const GROUP_WORD = { children: 'Children', pregnant_women: 'Pregnant women', elderly: 'Old people', disabled: 'People with disability', women: 'Women' }
const FLAG_WORD = { needs_location: 'Place needed', low_confidence: 'Not sure what it is', urgent_safety: 'Urgent safety', abusive: 'Rude words', too_short: 'Very short' }
export const DEMO_IVR = '1800-000-0000'

export function langLabel(l, t) {
  const en = LANG_NAMES[l] || l
  const tr = t(en)
  return NATIVE[l] && NATIVE[l] !== tr ? `${NATIVE[l]} · ${tr}` : tr
}

function Understanding({ u }) {
  const t = useT()
  if (!u) return null
  return (
    <dl className="kv">
      <dt>{t('Problem')}</dt><dd><SectorTag sector={u.category} /></dd>
      <dt>{t('Language')}</dt><dd>{langLabel(u.language, t)}</dd>
      {u.subcategory_label && u.subcategory_label !== 'general issue' && <><dt>{t('Details')}</dt><dd>{u.subcategory_label}</dd></>}
      <dt>{t('How urgent')}</dt><dd><span className="mono">{t('{n} of 5', { n: u.severity })}</span> {u.severity >= 4 && <Badge tone="red">{t('Risk to health or life')}</Badge>}</dd>
      {u.vulnerable_groups?.length > 0 && <><dt>{t('Affects')}</dt><dd className="row" style={{ gap: 4 }}>{u.vulnerable_groups.map((g) => <Badge key={g} tone="violet">{t(GROUP_WORD[g] || g.replace('_', ' '))}</Badge>)}</dd></>}
      {u.geo?.area && <><dt>{t('Place')}</dt><dd>{u.geo.area}</dd></>}
      {u.language !== 'en' && u.translated_text && <><dt>{t('In English')}</dt><dd className="small">{u.translated_text}</dd></>}
      <dt>{t('How sure we are')}</dt><dd><span className="mono">{pct(u.confidence)}</span></dd>
    </dl>
  )
}

function StepHead({ n, children }) {
  return <h2 className="cz-steph"><span className="cz-num" aria-hidden="true">{n}</span>{children}</h2>
}

export function HelpCard() {
  const t = useT()
  return (
    <Card title="No smartphone? We can still help">
      <ul className="cz-help">
        <li><span className="icon-tile tone-green"><PhoneCall size={22} aria-hidden="true" /></span>
          <div><div className="small">{t('Call or give a missed call to the JanSetu IVR line.')}</div>
            <a href={`tel:${DEMO_IVR.replace(/-/g, '')}`} className="cz-count" style={{ fontSize: '1.35rem', color: 'inherit', textDecoration: 'none' }}>{DEMO_IVR}</a>
            <div><Badge tone="amber">{t('Demo number')}</Badge></div></div></li>
        <li><span className="icon-tile tone-violet"><Users size={22} aria-hidden="true" /></span>
          <div className="small">{t('Ask your ASHA worker, CSC or Gram Panchayat office to file for you.')}</div></li>
      </ul>
    </Card>
  )
}

function ResultView({ result, setResult, onNew }) {
  const t = useT()
  const r = result
  const [copied, setCopied] = useState(false)
  const tone = r.reply_kind === 'safety' ? 'alert-danger' : ['ask_location', 'clarify'].includes(r.reply_kind) ? 'alert-warn' : 'alert-success'
  const share = async () => {
    const msg = `${t('My JanSetu tracking ID')}: ${r.tracking_id}`
    const url = `${window.location.origin}/track/${r.tracking_id}`
    try {
      if (navigator.share) { await navigator.share({ title: 'JanSetu', text: msg, url }); return }
      await navigator.clipboard.writeText(`${msg} ${url}`)
      setCopied(true); setTimeout(() => setCopied(false), 2500)
    } catch { /* user cancelled */ }
  }
  const NEXT = [
    { Icon: Users, tone: 'blue', text: 'We add you to neighbours with the same need' },
    { Icon: ClipboardList, tone: 'amber', text: 'Officers put it in the work plan' },
    { Icon: Bell, tone: 'green', text: 'We message you. You confirm the fix.' },
  ]
  return (
    <div className="stack-md narrow">
      <CitizenStyles />
      <PageHead title="We got your request" eyebrow="For citizens · no login needed" icon={CheckCircle2} overlap={false}>Keep this number. We will message you at every step.</PageHead>
      <section className="card" style={{ textAlign: 'center' }} aria-labelledby="tid-label">
        <div id="tid-label" className="small muted" style={{ fontWeight: 600 }}>{t('Your tracking ID')}</div>
        <div className="cz-bigid mt" aria-live="polite">{r.tracking_id}</div>
        <div className="row mt" style={{ justifyContent: 'center' }}>
          <SpeakButton text={r.reply} lang={r.request.language} className="btn btn-primary btn-lg" />
          <button type="button" className="btn btn-lg" onClick={share}>
            {copied ? <Check size={18} aria-hidden="true" /> : navigator.share ? <Share2 size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {copied ? t('Copied') : navigator.share ? t('Share') : t('Copy')}
          </button>
        </div>
        <div className={`alert ${tone} mt`} role="status" style={{ textAlign: 'left' }}>
          {r.reply_kind === 'safety' ? <ShieldAlert size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
          <strong style={{ fontSize: '1.02rem' }}>{r.reply}</strong>
        </div>
      </section>

      {r.request.waiting_for && (
        <div className="card action-card">
          <h2>{r.request.waiting_for === 'location' ? t('One more thing: where is this?') : t('Please tell us a little more')}</h2>
          <ReplyBox tid={r.tracking_id} waitingFor={r.request.waiting_for}
            onReplied={(x) => x.resolved && api.track(r.tracking_id).then((tr) => setResult({ ...r, reply: x.reply, reply_kind: 'ack', request: tr.request, cluster: tr.cluster }))} />
        </div>
      )}

      <Card title="What happens next">
        <ol className="cz-next">
          {NEXT.map((s, i) => (
            <li key={s.text}><span className={`icon-tile tone-${s.tone}`} style={{ width: 56, height: 56 }}><s.Icon size={26} aria-hidden="true" /></span>
              <span><span className="muted">{i + 1}. </span>{t(s.text)}</span></li>
          ))}
        </ol>
        {r.cluster && (
          <div className="alert alert-info mt"><Users size={18} aria-hidden="true" />
            <div className="small">{t('{n} families in {area} asked for the same thing.', { n: r.cluster.unique_households, area: r.cluster.area })} <strong>“{r.cluster.title}”</strong></div></div>
        )}
        <div className="row mt">
          <Link className="btn btn-primary btn-lg" to={`/track/${r.tracking_id}`}><Search size={18} aria-hidden="true" />{t('See progress')}</Link>
          <button type="button" className="btn btn-lg" onClick={onNew}><HomeIcon size={18} aria-hidden="true" />{t('Report another problem')}</button>
        </div>
      </Card>

      <Card title="What we understood">
        <Understanding u={r.understanding} />
        {r.understanding.flags?.length > 0 && <div className="row mt">{r.understanding.flags.map((f) => <Badge key={f} tone="amber">{t(FLAG_WORD[f] || f.replace(/_/g, ' '))}</Badge>)}</div>}
        <p className="help mt">{t('Names and phone numbers are hidden from officers.')}</p>
      </Card>
    </div>
  )
}

export default function Report() {
  const { uiLang, citizenPhone } = useApp()
  const t = useT()
  const [tab, setTab] = useState('individual')
  const [text, setText] = useState('')
  const [picked, setPicked] = useState('water')
  const [speakLang, setSpeakLang] = useState(uiLang)
  const [audio, setAudio] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [photos, setPhotos] = useState([])
  const [coords, setCoords] = useState(null)
  const [areaId, setAreaId] = useState('')
  const [hierarchy, setHierarchy] = useState(null)
  const [selState, setSelState] = useState('Telangana')
  const [selDistrict, setSelDistrict] = useState('Adilabad')
  const [selMandal, setSelMandal] = useState('Utnoor')
  const [selVillage, setSelVillage] = useState('Birsaidpet')
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
  const msgRef = useRef(null)
  const whereRef = useRef(null)

  const saveOutbox = (list) => { setOutbox(list); try { localStorage.setItem('js_outbox', JSON.stringify(list)) } catch { /* ignore */ } }

  useEffect(() => {
    api.geoHierarchy().then((data) => {
      setHierarchy(data)
      if (data?.states?.Telangana) {
        setSelState('Telangana')
        const dists = Object.keys(data.states.Telangana.districts || {})
        if (dists.length > 0) {
          const d = dists[0]
          setSelDistrict(d)
          const mnds = Object.keys(data.states.Telangana.districts[d]?.mandals || {})
          if (mnds.length > 0) {
            const m = mnds[0]
            setSelMandal(m)
            const vills = data.states.Telangana.districts[d]?.mandals[m] || []
            if (vills.length > 0) setSelVillage(vills[0])
          }
        }
      }
    }).catch(() => {})
  }, [])

  const handleStateChange = (st) => {
    setSelState(st)
    const dists = Object.keys(hierarchy?.states?.[st]?.districts || {})
    const d = dists[0] || 'Adilabad'
    setSelDistrict(d)
    const mnds = Object.keys(hierarchy?.states?.[st]?.districts?.[d]?.mandals || {})
    const m = mnds[0] || 'Utnoor'
    setSelMandal(m)
    const vills = hierarchy?.states?.[st]?.districts?.[d]?.mandals?.[m] || []
    setSelVillage(vills[0] || 'Birsaidpet')
  }

  const handleDistrictChange = (d) => {
    setSelDistrict(d)
    const mnds = Object.keys(hierarchy?.states?.[selState]?.districts?.[d]?.mandals || {})
    const m = mnds[0] || ''
    setSelMandal(m)
    const vills = hierarchy?.states?.[selState]?.districts?.[d]?.mandals?.[m] || []
    setSelVillage(vills[0] || '')
  }

  const handleMandalChange = (m) => {
    setSelMandal(m)
    const vills = hierarchy?.states?.[selState]?.districts?.[selDistrict]?.mandals?.[m] || []
    setSelVillage(vills[0] || '')
  }

  const handleVillageChange = (v) => {
    setSelVillage(v)
  }

  // Offline-first: requests typed without a connection are kept on the phone and sent automatically later.
  useEffect(() => {
    const flush = async () => {
      let list = []
      try { list = JSON.parse(localStorage.getItem('js_outbox') || '[]') } catch { list = [] }
      if (!list.length || !navigator.onLine) return
      const left = []
      for (const item of list) { try { await api.intakeText(item) } catch { left.push(item) } }
      saveOutbox(left)
      if (left.length < list.length) setOfflineMsg({ key: '{n} saved request(s) sent now that you are online.', n: list.length - left.length })
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
    try { const r = await api.support(c.id, phone, speakLang); setSupported((s) => ({ ...s, [c.id]: r })) } catch (e) { setError(e) }
  }

  // Speaking language follows the UI language (the citizen can change it).
  useEffect(() => { setSpeakLang(uiLang) }, [uiLang])
  // If the message is still one of our ready-made sentences, switch it to the new speaking language.
  useEffect(() => {
    if (picked && picked !== 'other' && ALL_PREFILLS.has(text)) setText(PREFILL[prefillLang(speakLang, uiLang)][picked])
  }, [speakLang]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.areas().then(setAreas).catch(() => {}) }, [])
  useEffect(() => {
    if (text.trim().length < 8) { setPreview(null); return }
    const h = setTimeout(() => api.preview(text, undefined).then(setPreview).catch(() => {}), 450)
    return () => clearTimeout(h)
  }, [text])

  const grouped = useMemo(() => groupAreas(areas, t), [areas, t])

  const pick = (key) => {
    setPicked(key)
    if (key === 'other') {
      if (ALL_PREFILLS.has(text)) setText('')
      setTimeout(() => msgRef.current?.focus(), 50)
      return
    }
    if (!text.trim() || ALL_PREFILLS.has(text)) setText(PREFILL[prefillLang(speakLang, uiLang)][key])
    setTimeout(() => whereRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

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
      f.append('state', selState || 'Telangana')
      f.append('district', selDistrict || 'Adilabad')
      f.append('mandal', selMandal || 'Utnoor')
      f.append('village', selVillage || 'Birsaidpet')
      f.append('category', picked || 'water')
      f.append('channel', assisted ? 'assisted' : 'web')
      if (coords) { f.append('lat', coords.lat); f.append('lng', coords.lng) }
      if (areaId) f.append('area_id', areaId)
      if (phone) f.append('phone', phone)
      f.append('anonymous', anonymous)
      f.append('gender', gender)
      if (assisted && helper) f.append('assisted_by', helper)
      if (!text && speakLang) f.append('language', speakLang)
      if (audio) f.append('audio', audio, 'voice.webm')
      if (photos.length > 0) {
        photos.forEach((p) => f.append('photos', p, p.name))
      } else if (photo) {
        f.append('photos', photo, photo.name)
      }
      const res = await api.cycleIntake(f)
      setResult(res)
      window.scrollTo?.(0, 0)
      try { localStorage.setItem('js_last_tid', res.tracking_id) } catch { /* ignore */ }
    } catch (err) {
      if (!navigator.onLine || err instanceof TypeError) {
        saveOutbox([...outbox, { text, channel: assisted ? 'assisted' : 'web', area_id: areaId ? Number(areaId) : null, lat: coords?.lat, lng: coords?.lng,
          phone: phone || null, anonymous, gender, assisted_by: assisted ? helper : null }])
        setOfflineMsg({ key: 'No internet. Saved on this phone. It will be sent when you are online.' })
        setText(''); setPicked(null)
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
    return <ResultView result={result} setResult={setResult}
      onNew={() => { setResult(null); setText(''); setPicked(null); setAudio(null); setPhoto(null); window.scrollTo?.(0, 0) }} />
  }

  const selArea = areas.find((a) => String(a.id) === String(areaId))
  return (
    <div className="stack-md">
      <CitizenStyles />
      <PageHead title="Tell us what your area needs" eyebrow="For citizens · no login needed"
        steps={['Tap a picture', 'Choose your village', 'Send']}>
        Tap a picture, speak or type. Any Indian language is fine.
      </PageHead>
      <Tabs value={tab} onChange={setTab} label={t('Report a problem')} tabs={[{ value: 'individual', label: 'My problem' }, { value: 'community', label: 'Village meeting' }]} />
      <ErrorBox error={error} />
      {offlineMsg && <div className="alert alert-info" role="status"><CloudOff size={18} aria-hidden="true" /><div>{t(offlineMsg.key, { n: offlineMsg.n })}</div></div>}
      {outbox.length > 0 && <div className="alert alert-warn"><CloudOff size={18} aria-hidden="true" /><div>{t('{n} request(s) waiting. They will be sent when you are online.', { n: outbox.length })}</div></div>}

      {tab === 'individual' ? (
        <form onSubmit={submit} className="grid g-main">
          <div className="stack-md">
            <section className="card" aria-labelledby="st1">
              <div id="st1"><StepHead n={1}>{t('What is the problem?')}</StepHead></div>
              <div className="cz-picker" role="group" aria-label={t('Tap a picture')}>
                {PICK.map(({ key, word, Icon }) => {
                  const s = SECTORS[key]
                  const on = picked === key
                  return (
                    <button key={key} type="button" className={`cz-tile ${key === 'other' ? 'cz-other' : ''}`} aria-pressed={on} onClick={() => pick(key)}
                      style={on ? { borderColor: s.hex, background: `color-mix(in srgb, ${s.hex} 9%, #fff)` } : undefined}>
                      {on && <CheckCircle2 size={20} className="cz-check" color={s.hex} aria-hidden="true" />}
                      <span className="cz-ic" style={{ background: `color-mix(in srgb, ${s.hex} 14%, #fff)`, color: s.hex }}><Icon size={30} aria-hidden="true" /></span>
                      <span>{t(word)}</span>
                    </button>
                  )
                })}
              </div>
              <div className="cz-say">
                <VoiceInput lang={speakLang} onTranscript={(x) => setText((p) => (p ? p + ' ' : '') + x)} onAudio={setAudio} />
                <div className="stack">
                  <div className="field">
                    <label htmlFor="msg">{t('Speak or type more (optional)')}</label>
                    <textarea id="msg" ref={msgRef} className="textarea" value={text} onChange={(e) => setText(e.target.value)}
                      placeholder={t('Example: No road to our village. The ambulance cannot come in the rains.')} />
                  </div>
                  <div className="field">
                    <label htmlFor="speak-lang">{t('I speak')}</label>
                    <select id="speak-lang" className="select" value={speakLang} onChange={(e) => setSpeakLang(e.target.value)}>
                      {SPEAK_LANGS.map((l) => <option key={l} value={l}>{langLabel(l, t)}</option>)}
                    </select>
                  </div>
                  {audio && <span className="help">{t('Voice recorded ({n} KB). It is sent with your request.', { n: Math.round(audio.size / 1024) })}</span>}
                </div>
              </div>
            </section>

            <section className="card" aria-labelledby="st2" ref={whereRef} style={{ scrollMarginTop: 90 }}>
              <div id="st2"><StepHead n={2}>{t('Where?')}</StepHead></div>
              <p className="small muted" style={{ marginTop: 2, marginBottom: 12 }}>
                {t('Choose State → District → Mandal → Village')}
              </p>
              <div className="grid g-2">
                <div className="field">
                  <label htmlFor="sel-state">{t('State')}</label>
                  <select id="sel-state" className="select" value={selState} onChange={(e) => handleStateChange(e.target.value)} style={{ minHeight: 46 }}>
                    {hierarchy ? Object.keys(hierarchy.states || {}).map((s) => (
                      <option key={s} value={s}>{t(s)}</option>
                    )) : <option value="Telangana">{t('Telangana')}</option>}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sel-dist">{t('District')}</label>
                  <select id="sel-dist" className="select" value={selDistrict} onChange={(e) => handleDistrictChange(e.target.value)} style={{ minHeight: 46 }}>
                    {hierarchy && hierarchy.states?.[selState] ? (
                      Object.keys(hierarchy.states[selState].districts || {}).map((d) => (
                        <option key={d} value={d}>{t(d)}</option>
                      ))
                    ) : (
                      <>
                        <option value="Adilabad">{t('Adilabad')}</option>
                        <option value="Hyderabad">{t('Hyderabad')}</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sel-mandal">{t('Mandal')}</label>
                  <select id="sel-mandal" className="select" value={selMandal} onChange={(e) => handleMandalChange(e.target.value)} style={{ minHeight: 46 }}>
                    {hierarchy && hierarchy.states?.[selState]?.districts?.[selDistrict] ? (
                      Object.keys(hierarchy.states[selState].districts[selDistrict].mandals || {}).map((m) => (
                        <option key={m} value={m}>{m} {t('mandal')}</option>
                      ))
                    ) : (
                      <option value="Utnoor">Utnoor {t('mandal')}</option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sel-village">{t('Village / Ward')}</label>
                  <select id="sel-village" className="select" value={selVillage} onChange={(e) => handleVillageChange(e.target.value)} style={{ minHeight: 46 }}>
                    {hierarchy && hierarchy.states?.[selState]?.districts?.[selDistrict]?.mandals?.[selMandal] ? (
                      (hierarchy.states[selState].districts[selDistrict].mandals[selMandal] || []).map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))
                    ) : (
                      <option value="Birsaidpet">Birsaidpet</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="row mt" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="small muted">
                  <MapPin size={16} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--color-primary)' }} />
                  <strong>{selVillage}</strong> · {selMandal} {t('mandal')}, {t(selDistrict)}, {t(selState)}
                </span>
                <button type="button" className="btn" onClick={locate}>
                  <Crosshair size={16} aria-hidden="true" />
                  {coords ? t('Location found') : t('Use my location')}
                </button>
              </div>
            </section>

            {nearby.length > 0 && (
              <Card title="Already reported near you" sub="Tap Me too. No need to write again.">
                <div className="stack">
                  {nearby.map((c) => (
                    <div key={c.id} className="me-too">
                      <div style={{ minWidth: 0 }}><SectorTag sector={c.category} short /><div className="small"><strong>{c.title}</strong></div>
                        <div className="xs muted">{t('{n} families', { n: supported[c.id]?.cluster?.unique_households ?? c.unique_households })}</div></div>
                      {supported[c.id] ? <Badge tone="green"><CheckCircle2 size={12} aria-hidden="true" />{t('Counted')}</Badge>
                        : <button type="button" className="btn btn-primary" onClick={() => meToo(c)}><ThumbsUp size={16} aria-hidden="true" />{t('Me too')}</button>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <section className="card" aria-labelledby="st3">
              <div id="st3"><StepHead n={3}>{t('Send')}</StepHead></div>
              <div className="field">
                <label htmlFor="photos-input" className="btn btn-lg" style={{ width: 'fit-content', cursor: 'pointer' }}>
                  <Camera size={18} aria-hidden="true" />
                  {photos.length > 0 ? t('{n} photos chosen', { n: photos.length }) : t('Upload photos')}
                </label>
                <input
                  id="photos-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setPhotos(files)
                    if (files[0]) setPhoto(files[0])
                  }}
                />
                {photos.length > 0 && (
                  <div className="row mt" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {photos.map((p, idx) => (
                      <span key={idx} className="badge" style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: 8 }}>
                        📷 {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <details className="cz-more mt">
                <summary><SlidersHorizontal size={18} aria-hidden="true" />{t('More options (optional)')}</summary>
                <div className="stack mt">
                  <div className="grid g-2">
                    <div className="field">
                      <label htmlFor="phone">{t('Phone number, to get updates')}</label>
                      <input id="phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 90000 11111" />
                    </div>
                    <div className="field">
                      <label htmlFor="gender">{t('Gender')}</label>
                      <select id="gender" className="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="undisclosed">—</option><option value="female">{t('Woman')}</option><option value="male">{t('Man')}</option><option value="other">{t('Other')}</option>
                      </select>
                    </div>
                  </div>
                  <label className="check"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />{t('Hide my name and number from officers')}</label>
                  <label className="check"><input type="checkbox" checked={assisted} onChange={(e) => setAssisted(e.target.checked)} />{t('I am filing for someone else (ASHA, CSC, volunteer)')}</label>
                  {assisted && <div className="field"><label htmlFor="helper">{t('Your helper ID')}</label><input id="helper" className="input" value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="CSC-TS-0412 / ASHA-102" /></div>}
                </div>
              </details>
              <button className="btn btn-primary btn-lg mt" style={{ width: '100%', minHeight: 60, fontSize: '1.15rem', justifyContent: 'center' }} disabled={busy || (!text && !audio)}>
                <Send size={20} aria-hidden="true" />{busy ? t('Sending…') : t('Send my request')}
              </button>
              {!text && !audio && <p className="help mt" style={{ textAlign: 'center' }}>{t('Tap a picture or speak first.')}</p>}
            </section>
          </div>

          <aside className="stack-md">
            <Card title="What we understood" sub="Check it before sending.">
              {preview ? <Understanding u={preview} /> : <p className="muted small">{t('Tap a picture, speak or type…')}</p>}
            </Card>
            <HelpCard />
            <Card title="Try an example">
              <div className="stack">
                {EXAMPLES.map((ex) => <button key={ex} type="button" className="btn btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '8px 12px' }} onClick={() => { setText(ex); setPicked(null) }}>{ex}</button>)}
              </div>
            </Card>
          </aside>
        </form>
      ) : (
        <form onSubmit={submitCommunity} className="grid g-main">
          <Card title="Gram Sabha or ward meeting" sub="One meeting becomes many demands. Each counts its supporters.">
            <div className="field">
              <label htmlFor="c-area">{t('Village or ward')}</label>
              <select id="c-area" className="select" required value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                <option value="">—</option>
                <AreaOptions grouped={grouped} />
              </select>
            </div>
            <div className="field mt"><label htmlFor="fac">{t('Who ran the meeting')}</label><input id="fac" className="input" value={helper} onChange={(e) => setHelper(e.target.value)} placeholder={t('Panchayat secretary or ward member')} /></div>
            <div className="field mt">
              <label htmlFor="tr">{t('Meeting notes: one demand per line, with people count like (120 people)')}</label>
              <textarea id="tr" className="textarea" style={{ minHeight: 180 }} value={transcript} onChange={(e) => setTranscript(e.target.value)}
                placeholder={'Road to the village washes away every monsoon (120 people).\nThe school has only one teacher (64 people).\nHandpump broken for three weeks (80 people).'} />
            </div>
            <button className="btn btn-primary btn-lg mt" disabled={busy || !areaId || transcript.length < 10}><Send size={18} aria-hidden="true" />{busy ? t('Sending…') : t('Find the demands')}</button>
          </Card>
          <Card title="Demands found">
            {!communityRes ? <p className="muted small">{t('Paste the meeting notes and tap the button.')}</p> : (
              <div className="stack">
                {communityRes.demands.map((d) => (
                  <div key={d.tracking_id} className="card" style={{ boxShadow: 'none' }}>
                    <div className="row-between"><SectorTag sector={d.understanding.category} /><Badge tone="blue">{t('{n} people', { n: d.request.supporters })}</Badge></div>
                    <p className="small mt">{d.request.text}</p>
                    <div className="row xs muted"><span className="mono">{d.tracking_id}</span>{d.cluster && <span>· {t('{n} families', { n: d.cluster.unique_households })}</span>}</div>
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
