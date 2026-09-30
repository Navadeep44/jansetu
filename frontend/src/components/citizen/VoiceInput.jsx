import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { SPEECH_TAGS } from '../../lib/format'
import { useT } from '../../i18n'

/** On-device speech recognition (Web Speech API) + MediaRecorder capture of the original audio.
 *  Needs no server key. Where the browser has no recogniser, the raw audio is still sent and
 *  transcribed server-side (Bhashini / Whisper) or by a human officer. */
export default function VoiceInput({ lang, onTranscript, onAudio, labels = {} }) {
  const t = useT()
  const L = {
    speak: labels.speak || t('Tap to speak'), stop: labels.stop || t('Tap to stop'),
    listening: labels.listening || t('Listening… speak now'),
    unsupported: labels.unsupported || t('Voice typing does not work here. Your voice is still recorded and sent.'),
  }
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)
  const mediaRef = useRef(null)
  const chunks = useRef([])
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => () => { recRef.current?.abort?.(); mediaRef.current?.stream?.getTracks().forEach((x) => x.stop()) }, [])

  const start = async () => {
    setInterim('')
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        chunks.current = []
        mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        mr.onstop = () => {
          stream.getTracks().forEach((x) => x.stop())
          onAudio?.(new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' }))
        }
        mr.start()
        mediaRef.current = mr
      } catch { /* mic permission denied: continue with recogniser only */ }
    }
    if (SR) {
      const rec = new SR()
      rec.lang = SPEECH_TAGS[lang] || 'en-IN'
      rec.interimResults = true
      rec.continuous = true
      let finalText = ''
      rec.onresult = (e) => {
        let tmp = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
          else tmp += e.results[i][0].transcript
        }
        setInterim(tmp)
        if (finalText) { onTranscript(finalText.trim()); finalText = '' }
      }
      rec.onend = () => setRecording(false)
      rec.onerror = () => setRecording(false)
      rec.start()
      recRef.current = rec
    }
    setRecording(true)
  }

  const stop = () => {
    recRef.current?.stop()
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    setRecording(false)
  }

  return (
    <div className="stack" style={{ alignItems: 'center', textAlign: 'center' }}>
      <button type="button" className={`mic-btn ${recording ? 'recording' : ''}`} onClick={recording ? stop : start}
        aria-pressed={recording} aria-label={recording ? L.stop : L.speak}>
        {recording ? <Square size={32} aria-hidden="true" /> : <Mic size={36} aria-hidden="true" />}
      </button>
      <div className="small" style={{ fontWeight: 600 }} aria-live="polite">{recording ? L.listening : L.speak}</div>
      {interim && <div className="small muted">{interim}</div>}
      {!SR && <div className="help">{L.unsupported}</div>}
    </div>
  )
}

/** Reads a message aloud in the message's own language (for low-literacy users). Tap again to stop. */
export function SpeakButton({ text, lang, label, className = 'btn btn-sm' }) {
  const t = useT()
  const [on, setOn] = useState(false)
  useEffect(() => () => { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }, [])
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  if (!ok || !text) return null
  const speak = () => {
    const ss = window.speechSynthesis
    if (on) { ss.cancel(); setOn(false); return }
    ss.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = SPEECH_TAGS[lang] || 'en-IN'
    const v = ss.getVoices().find((x) => x.lang?.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()))
    if (v) u.voice = v
    u.rate = 0.92
    u.onend = () => setOn(false)
    ss.speak(u); setOn(true)
  }
  return (
    <button type="button" className={className} onClick={speak} aria-pressed={on}>
      {on ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}{on ? t('Stop') : (label || t('Listen'))}
    </button>
  )
}

/** Small shared styles for the citizen pages (big picture tiles, numbered steps, progress stepper). */
export const CZ_CSS = `
.cz-steph { display:flex; align-items:center; gap:12px; margin:0 0 14px; font-size:1.2rem; font-weight:700; }
.cz-num { width:36px; height:36px; flex:none; border-radius:50%; display:grid; place-items:center; background:var(--lp-navy,#0b1a33); color:#fff; font-size:1.05rem; font-weight:800; }
.cz-picker { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:10px; }
@media (max-width:1280px) and (min-width:561px) { .cz-picker { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.cz-tile { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; min-height:118px; padding:12px 8px; border:2px solid #e2e8f0; border-radius:18px; background:#fff; color:inherit; font:inherit; font-weight:700; font-size:1.05rem; cursor:pointer; transition:transform 120ms, border-color 120ms, box-shadow 120ms; }
.cz-tile:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(15,23,42,.08); }
.cz-tile:focus-visible { outline:3px solid #0369a1; outline-offset:2px; }
.cz-tile[aria-pressed="true"] { border-width:3px; box-shadow:0 8px 22px rgba(15,23,42,.12); }
.cz-ic { width:58px; height:58px; border-radius:16px; display:grid; place-items:center; }
.cz-check { position:absolute; top:8px; right:8px; }
.cz-say { display:grid; grid-template-columns:auto minmax(0,1fr); gap:16px; align-items:start; margin-top:16px; }
@media (max-width:560px) { .cz-picker { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; } .cz-tile { min-height:100px; font-size:.95rem; border-radius:14px; } .cz-ic { width:48px; height:48px; } .cz-say { grid-template-columns:minmax(0,1fr); } .cz-tile.cz-other { grid-column:1 / -1; flex-direction:row; min-height:60px; } .cz-tile.cz-other .cz-ic { width:40px; height:40px; } }
.cz-bigid { font-size:clamp(2rem,9vw,3.1rem); font-weight:800; letter-spacing:.04em; line-height:1.1; word-break:break-all; font-variant-numeric:tabular-nums; }
.cz-next { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; list-style:none; padding:0; margin:0; }
.cz-next li { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; font-size:.92rem; font-weight:600; }
@media (max-width:560px) { .cz-next { grid-template-columns:minmax(0,1fr); } .cz-next li { flex-direction:row; text-align:left; } }
.cz-stepper { list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:0; }
.cz-stepper li { position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:0 4px; font-size:.88rem; font-weight:600; color:#64748b; }
.cz-stepper li::before { content:''; position:absolute; top:24px; left:-50%; width:100%; height:4px; background:#e2e8f0; z-index:0; }
.cz-stepper li:first-child::before { display:none; }
.cz-stepper li.done::before, .cz-stepper li.now::before { background:#16a34a; }
.cz-dot { position:relative; z-index:1; width:48px; height:48px; border-radius:50%; display:grid; place-items:center; background:#f1f5f9; color:#94a3b8; border:3px solid #e2e8f0; }
.cz-stepper li.done { color:#15803d; } .cz-stepper li.done .cz-dot { background:#dcfce7; color:#15803d; border-color:#16a34a; }
.cz-stepper li.now { color:#0b1a33; } .cz-stepper li.now .cz-dot { background:#0369a1; color:#fff; border-color:#0369a1; box-shadow:0 0 0 6px #e0f2fe; }
.cz-stepper li.bad .cz-dot { background:#dc2626; border-color:#dc2626; box-shadow:0 0 0 6px #fee2e2; }
.cz-stepper .cz-when { font-size:.75rem; font-weight:500; color:#94a3b8; }
@media (max-width:640px) {
  .cz-stepper { grid-template-columns:minmax(0,1fr); gap:10px; }
  .cz-stepper li { flex-direction:row; text-align:left; gap:12px; padding:0; font-size:1rem; }
  .cz-stepper li::before { top:-10px; left:22px; width:4px; height:10px; }
  .cz-dot { width:44px; height:44px; flex:none; }
}
.cz-fix { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.cz-fix .btn { min-height:64px; font-size:1.1rem; font-weight:700; justify-content:center; }
@media (max-width:420px) { .cz-fix { grid-template-columns:1fr; } }
.cz-help li { display:flex; gap:12px; align-items:flex-start; }
.cz-help { list-style:none; padding:0; margin:0; display:grid; gap:14px; }
.cz-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
@media (max-width:900px) { .cz-stats { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; } .cz-stats .stat-value { font-size:1.6rem; } }
.cz-count { font-size:1.9rem; font-weight:800; line-height:1.1; }
.cz-words { font-size:.85rem; color:#475569; }
.cz-said { display:grid; grid-template-columns:auto minmax(0,1fr); gap:10px; align-items:start; }
.cz-said .cz-lab { font-size:.75rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#64748b; }
.cz-arrow { display:flex; justify-content:center; color:#94a3b8; margin:-2px 0; }
.cz-chips { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; scrollbar-width:thin; }
.cz-chips .btn { white-space:nowrap; }
details.cz-more > summary { cursor:pointer; min-height:44px; display:flex; align-items:center; gap:8px; font-weight:600; list-style:none; }
details.cz-more > summary::-webkit-details-marker { display:none; }
`
export const CitizenStyles = () => <style>{CZ_CSS}</style>
