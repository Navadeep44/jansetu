import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Info, LogIn, Megaphone } from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { Card, ErrorBox } from '../components/ui'

const WHAT = {
  field_officer: 'Checks unclear reports, closes work with proof',
  district: 'Approves projects for the district',
  national: 'Sees the whole country, sets priorities',
  brics_analyst: 'Compares countries',
}

export default function Login() {
  const { login, isOfficial } = useApp()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const next = sp.get('next') || '/dashboard'
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState([])
  useEffect(() => { api.demoAccounts().then((res) => setDemo(Array.isArray(res) ? res : [])).catch(() => setDemo([])) }, [])
  useEffect(() => { if (isOfficial) nav(next, { replace: true }) }, [isOfficial, nav, next])

  const submit = async (e, user = u, pass = p) => {
    e?.preventDefault()
    setBusy(true); setErr(null)
    try { await login(user, pass) } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  return (
    <div className="grid g-2" style={{ maxWidth: 980, margin: '0 auto', alignItems: 'start' }}>
      <Card title="Official login" sub="For government staff only">
        <form onSubmit={submit} className="stack-md">
          <div className="field"><label htmlFor="u">Username</label><input id="u" className="input" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></div>
          <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" className="input" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></div>
          <ErrorBox error={err} />
          <button className="btn btn-primary btn-lg" disabled={busy || !u || !p}><LogIn size={18} aria-hidden="true" />{busy ? 'Signing in…' : 'Log in'}</button>
        </form>
        <div className="alert alert-info mt"><Info size={18} aria-hidden="true" />
          <div className="small"><strong>Citizens never need to log in.</strong> Anyone can report a problem, even anonymously or on a shared phone.
            <div className="mt" style={{ marginTop: 8 }}><Link to="/report" className="btn btn-sm"><Megaphone size={16} aria-hidden="true" />Report a problem</Link></div></div>
        </div>
      </Card>
      <Card title="Demo accounts" sub="Tap one to log in instantly">
        <div className="stack">
          {(Array.isArray(demo) ? demo : []).map((d) => (
            <button key={d.username} className="card role-card" style={{ textAlign: 'left', boxShadow: 'none', cursor: 'pointer' }} onClick={(e) => submit(e, d.username, d.password)}>
              <div className="row-between"><strong>{d.name}</strong><span className="badge badge-blue">{d.title}</span></div>
              <div className="small muted">{WHAT[d.role]}</div>
              <div className="xs mono muted">{d.username} / {d.password}</div>
            </button>
          ))}
        </div>
        <p className="help mt">In a real deployment this connects to the government's single sign-on (e.g. Parichay, gov.br).</p>
      </Card>
    </div>
  )
}
