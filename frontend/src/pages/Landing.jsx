import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  ArrowRight, AudioLines, Award, BarChart3, BellRing, Building2, Camera, CheckCircle2, ClipboardList, CloudOff, Database,
  FileSpreadsheet, HandCoins, HandHeart, Inbox, IndianRupee, Landmark, Languages, LayoutGrid, Layers, ListOrdered, Lock,
  Map as MapIcon, MapPinned, Megaphone, MessageCircle, Mic, Phone, PhoneCall, SearchCheck, ShieldCheck, Smartphone,
  Sparkles, ThumbsUp, TrendingUp, UserRound, Users, Volume2, VolumeX,
} from 'lucide-react'
import Navbar from '../components/landing/Navbar'
import { LanguageWelcome } from '../components/layout/LangSwitch'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { useT } from '../i18n'
import { useAsync } from '../lib/useAsync'
import { fmt } from '../lib/format'

gsap.registerPlugin(ScrollTrigger, useGSAP)
const Globe3D = lazy(() => import('../components/landing/Globe3D'))

const SERVICES = [
  { who: 'citizen', Icon: Mic, t: 'Report by voice', d: 'Speak in your language. We write it down.', to: '/report' },
  { who: 'citizen', Icon: Camera, t: 'Send a photo', d: 'Show the problem. No typing needed.', to: '/report' },
  { who: 'citizen', Icon: LayoutGrid, t: 'Tap a picture', d: 'Pick a picture: water, road, light, school.', to: '/report' },
  { who: 'citizen', Icon: PhoneCall, t: 'Missed call / IVR', d: 'Any basic phone works. We call you back.', to: '/channels' },
  { who: 'citizen', Icon: MessageCircle, t: 'WhatsApp & Telegram', d: 'Send a message or a voice note.', to: '/channels' },
  { who: 'citizen', Icon: HandHeart, t: 'Help from ASHA or CSC', d: 'A helper can report for you.', to: '/report' },
  { who: 'citizen', Icon: ThumbsUp, t: '"Me too"', d: 'Same problem? Add your family in one tap.', to: '/report' },
  { who: 'citizen', Icon: SearchCheck, t: 'Track and confirm the fix', d: 'The case closes only when you say "fixed".', to: '/track/JS-IN-RAMES1' },
  { who: 'everyone', Icon: Volume2, t: 'Listen aloud', d: 'Every page reads itself in your language.', to: '/overview' },
  { who: 'everyone', Icon: Award, t: 'Public results', d: 'See what people asked and what was done.', to: '/results' },
  { who: 'everyone', Icon: ShieldCheck, t: 'Privacy & open data', d: 'Personal details removed. Open data for all.', to: '/trust' },
  { who: 'official', Icon: Inbox, t: 'Officer inbox', d: 'Unclear or urgent reports to check.', to: '/officer' },
  { who: 'official', Icon: MapIcon, t: 'Needs map & hotspots', d: 'See where problems are growing.', to: '/dashboard' },
  { who: 'official', Icon: VolumeX, t: 'Silent areas', d: 'Big need, but few people reporting.', to: '/priorities' },
  { who: 'official', Icon: ListOrdered, t: 'Priority ranking', d: 'What to fix first, with clear reasons.', to: '/priorities' },
  { who: 'official', Icon: IndianRupee, t: 'Budget planner (₹)', d: 'Best projects for the money you have.', to: '/projects' },
  { who: 'official', Icon: ClipboardList, t: 'Gram Sabha plan', d: 'Viksit Gram Panchayat Plan for Yuktdhara (VB-GRAMG).', to: '/projects' },
  { who: 'official', Icon: Sparkles, t: 'Ask in Hindi or Telugu', d: 'Type a question. Get an answer and a map.', to: '/ask' },
  { who: 'official', Icon: BellRing, t: 'Early warnings', d: 'Sudden jumps in reports are flagged fast.', to: '/dashboard' },
  { who: 'official', Icon: TrendingUp, t: 'Impact check', d: 'Did the work really help people?', to: '/impact' },
]
const WHO = { citizen: { label: 'Citizens', tone: 'green' }, official: { label: 'Officials', tone: 'amber' }, everyone: { label: 'Everyone', tone: 'blue' } }
const FILTERS = [{ v: 'all', l: 'Everyone' }, { v: 'citizen', l: 'Citizens' }, { v: 'official', l: 'Officials' }]

const STEPS = [
  { Icon: AudioLines, t: 'You speak', d: 'Any language, any phone' },
  { Icon: Layers, t: 'AI groups it', d: 'Same problems join together' },
  { Icon: BarChart3, t: 'Need is scored', d: 'With village data too' },
  { Icon: HandCoins, t: 'Officials act', d: 'Best projects approved' },
  { Icon: CheckCircle2, t: 'You confirm', d: 'Only you can say "fixed"' },
]
const CHANNELS = [
  { Icon: Smartphone, t: 'Web & app' }, { Icon: MessageCircle, t: 'WhatsApp' }, { Icon: MessageCircle, t: 'Telegram' },
  { Icon: Phone, t: 'Missed call / IVR' }, { Icon: MessageCircle, t: 'SMS' }, { Icon: HandHeart, t: 'ASHA worker' },
  { Icon: UserRound, t: 'CSC centre' }, { Icon: Users, t: 'Gram Sabha meeting' }, { Icon: CloudOff, t: 'Works offline' },
  { Icon: Languages, t: '12 Indian languages' },
]
const REGIONS = [
  { state: 'Telangana', langs: ['Telugu', 'Gondi'], districts: ['Adilabad', 'Hyderabad'] },
  { state: 'Odisha', langs: ['Odia', 'Desia'], districts: ['Koraput'] },
  { state: 'Delhi', langs: ['Hindi', 'Bhojpuri'], districts: ['North East Delhi', 'North West Delhi', 'South Delhi', 'East Delhi', 'South West Delhi'] },
  { state: 'Bihar', langs: ['Hindi', 'Magahi', 'Bhojpuri'], districts: ['Gaya'] },
  { state: 'Uttar Pradesh', langs: ['Hindi', 'Awadhi'], districts: ['Bahraich'] },
]
const DPI = [
  { Icon: Languages, t: 'Bhashini', d: '22 Indian languages' },
  { Icon: Lock, t: 'DPDP Act 2023', d: 'Personal data protected' },
  { Icon: Database, t: 'Open311', d: 'Open API for other apps' },
  { Icon: FileSpreadsheet, t: 'Open data CSV', d: 'Anyone can download totals' },
  { Icon: ClipboardList, t: 'Yuktdhara', d: 'Viksit Gram Panchayat Plan export' },
  { Icon: Landmark, t: 'CPGRAMS', d: 'Import old complaints' },
]
const STORIES = [
  { id: 'JS-IN-LAKSH1', who: 'Lakshmi', where: 'Narnoor, Adilabad', what: 'No all-weather road. Spoke in Telugu with ASHA help. Now in a project.' },
  { id: 'JS-IN-RAMES1', who: 'Ramesh', where: 'Bawana, Delhi', what: 'Drain overflow. Told "disposed", but not fixed. He reopened it.' },
  { id: 'JS-IN-SUNIT1', who: 'Sunita', where: 'Mihinpurwa, Bahraich', what: 'No doctor at the health centre. A silent area, now seen.' },
  { id: 'JS-IN-PRIYA1', who: 'Priya', where: 'Malakpet, Hyderabad', what: 'Power cuts. Her report started an early warning.' },
]

function TiltCard({ children, className = '', to }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 250, damping: 20 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 250, damping: 20 })
  const onMove = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  return (
    <motion.div layout className={`lp-tilt ${className}`} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0) }} whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.25 }}>
      <Link to={to} className="lp-tilt-link">{children}</Link>
    </motion.div>
  )
}

function Counter({ value, label, Icon, tone }) {
  return (
    <div className={`lp-stat tone-${tone}`}>
      <Icon size={22} aria-hidden="true" />
      <span className="lp-counter" data-target={value ?? 0}>0</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  )
}

export default function Landing() {
  const t = useT()
  const { uiLang } = useApp()
  const root = useRef(null)
  const [filter, setFilter] = useState('all')
  const board = useAsync(() => api.board(), [])
  const ov = useAsync(() => api.overview(), [])
  const states = useAsync(() => api.states(), [])
  const shown = useMemo(() => SERVICES.filter((s) => filter === 'all' || s.who === filter || s.who === 'everyone'), [filter])
  const ready = !!board.data && !!ov.data
  const byState = Object.fromEntries((states.data || []).map((s) => [s.state, s]))

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.lp-hero-sub, .lp-hero-ctas, .lp-hero-chips', { y: 16, opacity: 0, duration: 0.7, stagger: 0.12, delay: 0.5, ease: 'power2.out' })
      gsap.utils.toArray('.lp-reveal').forEach((el) => {
        gsap.from(el, { y: 24, opacity: 0, duration: 0.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } })
      })
      gsap.fromTo('.lp-hiw-progress', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.lp-hiw', start: 'top 75%', end: 'bottom 55%', scrub: true } })
      gsap.from('.lp-step', { y: 40, opacity: 0, stagger: 0.12, duration: 0.6, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.lp-hiw', start: 'top 75%' } })
      gsap.to('.lp-orb-a', { yPercent: -30, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.lp-orb-b', { yPercent: 40, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
    })
  }, { scope: root })

  // Headline word reveal: runs again whenever the language changes.
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.lp-word', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.1 })
    })
  }, { scope: root, dependencies: [uiLang], revertOnUpdate: true })

  // Animated counters once real numbers arrive
  useGSAP(() => {
    if (!ready) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.utils.toArray('.lp-counter').forEach((el) => {
      const target = Number(el.dataset.target || 0)
      if (reduced) { el.textContent = target.toLocaleString('en-IN'); return }
      const obj = { v: 0 }
      gsap.to(obj, { v: target, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-IN') } })
    })
  }, { scope: root, dependencies: [ready] })

  const lead = t('Every voice. Every language.')
  const accent = t('The right public work.')
  const words = [...lead.split(/\s+/).map((w) => [w, false]), ...accent.split(/\s+/).map((w) => [w, true])].filter(([w]) => w)
  return (
    <div className={`lp lp-${uiLang}`} ref={root}>
      <LanguageWelcome />
      <Navbar />

      {/* ---------------- HERO ---------------- */}
      <section className="lp-hero" id="top">
        <div className="lp-orb lp-orb-a" aria-hidden="true" />
        <div className="lp-orb lp-orb-b" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <motion.span className="lp-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <span className="lp-dot" />{t('Open source · Digital Public Good for India')}
            </motion.span>
            <h1 className={`lp-h1 lp-h1-${uiLang}`} aria-label={`${lead} ${accent}`} key={uiLang}>
              {words.map(([w, hi], i) => (
                <span key={i} className="lp-word-wrap" aria-hidden="true"><span className={`lp-word ${hi ? 'accent' : ''}`}>{w}</span></span>
              ))}
            </h1>
            <p className="lp-hero-sub">{t('Tell the government what your village or ward needs. Speak, send a photo, or give a missed call. Officials see the real need and act.')}</p>
            <div className="lp-hero-ctas">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/report" className="lp-btn lp-btn-accent lp-btn-lg"><Megaphone size={20} aria-hidden="true" />{t('Report a problem')}</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/login?as=citizen" className="lp-btn lp-btn-glass lp-btn-md"><UserRound size={18} aria-hidden="true" />{t('Citizen login')}</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/login?as=official" className="lp-btn lp-btn-glass lp-btn-md"><Building2 size={18} aria-hidden="true" />{t('Official login')}</Link>
              </motion.div>
            </div>
            <div className="lp-hero-chips">
              <span><CheckCircle2 size={16} aria-hidden="true" />{t('No login needed')}</span>
              <span><Languages size={16} aria-hidden="true" />{t('Telugu · Hindi · English + speak in 12 Indian languages')}</span>
              <span><Lock size={16} aria-hidden="true" />{t('Personal data protected (DPDP Act)')}</span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-globe">
              <Suspense fallback={<div className="lp-globe-fallback" />}>
                <Globe3D />
              </Suspense>
            </div>
            <motion.div className="lp-float lp-float-1" animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
              <AudioLines size={16} aria-hidden="true" /><span><strong>{t('Telugu voice note')}</strong><small>{t('→ Roads · Narnoor')}</small></span>
            </motion.div>
            <motion.div className="lp-float lp-float-2" animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
              <Users size={16} aria-hidden="true" /><span><strong>{t('212 families')}</strong><small>{t('= 1 clear need')}</small></span>
            </motion.div>
            <motion.div className="lp-float lp-float-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}>
              <VolumeX size={16} aria-hidden="true" /><span><strong>{t('Silent area found')}</strong><small>{t('High need, few voices')}</small></span>
            </motion.div>
            <div className="lp-legend"><span><i className="amber" />{t('Pilot districts')}</span><span><i className="sky" />{t('Rest of India')}</span></div>
          </div>
        </div>
        <a href="#impact" className="lp-scroll" aria-label={t('Scroll down')}><span /></a>
      </section>

      {/* ---------------- NUMBERS ---------------- */}
      <section className="lp-stats" id="impact" aria-label={t('Live numbers')}>
        <Counter Icon={MessageCircle} tone="blue" value={board.data?.requests} label={t('Reports received')} />
        <Counter Icon={Users} tone="blue" value={board.data?.households} label={t('Families heard')} />
        <Counter Icon={Languages} tone="green" value={ov.data?.languages} label={t('Languages heard')} />
        <Counter Icon={VolumeX} tone="violet" value={ov.data?.silent_zones} label={t('Silent areas found')} />
        <Counter Icon={CheckCircle2} tone="green" value={board.data?.completed} label={t('Projects done')} />
        <Counter Icon={ThumbsUp} tone="green" value={board.data?.verified_fixed} label={t('Fixes confirmed by citizens')} />
        <div className="lp-stat tone-blue lp-stat-wide">
          <MapPinned size={22} aria-hidden="true" />
          <span className="lp-stat-text">{ov.data ? t('{s} states · {d} districts', { s: fmt(ov.data.states), d: fmt(ov.data.districts) }) : '…'}</span>
          <span className="lp-stat-label">{t('Where JanSetu runs today')}</span>
        </div>
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section className="lp-section" id="services">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">{t('Services')}</span>
          <h2>{t('What you can do')}</h2>
          <p>{t('From one voice note to finished work. Pick who you are.')}</p>
        </div>
        <div className="lp-filters lp-reveal" role="tablist" aria-label={t('Filter services')}>
          {FILTERS.map((f) => (
            <button key={f.v} role="tab" aria-selected={filter === f.v} className={`lp-filter ${filter === f.v ? 'active' : ''}`} onClick={() => setFilter(f.v)}>
              {filter === f.v && <motion.span layoutId="lp-filter-pill" className="lp-filter-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span>{t(f.l)}</span>
            </button>
          ))}
        </div>
        <motion.div layout className="lp-services">
          <AnimatePresence mode="popLayout">
            {shown.map((s) => (
              <TiltCard key={s.t} to={s.to} className={`who-${s.who}`}>
                <div className="lp-svc-top">
                  <span className={`lp-svc-icon tone-${WHO[s.who].tone}`}><s.Icon size={24} aria-hidden="true" /></span>
                  <span className={`lp-tag tone-${WHO[s.who].tone}`}>{t(WHO[s.who].label)}</span>
                </div>
                <h3>{t(s.t)}</h3>
                <p>{t(s.d)}</p>
                <span className="lp-svc-go">{t('See more')} <ArrowRight size={14} aria-hidden="true" /></span>
              </TiltCard>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="lp-section lp-dark" id="how">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">{t('How it works')}</span>
          <h2>{t('From your voice to real work, in 5 steps')}</h2>
        </div>
        <div className="lp-hiw">
          <div className="lp-hiw-track"><div className="lp-hiw-progress" /></div>
          <ol className="lp-steps">
            {STEPS.map(({ Icon, t: title, d }, i) => (
              <li key={title} className="lp-step">
                <span className="lp-step-num">{i + 1}</span>
                <span className="lp-step-icon"><Icon size={26} aria-hidden="true" /></span>
                <strong>{t(title)}</strong>
                <span>{t(d)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-marquee" aria-label={t('Ways to reach JanSetu')}>
          <motion.div className="lp-marquee-row" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
            {[...CHANNELS, ...CHANNELS].map((c, i) => (
              <span key={i} className="lp-chip" aria-hidden={i >= CHANNELS.length ? 'true' : undefined}><c.Icon size={16} aria-hidden="true" />{t(c.t)}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- INDIA: LANGUAGES + REGIONS ---------------- */}
      <section className="lp-section" id="india">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">{t('Languages')}</span>
          <h2>{t("Built for India's languages and regions")}</h2>
          <p>{t('Five pilot states. People speak their own language.')}</p>
        </div>
        <div className="lp-regions">
          {REGIONS.map((r, i) => {
            const s = byState[r.state]
            return (
              <motion.div key={r.state} className="lp-region lp-reveal" whileHover={{ y: -4 }} transition={{ delay: i * 0.04 }}>
                <div className="lp-region-top"><MapPinned size={22} aria-hidden="true" /><strong>{t(r.state)}</strong></div>
                <div className="lp-region-langs">{r.langs.map((l) => <span key={l}>{t(l)}</span>)}</div>
                <small className="lp-region-dist">{r.districts.map((d) => t(d)).join(' · ')}</small>
                {s && <small className="lp-region-num">{t('{n} reports', { n: fmt(s.reports) })}</small>}
              </motion.div>
            )
          })}
        </div>
        <h3 className="lp-dpi-title lp-reveal">{t("Works with India's digital public infrastructure")}</h3>
        <div className="lp-dpi">
          {DPI.map(({ Icon, t: title, d }) => (
            <div key={title} className="lp-dpi-item lp-reveal">
              <Icon size={22} aria-hidden="true" /><span><strong>{t(title)}</strong><small>{t(d)}</small></span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- STORIES ---------------- */}
      <section className="lp-section lp-soft">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">{t('Real journeys')}</span>
          <h2>{t('Stories you can open and follow')}</h2>
        </div>
        <div className="lp-stories">
          {STORIES.map((s, i) => (
            <motion.div key={s.id} className="lp-story" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }}>
              <Link to={`/track/${s.id}`}>
                <span className="lp-avatar" aria-hidden="true">{t(s.who)[0]}</span>
                <strong>{t(s.who)}</strong><small>{t(s.where)}</small>
                <p>{t(s.what)}</p>
                <span className="lp-svc-go">{t('See journey')} <ArrowRight size={14} aria-hidden="true" /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- AUDIENCE ---------------- */}
      <section className="lp-section" id="audience">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">{t('Who it is for')}</span>
          <h2>{t('One platform, two simple doors')}</h2>
        </div>
        <div className="lp-audience">
          <motion.div className="lp-door lp-reveal" whileHover={{ y: -6 }}>
            <span className="lp-svc-icon tone-green"><UserRound size={24} aria-hidden="true" /></span>
            <h3>{t('Citizens')}</h3>
            <ul>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('Report without any login')}</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('Replies come in your language, read aloud')}</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('Log in with your phone to see all requests')}</li>
            </ul>
            <div className="lp-door-ctas">
              <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />{t('Report a problem')}</Link>
              <Link to="/login?as=citizen" className="lp-btn lp-btn-outline"><UserRound size={16} aria-hidden="true" />{t('Citizen login')}</Link>
            </div>
          </motion.div>
          <motion.div className="lp-door lp-door-dark lp-reveal" whileHover={{ y: -6 }}>
            <span className="lp-svc-icon tone-amber"><Building2 size={24} aria-hidden="true" /></span>
            <h3>{t('Government officials')}</h3>
            <ul>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('See needs on a map, find silent areas')}</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('Get ranked projects with cost in ₹ and reasons')}</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />{t('Export the Gram Sabha plan, prove impact')}</li>
            </ul>
            <div className="lp-door-ctas">
              <Link to="/login?as=official" className="lp-btn lp-btn-solid-light"><Building2 size={16} aria-hidden="true" />{t('Official login')}</Link>
              <Link to="/results" className="lp-btn lp-btn-glass"><Award size={16} aria-hidden="true" />{t('Public results')}</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="lp-cta">
        <motion.div className="lp-cta-inner" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2>{t('Your area needs something? Say it now.')}</h2>
          <p>{t('It takes one minute. No login. Your language.')}</p>
          <div className="lp-hero-ctas" style={{ justifyContent: 'center' }}>
            <Link to="/report" className="lp-btn lp-btn-accent lp-btn-lg"><Megaphone size={20} aria-hidden="true" />{t('Report a problem')}</Link>
            <Link to="/channels" className="lp-btn lp-btn-glass lp-btn-lg"><MessageCircle size={20} aria-hidden="true" />{t('Try WhatsApp demo')}</Link>
          </div>
        </motion.div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-brand"><img src="/favicon.svg" width="30" height="30" alt="" /><span><strong>JanSetu</strong><small>{t('Open source · Digital Public Good for India')}</small></span></div>
          <nav aria-label={t('Footer')}>
            <Link to="/report">{t('Report')}</Link><Link to="/track">{t('My requests')}</Link><Link to="/results">{t('Public results')}</Link>
            <Link to="/overview">{t('Guide')}</Link><Link to="/trust">{t('Privacy')}</Link><Link to="/login?as=official">{t('Officials')}</Link>
          </nav>
          <small>{t('Demo data is made up for testing. Open source · Apache-2.0')}</small>
        </div>
      </footer>
    </div>
  )
}
