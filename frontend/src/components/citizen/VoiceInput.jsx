import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Volume2 } from 'lucide-react'
import { SPEECH_TAGS } from '../../lib/format'

/** On-device speech recognition (Web Speech API) + MediaRecorder capture of the original audio.
 *  Needs no server key. Where the browser has no recogniser, the raw audio is still sent and
 *  transcribed server-side (Bhashini / Whisper) or by a human officer. */
export default function VoiceInput({ lang, onTranscript, onAudio, labels }) {
  const [recording, setRecording] = useState(false)
  const [timer, setTimer] = useState(0)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)
  const mediaRef = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  useEffect(() => () => {
    recRef.current?.abort?.()
    mediaRef.current?.stream?.getTracks().forEach((t) => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const start = async () => {
    setInterim('')
    setTimer(0)
    timerRef.current = setInterval(() => setTimer((s) => s + 1), 1000)

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
      rec.onend = () => stop()
      rec.onerror = () => stop()
      rec.start()
      recRef.current = rec
    }
    setRecording(true)
  }

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    recRef.current?.stop()
    if (mediaRef.current?.state === 'recording') mediaRef.current.stop()
    setRecording(false)
  }

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="stack" style={{ alignItems: 'center', textAlign: 'center', width: '100%' }}>
      <button
        type="button"
        className={`mic-btn ${recording ? 'recording' : ''}`}
        style={recording ? {
          background: '#ef4444',
          borderColor: '#dc2626',
          boxShadow: '0 0 0 6px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 1.2s infinite'
        } : {}}
        onClick={recording ? stop : start}
        aria-pressed={recording}
        aria-label={recording ? labels.stop : labels.speak}
      >
        {recording ? <Square size={28} color="#fff" /> : <Mic size={36} />}
      </button>

      {/* Recording Waveform & Timer Feedback */}
      {recording ? (
        <div className="stack-xs" style={{ alignItems: 'center' }}>
          <div className="waveform" aria-hidden="true" style={{ display: 'flex', gap: 4, height: 28, alignItems: 'center', margin: '4px 0' }}>
            <span style={{ width: 4, height: 12, background: '#ef4444', borderRadius: 2, animation: 'pulseWave 0.6s infinite alternate' }} />
            <span style={{ width: 4, height: 24, background: '#ef4444', borderRadius: 2, animation: 'pulseWave 0.8s infinite alternate' }} />
            <span style={{ width: 4, height: 18, background: '#ef4444', borderRadius: 2, animation: 'pulseWave 0.5s infinite alternate' }} />
            <span style={{ width: 4, height: 28, background: '#ef4444', borderRadius: 2, animation: 'pulseWave 0.7s infinite alternate' }} />
            <span style={{ width: 4, height: 14, background: '#ef4444', borderRadius: 2, animation: 'pulseWave 0.9s infinite alternate' }} />
          </div>
          <div className="row" style={{ gap: 6, color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
            <span>Recording · {formatTimer(timer)}</span>
          </div>
          <span className="small text-danger" style={{ fontWeight: 500 }}>
            Tap the red square to stop recording
          </span>
        </div>
      ) : (
        <div className="small" aria-live="polite" style={{ fontWeight: 500 }}>
          {labels.speak}
        </div>
      )}

      {interim && <div className="small muted" style={{ fontStyle: 'italic', maxWidth: 360 }}>"{interim}"</div>}
      {!SR && <div className="help">{labels.unsupported}</div>}
    </div>
  )
}

/** Reads a message aloud in the citizen's language (for low-literacy users). */
export function SpeakButton({ text, lang = 'en', label = 'Listen' }) {
  const [speaking, setSpeaking] = useState(false)
  const ok = typeof window !== 'undefined' && 'speechSynthesis' in window
  if (!ok || !text) return null

  const speak = () => {
    try {
      window.speechSynthesis.cancel()
      if (speaking) {
        setSpeaking(false)
        return
      }
      const tag = SPEECH_TAGS[lang] || 'en-IN'
      const u = new SpeechSynthesisUtterance(text)
      u.lang = tag
      const voices = window.speechSynthesis.getVoices()
      const langPrefix = (tag.split('-')[0] || lang).toLowerCase()
      const exactVoice = voices.find((x) => x.lang?.toLowerCase() === tag.toLowerCase())
      const prefixVoice = voices.find((x) => x.lang?.toLowerCase().startsWith(langPrefix))
      const indicVoice = voices.find((x) => x.lang?.toLowerCase().includes('in'))
      if (exactVoice) u.voice = exactVoice
      else if (prefixVoice) u.voice = prefixVoice
      else if (indicVoice) u.voice = indicVoice

      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(u)
    } catch {
      setSpeaking(false)
    }
  }

  return (
    <button type="button" className={`btn btn-sm ${speaking ? 'btn-primary' : ''}`} onClick={speak} aria-label={`${label}: ${text.slice(0, 60)}`}>
      <Volume2 size={16} aria-hidden="true" />{speaking ? 'Speaking…' : label}
    </button>
  )
}
