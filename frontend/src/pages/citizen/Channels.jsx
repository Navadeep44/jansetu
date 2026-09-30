import { useEffect, useRef, useState } from 'react'
import { MapPin, Phone, Send } from 'lucide-react'
import { api } from '../../api/client'
import { Badge, Card, PageHead, SectorTag, Seg } from '../../components/ui'
import { LANG_NAMES, pct } from '../../lib/format'

const SCRIPTS = [
  { label: 'Telugu voice note, no place', msgs: ['మా ఊరిలో తాగునీరు లేదు, బోరు పాడైపోయింది. పిల్లలకు నీళ్ళు లేవు.', 'జైనూర్'] },
  { label: 'Bhojpuri, Delhi', msgs: ['हमनी के गली में नाली उफना जाला, सीवर के पानी से लइकन बेमार हो जात बाड़न। Seelampur'] },
  { label: 'Portuguese, São Paulo', msgs: ['Poste de luz queimado há dois meses em Capão Redondo, a rua fica escura e perigosa.'] },
  { label: 'isiZulu, Soweto', msgs: ['Awukho ugesi kusukela izolo eSoweto, i-load shedding ayipheli.'] },
  { label: 'Russian (partner node)', msgs: ['Нет воды уже три дня, дети без питьевой воды. Utnoor'] },
  { label: 'Check status', msgs: ['status JS-IN-LAKSH1'] },
]
const HEADS = { whatsapp: 'WhatsApp · JanSetu', telegram: 'Telegram · @JanSetuBot', sms: 'SMS · 1800-JANSETU', ivr: 'IVR call · 1800-JANSETU' }

export default function Channels() {
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
      <PageHead title="WhatsApp & phone demo">
        Chat exactly like a citizen would. Real WhatsApp, Telegram, phone calls and SMS use the same engine.
      </PageHead>
      <div className="grid g-main" style={{ alignItems: 'start' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div className="phone" aria-label="Phone chat simulator">
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
