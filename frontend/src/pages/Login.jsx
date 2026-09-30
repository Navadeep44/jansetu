import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, Flag, HardHat, Info, KeyRound, Landmark, LogIn, Map as MapIcon, Megaphone, Phone, ShieldCheck, UserRound, Wrench } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { Card, ErrorBox, PageHead } from '../components/ui'
import { useT } from '../i18n'

import { ROLES, jurisdictionText, normRole, roleInfo } from '../lib/roles'

// Lowest to highest level, so people find their own job quickly.
const ORDER = ['field_officer', 'dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']
// Show one clear example per designation first (Telangana), then the others.
const PREFERRED = ['field_utnoor', 'dept_water_tg', 'collector_adilabad', 'state_telangana', 'national_admin', 'superadmin']

function CitizenLogin({ next }) {
  const { sendCitizenCode, loginCitizen } = useApp()
  const nav = useNavigate()
  const t = useT()
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
                <label htmlFor="cphone">{t('Phone number')}</label>
                <input id="cphone" className="input" inputMode="tel" autoComplete="tel" placeholder="+91 90000 11111" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <span className="help">{t('Use the same number you used when reporting.')}</span>
              </div>
              <button className="btn btn-primary btn-lg" disabled={busy || phone.replace(/\D/g, '').length < 8}><Phone size={18} aria-hidden="true" />{t(busy ? 'Sending…' : 'Send me a code')}</button>
            </motion.form>
          ) : (
            <motion.form key="code" onSubmit={verify} className="stack-md" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
              <div className="field">
                <label htmlFor="ccode">{t('6-digit code sent to {phone}', { phone })}</label>
                <input id="ccode" className="input mono otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
              </div>
              {sent.demo_code && (
                <div className="alert alert-info"><KeyRound size={18} aria-hidden="true" />
                  <div className="small">{t('Demo mode (no SMS): your code is')} <strong className="mono">{sent.demo_code}</strong>
                    <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setCode(sent.demo_code)}>{t('Fill it')}</button></div></div>
              )}
              <div className="row">
                <button className="btn btn-primary btn-lg" disabled={busy || code.length !== 6}><LogIn size={18} aria-hidden="true" />{t(busy ? 'Checking…' : 'Log in')}</button>
                <button type="button" className="btn" onClick={() => { setSent(null); setCode('') }}>{t('Change number')}</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
        <ErrorBox error={err} />
      </Card>
      <Card title="Why log in? (optional)">
        <ul className="check-list">
          <li><UserRound size={18} aria-hidden="true" /><span>{t('See all your requests in one place')}</span></li>
          <li><Phone size={18} aria-hidden="true" /><span>{t('Your number is filled in for you')}</span></li>
          <li><ShieldCheck size={18} aria-hidden="true" /><span>{t('Your "fixed / not fixed" answer is trusted more')}</span></li>
        </ul>
        <div className="alert alert-success mt"><Info size={18} aria-hidden="true" />
          <div className="small"><strong>{t('You never need to log in to report.')}</strong> {t('Anyone can report, even without a name or on a shared phone.')}
            <div style={{ marginTop: 8 }}><Link to="/report" className="btn btn-sm"><Megaphone size={16} aria-hidden="true" />{t('Report without login')}</Link></div></div>
        </div>
      </Card>
    </div>
  )
}

function OfficialLogin() {
  const { login } = useApp()
  const t = useT()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState([])
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    api.demoAccounts().then((d) => setDemo(Array.isArray(d) ? d : (d?.officers || []))).catch(() => {})
  }, [])
  const sorted = [...demo].sort((a, b) => ORDER.indexOf(normRole(a.role)) - ORDER.indexOf(normRole(b.role)))
  const shown = showAll ? sorted : sorted.filter((d) => PREFERRED.includes(d.username))
  const submit = async (e, user = u, pass = p) => {
    e?.preventDefault()
    setBusy(true); setErr(null)
    try { await login(user, pass) } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  return (
    <div className="stack-md">
    <div className="grid g-2" style={{ alignItems: 'start' }}>
      <Card title="Official login" sub="For government staff only">
        <form onSubmit={submit} className="stack-md">
          <div className="field"><label htmlFor="u">{t('Username')}</label><input id="u" className="input" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></div>
          <div className="field"><label htmlFor="p">{t('Password')}</label><input id="p" type="password" className="input" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></div>
          <ErrorBox error={err} />
          <button className="btn btn-primary btn-lg" disabled={busy || !u || !p}><LogIn size={18} aria-hidden="true" />{t(busy ? 'Signing in…' : 'Log in')}</button>
        </form>
        <p className="help mt">{t('In real use this connects to government sign-on (Parichay).')}</p>
      </Card>
      <Card title="Demo accounts" sub="Tap one to log in instantly">
        <div className="stack">
          {shown.map((d) => {
            const ri = roleInfo(d.role)
            return (
              <motion.button key={d.username} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="card role-card" style={{ textAlign: 'left', boxShadow: 'none', cursor: 'pointer' }} onClick={(e) => submit(e, d.username, d.password)}>
                <div className="row-between"><strong>{d.name}</strong><span className="badge badge-blue">{t(ri?.label || d.role)}</span></div>
                <div className="small">{t(ri?.job || '')}</div>
                <div className="xs muted">{jurisdictionText(d, t)}</div>
                <div className="xs mono muted">{d.username} / {d.password}</div>
              </motion.button>
            )
          })}
          {sorted.length > shown.length && <button type="button" className="btn" onClick={() => setShowAll(true)}>{t('Show all {n} demo accounts', { n: sorted.length })}</button>}
        </div>
      </Card>
    </div>
    <WhoLogsIn />
    </div>
  )
}

// Short explainer: the 6 designations and what each one does. Each sees only its own pages and area.
const ROLE_ICON = { field_officer: HardHat, dept_officer: Wrench, district_officer: Landmark, state_officer: MapIcon, admin: Flag, super_admin: KeyRound }
function WhoLogsIn() {
  const t = useT()
  return (
    <Card title="Who logs in here?" sub="Each designation sees only its own work and its own area.">
      <ul className="who-list">
        {ORDER.map((r) => {
          const Icon = ROLE_ICON[r] || UserRound
          return (
            <li key={r}>
              <span className="who-ico" aria-hidden="true"><Icon size={18} /></span>
              <span><strong>{t(ROLES[r].label)}</strong><span className="small muted">{t(ROLES[r].job)}</span></span>
            </li>
          )
        })}
      </ul>
      <style>{`
        .who-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .who-list li { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid #e2e8f0; border-radius: 14px; }
        .who-list li > span:last-child { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .who-ico { flex: none; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: #eff6ff; color: #2563eb; }
        @media (max-width: 900px) { .who-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .who-list { grid-template-columns: 1fr; } }
      `}</style>
    </Card>
  )
}

export default function Login() {
  const { isOfficial, isCitizen, roleInfo: ri } = useApp()
  const nav = useNavigate()
  const t = useT()
  const [sp, setSp] = useSearchParams()
  const as = sp.get('as') === 'official' ? 'official' : sp.get('as') === 'citizen' ? 'citizen' : 'citizen'
  const next = sp.get('next')
  // Officers land on the home page of their own job (a field officer on "My tasks", a Collector on the district dashboard).
  useEffect(() => { if (isOfficial) nav(next || ri?.home || '/dashboard', { replace: true }) }, [isOfficial, nav, next, ri])
  useEffect(() => { if (isCitizen && as === 'citizen') nav(next || '/track', { replace: true }) }, [isCitizen, as, nav, next])

  return (
    <div className="stack-md narrow">
      <PageHead title={as === 'official' ? 'Official login' : 'Citizen login'} eyebrow={as === 'official' ? 'For government staff' : 'Optional for citizens'}>
        {as === 'official' ? 'Log in to see the inbox, dashboard, priorities and projects.' : 'You never need to log in to report. Log in only to see all your requests in one place.'}
      </PageHead>
      <div className="login-switch" role="tablist" aria-label={t('Who are you?')}>
        {[{ v: 'citizen', label: 'I am a citizen', Icon: UserRound }, { v: 'official', label: 'I am an official', Icon: Building2 }].map(({ v, label, Icon }) => (
          <button key={v} role="tab" aria-selected={as === v} className={`login-tab ${as === v ? 'active' : ''}`}
            onClick={() => setSp(next ? { as: v, next } : { as: v })}>
            {as === v && <motion.span layoutId="login-pill" className="login-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="login-tab-label"><Icon size={18} aria-hidden="true" />{t(label)}</span>
          </button>
        ))}
      </div>
      {as === 'citizen' ? <CitizenLogin next={next} /> : <OfficialLogin />}
    </div>
  )
}
