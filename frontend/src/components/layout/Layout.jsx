import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import {
  Award, BarChart3, BookOpen, Building2, ClipboardList, Globe2, HandCoins, Inbox, Layers, ListOrdered, LogOut, Megaphone,
  Menu, MessageCircle, SearchCheck, ShieldCheck, Sparkles, TrendingUp, UserRound, X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS } from '../../i18n/strings'

// Same links for everyone (citizen side).
const MAIN = [
  { to: '/report', label: 'Report a problem', Icon: Megaphone },
  { to: '/track', label: 'My requests', Icon: SearchCheck },
  { to: '/results', label: 'Public results', Icon: Award },
  { to: '/channels', label: 'WhatsApp demo', Icon: MessageCircle },
  { to: '/overview', label: 'Guide', Icon: BookOpen },
]
// Official workspace, shown as a second row only after an official logs in.
const WORK = [
  { to: '/officer', label: 'Inbox', Icon: Inbox },
  { to: '/dashboard', label: 'Dashboard', Icon: BarChart3 },
  { to: '/priorities', label: 'Priorities', Icon: ListOrdered },
  { to: '/clusters', label: 'Grouped needs', Icon: Layers },
  { to: '/projects', label: 'Projects & budget', Icon: HandCoins },
  { to: '/ask', label: 'Ask', Icon: Sparkles },
  { to: '/impact', label: 'Impact', Icon: TrendingUp },
]
const MORE = [
  { to: '/brics', label: 'BRICS comparison', Icon: Globe2 },
  { to: '/trust', label: 'Privacy & open standards', Icon: ShieldCheck },
]

const ROLE_LABEL = { field_officer: 'Field officer', district: 'District collector', national: 'National planner', brics_analyst: 'BRICS analyst', admin: 'Admin' }

export function RequireOfficial({ children }) {
  const { isOfficial } = useApp()
  const loc = useLocation()
  if (!isOfficial) return <Navigate to={`/login?as=official&next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  return children
}

function LangSelect({ id }) {
  const { uiLang, setUiLang } = useApp()
  return (
    <>
      <label className="sr-only" htmlFor={id}>Language</label>
      <select id={id} className="lp-lang" value={uiLang} onChange={(e) => setUiLang(e.target.value)}>
        {Object.entries(UI_LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </>
  )
}

function Auth() {
  const { user, isOfficial, isCitizen, logout } = useApp()
  if (isOfficial || isCitizen) return (
    <>
      <span className="an-user" title={user?.name}>
        <span className="an-avatar" aria-hidden="true">{(user?.name || '?').replace(/[^A-Za-z]/g, '').slice(0, 1) || 'C'}</span>
        <span><strong>{user?.name}</strong><small>{isCitizen ? 'Citizen' : ROLE_LABEL[user?.role]}</small></span>
      </span>
      <button className="lp-btn lp-btn-ghost" onClick={logout}><LogOut size={16} aria-hidden="true" />Log out</button>
    </>
  )
  return (
    <>
      <Link to="/login?as=citizen" className="lp-btn lp-btn-ghost"><UserRound size={16} aria-hidden="true" />Citizen login</Link>
      <Link to="/login?as=official" className="lp-btn lp-btn-solid"><Building2 size={16} aria-hidden="true" />Official login</Link>
    </>
  )
}

export default function Layout() {
  const { isOfficial, country, setCountry } = useApp()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const loc = useLocation()
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 24))
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className={`an ${solid ? 'solid' : ''}`}>
        <div className="an-inner">
          <Link to="/" className="lp-brand" aria-label="JanSetu home">
            <img src="/favicon.svg" width="34" height="34" alt="" />
            <span><strong>JanSetu</strong><small>People's voice → public action</small></span>
          </Link>
          <nav className="an-links" aria-label="Main">
            {MAIN.map(({ to, label }) => (
              <NavLink key={to} to={to} className="an-link">
                {({ isActive }) => (<>
                  {isActive && <motion.span layoutId="an-active" className="an-active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span>{label}</span>
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="an-actions">
            <LangSelect id="an-lang" />
            <Auth />
            {!isOfficial && <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />Report</Link>}
          </div>
          <button className="lp-burger an-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {isOfficial && (
          <div className="an-work">
            <div className="an-work-inner">
              <span className="an-work-title">Official workspace</span>
              <nav className="an-work-links" aria-label="Official workspace">
                {WORK.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className="an-pill"><Icon size={15} aria-hidden="true" />{label}</NavLink>
                ))}
              </nav>
              <label className="an-country">
                <span>Country</span>
                <select className="lp-lang" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="all">All</option><option value="IN">India</option><option value="BR">Brazil</option><option value="ZA">South Africa</option>
                </select>
              </label>
            </div>
          </div>
        )}

        <AnimatePresence>
          {open && (
            <motion.div className="an-drawer" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="an-drawer-title">For citizens · no login needed</div>
              {MAIN.map(({ to, label, Icon }) => <NavLink key={to} to={to} className="an-drawer-link"><Icon size={18} aria-hidden="true" />{label}</NavLink>)}
              <div className="an-drawer-title">Open to everyone</div>
              {(isOfficial ? [...MORE, { to: '/audit', label: 'Decision log', Icon: ClipboardList }] : MORE).map(({ to, label, Icon }) => <NavLink key={to} to={to} className="an-drawer-link"><Icon size={18} aria-hidden="true" />{label}</NavLink>)}
              <div className="an-drawer-actions"><LangSelect id="an-lang-m" /><Auth /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="content" tabIndex={-1}>
        <motion.div key={loc.pathname} className="content-inner" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
          <Outlet />
        </motion.div>
      </main>

      <footer className="lp-footer no-print">
        <div className="lp-footer-inner">
          <Link to="/" className="lp-brand" style={{ color: '#0f172a' }}><img src="/favicon.svg" width="28" height="28" alt="" /><strong>JanSetu</strong></Link>
          <nav aria-label="Footer">
            <Link to="/overview">Guide</Link><Link to="/results">Public results</Link><Link to="/brics">BRICS</Link><Link to="/trust">Privacy & open standards</Link>{isOfficial && <Link to="/audit">Decision log</Link>}
          </nav>
          <span className="small">Open source · Digital Public Good</span>
        </div>
      </footer>
    </div>
  )
}
