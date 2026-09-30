import { useEffect, useRef, useState } from 'react'
import { MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { Badge, Card, PageHead, SectorTag, Seg } from '../../components/ui'
import { LANG_NAMES, pct } from '../../lib/format'

const SCRIPTS = [
  { label: 'Telugu voice note: no drinking water, Jainoor', msgs: ['మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. పిల్లలకు నీళ్ళు లేవు.', 'జైనూర్'] },
  { label: 'Hindi voice note: road washed away, Bawana', msgs: ['गाँव तक पक्की सड़क नहीं है, बारिश में एम्बुलेंस नहीं आ पाती। Bawana'] },
  { label: 'Tamil: broken tap, Utnoor', msgs: ['எங்கள் கிராமத்தில் குடிநீர் குழாய் உடைந்துவிட்டது, தண்ணீர் வரவில்லை. Utnoor'] },
  { label: 'Bengali: no roads in monsoon, Koraput', msgs: ['আমাদের গ্রামে কোনো পাকা রাস্তা নেই, বর্ষায় যোগাযোগ বিচ্ছিন্ন হয়ে যায়। Koraput'] },
  { label: 'Bhojpuri: overflowing drain, Seelampur', msgs: ['हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न। Seelampur'] },
  { label: 'Marathi: power cut for 4 days, Utnoor', msgs: ['गावात चार दिवसांपासून वीज नाही, ट्रान्सफॉर्मर जळाला आहे. Utnoor'] },
  { label: 'Check status by tracking ID', msgs: ['status JS-IN-LAKSH1'] },
]
const HEADS = {
  whatsapp: 'WhatsApp (Demo Simulation) · JanSetu',
  telegram: 'Telegram (Demo Simulation) · @JanSetuBot',
  sms: 'SMS (Demo Simulation) · 1800-JANSETU',
  ivr: 'IVR Call (Demo Simulation) · 1800-JANSETU',
}

export default function Channels() {
  const { t } = useApp()
  const [channel, setChannel] = useState('whatsapp')
  const [sender] = useState(() => '+91' + Math.floor(7000000000 + Math.random() * 999999999))
  const [msgs, setMsgs] = useState([{ from: 'bot', text: 'Namaste! This is JanSetu. Tell us, by voice or text in your own language, what your area needs.' }])
  const [text, setText] = useState('')
  const [last, setLast] = useState(null)
  const body = useRef(null)
  useEffect(() => { body.current?.scrollTo(0, body.current.scrollHeight) }, [msgs])

  const send = async (t, extra = {}) => {
    if (!t && !extra.lat) return
    setMsgs((m) => [...m, { from: 'me', text: t || '[Location shared]' }])
    setText('')
    const res = await api.simulate({ channel, sender, text: t, ...extra })
    setLast(res)
    setMsgs((m) => [...m, { from: 'bot', text: res.reply, meta: res.kind }])
  }
  const runScript = async (s) => { for (const m of s.msgs) { await send(m) } }

  return (
    <div className="stack-md">
      <PageHead title={t('channels_title', 'WhatsApp & phone demo')}>
        {t('channels_subtitle', 'Interactive simulation of citizen mobile channels. Real WhatsApp, Telegram, phone calls and SMS connect to the same AI backend.')}
      </PageHead>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="stack-md" style={{ maxWidth: 360 }}>
          <div className="phone" aria-label="Phone chat simulator">
            {/* Clear Demo Simulation Banner */}
            <div style={{
              background: '#fef3c7',
              color: '#92400e',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 700,
              textAlign: 'center',
              letterSpacing: '0.04em',
              borderBottom: '1px solid #fde68a'
            }}>
              DEMO SIMULATION · NOT REAL WHATSAPP
            </div>
            <div className={`phone-head ${channel}`}>
              <Phone size={18} aria-hidden="true" /><strong>{HEADS[channel]}</strong>
            </div>
            <div className="phone-body" ref={body} aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={`bubble ${m.from}`}>{m.text}{m.meta && <div className="meta">{m.meta.replace('_', ' ')}</div>}</div>
              ))}
            </div>
            <form className="phone-input" onSubmit={(e) => { e.preventDefault(); send(text) }}>
              <button type="button" className="btn btn-icon btn-ghost" aria-label="Share location" onClick={() => send('', { lat: 19.39, lng: 78.96 })}><MapPin size={18} /></button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message" aria-label="Message" />
              <button className="btn btn-icon btn-primary" aria-label="Send" style={{ borderRadius: '50%' }}><Send size={18} /></button>
            </form>
          </div>

          {/* Real WhatsApp Channel Card */}
          <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 16 }}>
            <div className="row" style={{ gap: 8, color: '#166534', fontWeight: 600, marginBottom: 6 }}>
              <MessageCircle size={18} />
              <span>Real WhatsApp Channel</span>
            </div>
            <p className="small" style={{ color: '#14532d', margin: '0 0 12px 0' }}>
              Want to try on your real phone? Connect directly to our official WhatsApp Business bot number (+91 90000 11111).
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fwa.me%2F919000011111%3Ftext%3DNamaste%20JanSetu"
                alt="WhatsApp QR Code"
                width={88}
                height={88}
                style={{ borderRadius: 6, border: '1px solid #86efac', background: '#fff', padding: 4 }}
              />
              <div className="stack-xs">
                <span className="xs muted">Scan with your camera or tap below to open WhatsApp:</span>
                <a
                  href="https://wa.me/919000011111?text=Namaste%20JanSetu%2C%20I%20want%20to%20report%20a%20problem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-primary"
                  style={{ background: '#25d366', borderColor: '#25d366', color: '#fff', width: 'fit-content' }}
                >
                  <MessageCircle size={16} /> Chat on WhatsApp
                </a>
              </div>
            </div>
            <div className="xs muted">
              Official JanSetu helpline bot · Free and confidential
            </div>
          </div>
        </div>
        <div className="stack-md">
          <Card title="Channel">
            <Seg label="Channel" value={channel} onChange={setChannel} options={[
              { value: 'whatsapp', label: 'WhatsApp' }, { value: 'telegram', label: 'Telegram' }, { value: 'sms', label: 'SMS' }, { value: 'ivr', label: 'IVR' }]} />
            <p className="help mt">IVR: callers pick a language, speak after the beep; the recording is transcribed (Bhashini / Whisper) and the reply is read back and sent by SMS. Works on any feature phone.</p>
          </Card>
          <Card title="Demo scripts">
            <div className="stack">{SCRIPTS.map((s) => <button key={s.label} className="btn btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => runScript(s)}>{s.label}</button>)}</div>
          </Card>
          {last?.understanding && (
            <Card title="Behind the scenes" sub="What the pipeline extracted from the last message">
              <dl className="kv">
                <dt>Language</dt><dd>{LANG_NAMES[last.understanding.language] || last.understanding.language}</dd>
                <dt>Need</dt><dd><SectorTag sector={last.understanding.category} /></dd>
                <dt>Issue</dt><dd>{last.understanding.subcategory_label}</dd>
                <dt>English</dt><dd className="small">{last.understanding.translated_text}</dd>
                <dt>Place</dt><dd>{last.understanding.geo?.area || '—'} <span className="muted xs">{last.understanding.geo?.method}</span></dd>
                <dt>Confidence</dt><dd className="mono">{pct(last.understanding.confidence)}</dd>
                <dt>Flags</dt><dd>{last.understanding.flags?.length ? last.understanding.flags.map((f) => <Badge key={f} tone="amber">{f.replace(/_/g, ' ')}</Badge>) : '—'}</dd>
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
