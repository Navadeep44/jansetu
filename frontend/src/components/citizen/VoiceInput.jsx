import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { SPEECH_TAGS } from '../../lib/format'

/** On-device speech recognition (Web Speech API) + MediaRecorder capture of the original audio.
 *  Needs no server key. Where the browser has no recogniser, the raw audio is still sent and
 *  transcribed server-side (Bhashini / Whisper) or by a human officer. */
export default function VoiceInput({ lang, onTranscript, onAudio, labels }) {
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)
  const mediaRef = useRef(null)
  const chunks = useRef([])
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => () => { recRef.current?.abort?.(); mediaRef.current?.stream?.getTracks().forEach((t) => t.stop()) }, [])

  const start = async () => {
    setInterim('')
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        chunks.current = []
        mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
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
        if (finalText) onTranscript(finalText.trim())
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
        aria-pressed={recording} aria-label={recording ? labels.stop : labels.speak}>
        {recording ? <Square size={32} /> : <Mic size={36} />}
      </button>
      <div className="small" aria-live="polite">{recording ? labels.listening : labels.speak}</div>
      {interim && <div className="small muted">{interim}</div>}
      {!SR && <div className="help">{labels.unsupported}</div>}
    </div>
  )
}

/** Reads a message aloud in the citizen's language (for low-literacy users). */
export function SpeakButton({ text, lang, label = 'Listen' }) {
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  if (!ok) return null
  const speak = () => {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = SPEECH_TAGS[lang] || 'en-IN'
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith(u.lang.slice(0, 2).toLowerCase()))
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  }
  return (
    <button type="button" className="btn btn-sm" onClick={speak} aria-label={`${label}: ${text.slice(0, 60)}`}>
      <Volume2 size={16} aria-hidden="true" />{label}
    </button>
  )
}
