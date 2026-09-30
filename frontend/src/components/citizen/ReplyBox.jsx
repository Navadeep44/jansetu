import { useEffect, useState } from 'react'
import { Crosshair, MapPin, Send } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { ErrorBox } from '../ui'
import LocationPicker from '../common/LocationPicker'

/** Lets a citizen answer JanSetu's question ("where is this?") or add details, without logging in. */
export default function ReplyBox({ tid, waitingFor, onReplied, compact = false }) {
  const { t } = useApp()
  const [areas, setAreas] = useState([])
  const [areaId, setAreaId] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [answer, setAnswer] = useState(null)
  const askPlace = waitingFor === 'location'

  useEffect(() => {
    if (askPlace) api.areas().then(setAreas).catch(() => {})
  }, [askPlace])

  const send = async (payload) => {
    setBusy(true)
    setErr(null)
    try {
      const r = await api.reply(tid, payload)
      setAnswer(r)
      setText('')
      setAreaId('')
      onReplied?.(r)
    } catch (e) {
      setErr(e)
    } finally {
      setBusy(false)
    }
  }

  const useGps = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => send({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr(new Error('Could not get your location. Please pick from the list.')),
      { timeout: 8000 }
    )
  }

  return (
    <div className="reply-box">
      {askPlace ? (
        <div className="stack-md">
          <div className="card" style={{ padding: 14, background: '#f8fafc', boxShadow: 'none' }}>
            <LocationPicker
              areas={areas}
              value={areaId}
              onChange={(id) => setAreaId(id ? String(id) : '')}
              allowGps={false}
              showSummary={true}
              idPrefix={`reply-loc-${tid}`}
            />
            <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !areaId}
                onClick={() => send({ area_id: Number(areaId) })}
              >
                <MapPin size={16} aria-hidden="true" />
                {t('send_place', 'Confirm & Send Place')}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={useGps}
              >
                <Crosshair size={16} aria-hidden="true" />
                {t('use_location', 'Use my GPS')}
              </button>
            </div>
          </div>

          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim()) send({ text })
            }}
          >
            <label htmlFor={`place-${tid}`} className="sr-only">
              Or type the place name
            </label>
            <input
              id={`place-${tid}`}
              className="input"
              style={{ flex: 1, minWidth: 200 }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('place_hint', 'Or type the village / area name in any language…')}
            />
            <button className="btn" disabled={busy || !text.trim()}>
              <Send size={16} aria-hidden="true" />
              {t('send', 'Send')}
            </button>
          </form>
        </div>
      ) : (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) send({ text })
          }}
        >
          <label htmlFor={`reply-${tid}`} className="sr-only">
            Your reply
          </label>
          <input
            id={`reply-${tid}`}
            className="input"
            style={{ flex: 1, minWidth: 200 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              waitingFor === 'details'
                ? 'What is the problem about? (water, road, power, health, school, drains)'
                : compact
                ? 'Type your reply'
                : 'Add more details or reply'
            }
          />
          <button className="btn btn-primary" disabled={busy || !text.trim()}>
            <Send size={16} aria-hidden="true" />
            {busy ? t('sending', 'Sending…') : t('send', 'Send')}
          </button>
        </form>
      )}
      {answer && (
        <div className={`alert ${answer.resolved ? 'alert-success' : 'alert-warn'} mt`} role="status">
          <div className="small">{answer.reply}</div>
        </div>
      )}
      <ErrorBox error={err} />
    </div>
  )
}
