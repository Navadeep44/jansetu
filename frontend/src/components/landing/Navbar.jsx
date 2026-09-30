import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Building2, LayoutDashboard, LogOut, Menu, Megaphone, UserRound, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS } from '../../i18n/strings'

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how', label: 'How it works' },
  { href: '#impact', label: 'Impact' },
  { href: '#audience', label: 'Who it is for' },
  { href: '#brics', label: 'BRICS' },
]

export default function Navbar() {
  const { user, isOfficial, isCitizen, logout, uiLang, setUiLang } = useApp()
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 40)
    setHidden(y > 400 && y > prev && !open)
  })
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : '' ; return () => { document.body.style.overflow = '' } }, [open])

  const auth = isOfficial || isCitizen ? (
    <>
      <Link to={isOfficial ? '/dashboard' : '/track'} className="lp-btn lp-btn-ghost"><LayoutDashboard size={16} aria-hidden="true" />{isOfficial ? 'Dashboard' : 'My requests'}</Link>
      <button className="lp-btn lp-btn-ghost" onClick={logout} title={`Logged in as ${user?.name}`}><LogOut size={16} aria-hidden="true" />Log out</button>
    </>
  ) : (
    <>
      <Link to="/login?as=citizen" className="lp-btn lp-btn-ghost"><UserRound size={16} aria-hidden="true" />Citizen login</Link>
      <Link to="/login?as=official" className="lp-btn lp-btn-solid"><Building2 size={16} aria-hidden="true" />Official login</Link>
    </>
  )

  return (
    <motion.header className={`lp-nav ${solid ? 'solid' : ''}`} initial={{ y: -80 }} animate={{ y: hidden ? -90 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <div className="lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label="JanSetu home">
          <img src="/favicon.svg" width="36" height="36" alt="" />
          <span><strong>JanSetu</strong><small>People's voice → public action</small></span>
        </Link>
        <nav className="lp-links" aria-label="Page sections">
          {LINKS.map((l) => (
            <motion.a key={l.href} href={l.href} className="lp-link" whileHover={{ y: -1 }}>{l.label}</motion.a>
          ))}
        </nav>
        <div className="lp-actions">
          <label className="sr-only" htmlFor="lp-lang">Language</label>
          <select id="lp-lang" className="lp-lang" value={uiLang} onChange={(e) => setUiLang(e.target.value)}>
            {Object.entries(UI_LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {auth}
          <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />Report</Link>
        </div>
        <button className="lp-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="lp-drawer" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            {LINKS.map((l, i) => (
              <motion.a key={l.href} href={l.href} onClick={() => setOpen(false)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>{l.label}</motion.a>
            ))}
            <div className="lp-drawer-actions">
              <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />Report a problem</Link>
              {auth}
              <select className="lp-lang" value={uiLang} onChange={(e) => setUiLang(e.target.value)} aria-label="Language">
                {Object.entries(UI_LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
