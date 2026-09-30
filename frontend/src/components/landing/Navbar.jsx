import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Building2, LayoutDashboard, LogOut, Menu, Megaphone, UserRound, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import LangSwitch from '../layout/LangSwitch'

const LINKS = [
  { href: '#services', label: 'Services' },
  { href: '#how', label: 'How it works' },
  { href: '#india', label: 'Languages' },
  { href: '#impact', label: 'Impact' },
  { href: '#audience', label: 'Who it is for' },
]

export default function Navbar() {
  const { user, isOfficial, isCitizen, logout } = useApp()
  const t = useT()
  const [solid, setSolid] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setSolid(y > 40)
    setHidden(y > 400 && y > prev && !open)
  })
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  const auth = isOfficial || isCitizen ? (
    <>
      <Link to={isOfficial ? '/dashboard' : '/track'} className="lp-btn lp-btn-ghost"><LayoutDashboard size={16} aria-hidden="true" />{t(isOfficial ? 'Dashboard' : 'My requests')}</Link>
      <button className="lp-btn lp-btn-ghost" onClick={logout} title={user?.name}><LogOut size={16} aria-hidden="true" />{t('Log out')}</button>
    </>
  ) : (
    <>
      <Link to="/login?as=citizen" className="lp-btn lp-btn-ghost"><UserRound size={16} aria-hidden="true" />{t('Citizen login')}</Link>
      <Link to="/login?as=official" className="lp-btn lp-btn-solid"><Building2 size={16} aria-hidden="true" />{t('Official login')}</Link>
    </>
  )

  return (
    <motion.header className={`lp-nav ${solid || open ? 'solid' : ''}`} initial={{ y: -80 }} animate={{ y: hidden ? -90 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      <div className="lp-nav-inner">
        <Link to="/" className="lp-brand" aria-label={t('JanSetu home')}>
          <img src="/favicon.svg" width="36" height="36" alt="" />
          <span><strong>JanSetu</strong><small>{t("People's voice → public action")}</small></span>
        </Link>
        <nav className="lp-links" aria-label={t('Page sections')}>
          {LINKS.map((l) => (
            <motion.a key={l.href} href={l.href} className="lp-link" whileHover={{ y: -1 }}>{t(l.label)}</motion.a>
          ))}
        </nav>
        <div className="lp-actions">
          <LangSwitch />
          {auth}
          <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />{t('Report')}</Link>
        </div>
        <div className="lp-nav-mobile">
          {!open && <LangSwitch />}
          <button className="lp-burger" aria-label={t(open ? 'Close menu' : 'Open menu')} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div className="lp-drawer" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <LangSwitch large full />
            {LINKS.map((l, i) => (
              <motion.a key={l.href} href={l.href} onClick={() => setOpen(false)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>{t(l.label)}</motion.a>
            ))}
            <div className="lp-drawer-actions">
              <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />{t('Report a problem')}</Link>
              {auth}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
