import { useEffect, useRef, useState } from 'react'
import { MapPin, MessageCircle, MessageSquare, Phone, PhoneCall, Send } from 'lucide-react'
import { api } from '../../api/client'
import { useT } from '../../i18n'
import { CitizenStyles } from '../../components/citizen/VoiceInput'
import { Badge, Card, PageHead, SectorTag } from '../../components/ui'
import { LANG_NAMES, pct } from '../../lib/format'

// India-only sample messages, as real citizens would send them.
const SCRIPTS = [
  { label: 'Telugu: water, place asked later', msgs: ['మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. పిల్లలకు నీళ్ళు లేవు.', 'జైనూర్'] },
  { label: 'Hindi: no doctor, Bahraich', msgs: ['हमारे गाँव के स्वास्थ्य केंद्र में डॉक्टर नहीं आते, गर्भवती महिलाओं को बहराइच जाना पड़ता है। Mihinpurwa'] },
  { label: 'Odia: water, Koraput', msgs: ['ଆମ ଗାଁରେ ପିଇବା ପାଣି ନାହିଁ, ନଳକୂପ ଖରାପ ହୋଇଯାଇଛି। Koraput'] },
  { label: 'Bhojpuri: drain, Delhi', msgs: ['हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न। Seelampur'] },
  { label: 'English: power cuts, Hyderabad', msgs: ['Power cuts every night in Malakpet for a week, students cannot study.'] },
  { label: 'Check status', msgs: ['status JS-IN-LAKSH1'] },
]
const DEMO_NO = '1800-000-0000'
const HEADS = { whatsapp: 'WhatsApp · JanSetu', telegram: 'Telegram · @JanSetuBot', sms: `SMS · ${DEMO_NO}`, ivr: `IVR · ${DEMO_NO}` }
const HEAD_BG = { ivr: '#4c1d95' }
// Phone menu is always spoken in all four languages (the caller may not read).
const IVR_MENU = 'JanSetu. हिन्दी के लिए 1 दबाएँ। తెలుగు కోసం 2 నొక్కండి. For English, press 3. ଓଡ଼ିଆ ପାଇଁ 4 ଦବାନ୍ତୁ।'
const IVR_KEYS = [
  { key: '1', lang: 'hi', name: 'हिन्दी', prompt: 'बीप के बाद अपनी समस्या और गाँव का नाम बोलिए।' },
  { key: '2', lang: 'te', name: 'తెలుగు', prompt: 'బీప్ తర్వాత మీ సమస్య, ఊరి పేరు చెప్పండి.' },
  { key: '3', lang: 'en', name: 'English', prompt: 'After the beep, say your problem and your village name.' },
  { key: '4', lang: 'or', name: 'ଓଡ଼ିଆ', prompt: 'ବିପ୍ ପରେ ଆପଣଙ୍କ ସମସ୍ୟା ଓ ଗାଁ ନାମ କୁହନ୍ତୁ।' },
]
const KIND_WORD = { welcome: 'Welcome', verification: 'Checked', ack: 'Saved', ask_location: 'Asked for place', clarify: 'Asked for details', safety: 'Urgent', status: 'Status', noted: 'Noted' }

export default function Channels() {
  const t = useT()
  const [channel, setChannel] = useState('whatsapp')
  const [sender] = useState(() => '+91' + Math.floor(7000000000 + Math.random() * 999999999))
  const [msgs, setMsgs] = useState([])
  const [ivrLang, setIvrLang] = useState(null)
  const [text, setText] = useState('')
  const [last, setLast] = useState(null)
  const [busy, setBusy] = useState(false)
  const body = useRef(null)
  useEffect(() => { body.current?.scrollTo(0, body.current.scrollHeight) }, [msgs])
  useEffect(() => { setMsgs([]); setIvrLang(null); setLast(null) }, [channel])

  const ivr = channel === 'ivr'
  const welcome = ivr ? IVR_MENU : t('Namaste! This is JanSetu. Tell us your area’s problem, by voice or text, in your language.')

  const send = async (msg, extra = {}) => {
    if (!msg && !extra.lat) return
    setMsgs((m) => [...m, { from: 'me', text: msg || `📍 ${t('Location shared')}` }])
    setText(''); setBusy(true)
    try {
      const res = await api.simulate({ channel, sender, text: msg, language: ivr ? ivrLang || undefined : undefined, ...extra })
      setLast(res)
      setMsgs((m) => [...m, { from: 'bot', text: res.reply, meta: res.kind }])
    } catch (e) {
      setMsgs((m) => [...m, { from: 'bot', text: e.message }])
    } finally { setBusy(false) }
  }
  const press = (k) => {
    setIvrLang(k.lang)
    setMsgs((m) => [...m, { from: 'me', text: `☎ ${k.key}` }, { from: 'bot', text: k.prompt }])
  }
  const runScript = async (s) => { for (const m of s.msgs) { await send(m) } }

  return (
    <div className="stack-md">
      <CitizenStyles />
      <PageHead title="WhatsApp & phone demo" eyebrow="For citizens · no login needed" overlap={false}
        steps={['Pick WhatsApp, SMS or phone call', 'Type like a citizen', 'See the reply and tracking ID']}>
        Real WhatsApp, Telegram, SMS and phone calls use this same engine.
      </PageHead>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="phone" aria-label={t('Phone chat demo')} style={{ margin: '0 auto' }}>
          <div className={`phone-head ${channel}`} style={HEAD_BG[channel] ? { background: HEAD_BG[channel] } : undefined}>
            {ivr ? <PhoneCall size={18} aria-hidden="true" /> : <Phone size={18} aria-hidden="true" />}<strong>{HEADS[channel]}</strong>
            <span style={{ marginLeft: 'auto' }}><Badge tone="amber">{t('Demo')}</Badge></span>
          </div>
          <div className="phone-body" ref={body} aria-live="polite">
            <div className="bubble bot">{welcome}</div>
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.from}`}>{m.text}{m.meta && <div className="meta">{t(KIND_WORD[m.meta] || m.meta.replace('_', ' '))}</div>}</div>
            ))}
            {busy && <div className="bubble bot" aria-label={t('Loading')}>…</div>}
          </div>
          {ivr && (
            <div role="group" aria-label={t('Phone keypad')} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, padding: '8px 8px 0', background: '#f0f2f5' }}>
              {IVR_KEYS.map((k) => (
                <button key={k.key} type="button" className={`btn ${ivrLang === k.lang ? 'btn-primary' : ''}`} style={{ flexDirection: 'column', gap: 0, minHeight: 52, padding: 4 }} onClick={() => press(k)}>
                  <strong style={{ fontSize: '1.15rem' }}>{k.key}</strong><span className="xs">{k.name}</span>
                </button>
              ))}
            </div>
          )}
          <form className="phone-input" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <button type="button" className="btn btn-icon btn-ghost" aria-label={t('Share location')} onClick={() => send('', { lat: 19.39, lng: 78.96 })}><MapPin size={18} aria-hidden="true" /></button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={ivr ? t('What the caller says') : t('Message')} aria-label={ivr ? t('What the caller says') : t('Message')} style={{ minWidth: 0 }} />
            <button className="btn btn-icon btn-primary" aria-label={t('Send')} style={{ borderRadius: '50%' }} disabled={busy}><Send size={18} aria-hidden="true" /></button>
          </form>
        </div>
        <div className="stack-md">
          <Card title="Channel">
            <div role="group" aria-label={t('Channel')} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
              {[['whatsapp', 'WhatsApp', MessageCircle], ['telegram', 'Telegram', Send], ['sms', 'SMS', MessageSquare], ['ivr', 'Phone call', PhoneCall]].map(([v, l, Ic]) => (
                <button key={v} type="button" className={`btn ${channel === v ? 'btn-primary' : ''}`} aria-pressed={channel === v} onClick={() => setChannel(v)} style={{ justifyContent: 'center' }}>
                  <Ic size={16} aria-hidden="true" />{t(l)}
                </button>
              ))}
            </div>
            {ivr
              ? <p className="help mt">{t('Works on any basic phone. Press a number, speak after the beep. We send the reply by SMS.')}</p>
              : <p className="help mt">{t('Send a voice note or text. JanSetu replies in the same language.')}</p>}
          </Card>
          <Card title="Try a sample message">
            <div className="stack">{SCRIPTS.map((s) => <button key={s.label} type="button" className="btn btn-sm" style={{ justifyContent: 'flex-start', minHeight: 44 }} disabled={busy} onClick={() => runScript(s)}>{t(s.label)}</button>)}</div>
          </Card>
          {last?.understanding && (
            <Card title="What JanSetu understood" sub="From the last message">
              <dl className="kv">
                <dt>{t('Language')}</dt><dd>{t(LANG_NAMES[last.understanding.language] || last.understanding.language)}</dd>
                <dt>{t('Problem')}</dt><dd><SectorTag sector={last.understanding.category} /></dd>
                <dt>{t('Details')}</dt><dd>{last.understanding.subcategory_label}</dd>
                <dt>{t('In English')}</dt><dd className="small">{last.understanding.translated_text}</dd>
                <dt>{t('Place')}</dt><dd>{last.understanding.geo?.area || '—'}</dd>
                <dt>{t('How sure we are')}</dt><dd className="mono">{pct(last.understanding.confidence)}</dd>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
