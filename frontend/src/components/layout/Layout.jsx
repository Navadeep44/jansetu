import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import {
  Award, BarChart3, ClipboardList, Globe2, HandCoins, Home, Inbox, Layers, ListOrdered, Lock, LogIn, LogOut, Megaphone,
  Menu, MessageCircle, SearchCheck, ShieldCheck, Sparkles, TrendingUp, UserRound,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS } from '../../i18n/strings'

const CITIZEN = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/report', label: 'Report a problem', Icon: Megaphone },
  { to: '/track', label: 'My requests', Icon: SearchCheck },
  { to: '/channels', label: 'WhatsApp & phone demo', Icon: MessageCircle },
  { to: '/results', label: 'Public results', Icon: Award },
]
const OFFICIAL = [
  { to: '/officer', label: 'Officer inbox', Icon: Inbox },
  { to: '/dashboard', label: 'Dashboard', Icon: BarChart3 },
  { to: '/priorities', label: 'Priority ranking', Icon: ListOrdered },
  { to: '/clusters', label: 'Grouped needs', Icon: Layers },
  { to: '/projects', label: 'Projects & budget', Icon: HandCoins },
  { to: '/ask', label: 'Ask a question', Icon: Sparkles },
  { to: '/impact', label: 'Results & impact', Icon: TrendingUp },
]
const OPEN = [
  { to: '/brics', label: 'BRICS comparison', Icon: Globe2 },
  { to: '/trust', label: 'Privacy & open standards', Icon: ShieldCheck },
]

const ROLE_LABEL = { field_officer: 'Field officer', district: 'District collector', national: 'National planner', brics_analyst: 'BRICS analyst', admin: 'Admin' }

function Group({ title, items }) {
  return (
    <nav className="nav-group" aria-label={title}>
      <div className="nav-title">{title}</div>
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-link"><Icon size={18} aria-hidden="true" />{label}</NavLink>
      ))}
    </nav>
  )
}

export function RequireOfficial({ children }) {
  const { isOfficial } = useApp()
  const loc = useLocation()
  if (!isOfficial) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}

export default function Layout() {
  const { user, isOfficial, logout, country, setCountry, uiLang, setUiLang } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <Link to="/" className="brand">
          <img src="/favicon.svg" width="34" height="34" alt="" />
          <span>
            <span className="brand-name">JanSetu</span>
            <span className="brand-tag" style={{ display: 'block' }}>People's voice → public action</span>
          </span>
        </Link>
        <Group title="For citizens · no login" items={CITIZEN} />
        {isOfficial ? <Group title="For officials" items={OFFICIAL} /> : (
          <nav className="nav-group" aria-label="For officials">
            <div className="nav-title">For officials</div>
            <NavLink to="/login" className="nav-link"><Lock size={18} aria-hidden="true" />Official login</NavLink>
          </nav>
        )}
        <Group title="Open to everyone" items={isOfficial ? [...OPEN, { to: '/audit', label: 'Decision log', Icon: ClipboardList }] : OPEN} />
        <div className="nav-foot">Open source · Digital Public Good</div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn btn-icon btn-ghost menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={20} /></button>
          </div>
          <div className="topbar-controls">
            <label className="row small">
              <span className="muted">Language</span>
              <select className="select" style={{ minHeight: 36, width: 'auto' }} value={uiLang} onChange={(e) => setUiLang(e.target.value)}>
                {Object.entries(UI_LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {isOfficial && (
              <label className="row small">
                <span className="muted">Country</span>
                <select className="select" style={{ minHeight: 36, width: 'auto' }} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="all">All</option><option value="IN">India</option><option value="BR">Brazil</option><option value="ZA">South Africa</option>
                </select>
              </label>
            )}
            {isOfficial ? (
              <div className="row">
                <span className="user-chip"><UserRound size={16} aria-hidden="true" /><span><strong>{user.name}</strong><span className="xs muted" style={{ display: 'block' }}>{ROLE_LABEL[user.role]}</span></span></span>
                <button className="btn btn-sm" onClick={logout}><LogOut size={16} aria-hidden="true" />Log out</button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-sm"><LogIn size={16} aria-hidden="true" />Official login</Link>
            )}
          </div>
        </header>
        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
