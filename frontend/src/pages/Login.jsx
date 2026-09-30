import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Info, KeyRound, LogIn, Megaphone, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { Card, ErrorBox, PageHead } from '../components/ui'

const WHAT = {
  field_officer: 'Checks unclear reports, closes work with proof',
  district: 'Approves projects for the district',
  national: 'Sees the whole country, sets priorities',
  brics_analyst: 'Compares countries',
}

function CitizenLogin({ next }) {
  const { sendCitizenCode, loginCitizen } = useApp()
  const nav = useNavigate()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null)
    try { setSent(await sendCitizenCode(phone)) } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  const verify = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null)
    try { await loginCitizen(phone, code); nav(next || '/track', { replace: true }) } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  return (
    <div className="grid g-2" style={{ alignItems: 'start' }}>
      <Card title="Citizen login" sub="With your phone number. No password.">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.form key="phone" onSubmit={send} className="stack-md" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
              <div className="field">
                <label htmlFor="cphone">Phone number</label>
                <input id="cphone" className="input" inputMode="tel" autoComplete="tel" placeholder="+91 90000 11111" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <span className="help">Use the same number you used when reporting.</span>
              </div>
              <button className="btn btn-primary btn-lg" disabled={busy || phone.replace(/\D/g, '').length < 8}><Phone size={18} aria-hidden="true" />{busy ? 'Sending…' : 'Send me a code'}</button>
            </motion.form>
          ) : (
            <motion.form key="code" onSubmit={verify} className="stack-md" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
              <div className="field">
                <label htmlFor="ccode">6-digit code sent to {phone}</label>
                <input id="ccode" className="input mono otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
              </div>
              {sent.demo_code && (
                <div className="alert alert-info"><KeyRound size={18} aria-hidden="true" />
                  <div className="small">Demo mode (no SMS gateway): your code is <strong className="mono">{sent.demo_code}</strong>
                    <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setCode(sent.demo_code)}>Fill it</button></div></div>
              )}
              <div className="row">
                <button className="btn btn-primary btn-lg" disabled={busy || code.length !== 6}><LogIn size={18} aria-hidden="true" />{busy ? 'Checking…' : 'Log in'}</button>
                <button type="button" className="btn" onClick={() => { setSent(null); setCode('') }}>Change number</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        <ErrorBox error={err} />
      </Card>
      <Card title="Why log in? (optional)">
        <ul className="check-list">
          <li><UserRound size={18} aria-hidden="true" /><span>See <strong>all your requests</strong> in one place</span></li>
          <li><Phone size={18} aria-hidden="true" /><span>Your number is <strong>filled in</strong> automatically</span></li>
          <li><ShieldCheck size={18} aria-hidden="true" /><span>Your "fixed / not fixed" answer is <strong>verified</strong></span></li>
        </ul>
        <div className="alert alert-success mt"><Info size={18} aria-hidden="true" />
          <div className="small"><strong>You never need to log in to report.</strong> Anyone can report, even anonymously or on a shared phone.
            <div style={{ marginTop: 8 }}><Link to="/report" className="btn btn-sm"><Megaphone size={16} aria-hidden="true" />Report without login</Link></div></div>
        </div>
      </Card>
    </div>
  )
}

function OfficialLogin() {
  const { login } = useApp()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState([])
  useEffect(() => { api.demoAccounts().then(setDemo).catch(() => {}) }, [])
  const submit = async (e, user = u, pass = p) => {
    e?.preventDefault()
    setBusy(true); setErr(null)
    try { await login(user, pass) } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  return (
    <div className="grid g-2" style={{ alignItems: 'start' }}>
      <Card title="Official login" sub="For government staff only">
        <form onSubmit={submit} className="stack-md">
          <div className="field"><label htmlFor="u">Username</label><input id="u" className="input" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></div>
          <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" className="input" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></div>
          <ErrorBox error={err} />
          <button className="btn btn-primary btn-lg" disabled={busy || !u || !p}><LogIn size={18} aria-hidden="true" />{busy ? 'Signing in…' : 'Log in'}</button>
        </form>
        <p className="help mt">In a real deployment this connects to the government's single sign-on (e.g. Parichay, gov.br).</p>
      </Card>
      <Card title="Demo accounts" sub="Tap one to log in instantly">
        <div className="stack">
          {demo.map((d) => (
            <motion.button key={d.username} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="card role-card" style={{ textAlign: 'left', boxShadow: 'none', cursor: 'pointer' }} onClick={(e) => submit(e, d.username, d.password)}>
              <div className="row-between"><strong>{d.name}</strong><span className="badge badge-blue">{d.title}</span></div>
              <div className="small muted">{WHAT[d.role]}</div>
              <div className="xs mono muted">{d.username} / {d.password}</div>
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function Login() {
  const { isOfficial, isCitizen } = useApp()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const as = sp.get('as') === 'official' ? 'official' : sp.get('as') === 'citizen' ? 'citizen' : 'citizen'
  const next = sp.get('next')
  useEffect(() => { if (isOfficial) nav(next || '/dashboard', { replace: true }) }, [isOfficial, nav, next])
  useEffect(() => { if (isCitizen && as === 'citizen') nav(next || '/track', { replace: true }) }, [isCitizen, as, nav, next])

  return (
    <div className="stack-md narrow">
      <PageHead title={as === 'official' ? 'Official login' : 'Citizen login'} eyebrow={as === 'official' ? 'For government staff' : 'Optional for citizens'}>
        {as === 'official' ? 'Log in to see the inbox, dashboard, priorities and projects.' : 'You never need to log in to report. Log in only to see all your requests in one place.'}
      </PageHead>
      <div className="login-switch" role="tablist" aria-label="Who are you?">
        {[{ v: 'citizen', label: 'I am a citizen', Icon: UserRound }, { v: 'official', label: 'I am an official', Icon: Building2 }].map(({ v, label, Icon }) => (
          <button key={v} role="tab" aria-selected={as === v} className={`login-tab ${as === v ? 'active' : ''}`}
            onClick={() => setSp(next ? { as: v, next } : { as: v })}>
            {as === v && <motion.span layoutId="login-pill" className="login-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="login-tab-label"><Icon size={18} aria-hidden="true" />{label}</span>
          </button>
        ))}
      </div>
      {as === 'citizen' ? <CitizenLogin next={next} /> : <OfficialLogin />}
    </div>
  )
}
