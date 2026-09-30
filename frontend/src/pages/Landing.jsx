import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import {
  ArrowRight, AudioLines, Award, BarChart3, Building2, CheckCircle2, CloudOff, Globe2, HandCoins, Inbox, Languages,
  Layers, ListOrdered, Lock, Map as MapIcon, Megaphone, MessageCircle, Phone, SearchCheck, ShieldCheck, Smartphone,
  Sparkles, ThumbsUp, TrendingUp, UserRound, Users, VolumeX,
} from 'lucide-react'
import Navbar from '../components/landing/Navbar'
import { api } from '../api/client'
import { useAsync } from '../lib/useAsync'


gsap.registerPlugin(ScrollTrigger, useGSAP)
const Globe3D = lazy(() => import('../components/landing/Globe3D'))

const SERVICES = [
  { who: 'citizen', Icon: Megaphone, t: 'Report by voice or text', d: 'Speak in your own language. No forms, no department to find.', to: '/report' },
  { who: 'citizen', Icon: MessageCircle, t: 'WhatsApp, call or SMS', d: 'Works on any phone, even without internet.', to: '/channels' },
  { who: 'citizen', Icon: ThumbsUp, t: '"Me too" support', d: 'One tap to join a problem already reported near you.', to: '/report' },
  { who: 'citizen', Icon: SearchCheck, t: 'Track and reply', d: 'Follow your request and answer questions in one chat.', to: '/track' },
  { who: 'citizen', Icon: CheckCircle2, t: 'Confirm the fix', d: 'A case closes only when you say it is really fixed.', to: '/track/JS-IN-RAMES1' },
  { who: 'citizen', Icon: Users, t: 'Community meetings', d: 'Turn Gram Sabha notes into many demands at once.', to: '/report' },
  { who: 'citizen', Icon: CloudOff, t: 'Works offline', d: 'No signal? It saves and sends when you are back online.', to: '/report' },
  { who: 'everyone', Icon: Award, t: 'Public results', d: 'See what people asked for and what was done.', to: '/results' },
  { who: 'official', Icon: Inbox, t: 'Officer inbox', d: 'Unclear or urgent reports, and fake closures to fix.', to: '/officer' },
  { who: 'official', Icon: MapIcon, t: 'Needs map & early warnings', d: 'Hotspots, sudden spikes and outbreak risks.', to: '/dashboard' },
  { who: 'official', Icon: ListOrdered, t: 'Priority ranking & silent areas', d: 'Clear scores you can adjust, and places nobody hears.', to: '/priorities' },
  { who: 'official', Icon: HandCoins, t: 'Projects & budget planner', d: 'What to build first, cost, and who can fund it.', to: '/projects' },
  { who: 'official', Icon: Sparkles, t: 'Ask a question', d: 'Ask in any language. Get answers, maps and a brief.', to: '/ask' },
  { who: 'official', Icon: TrendingUp, t: 'Impact tracking', d: 'Did the project really reduce the problem?', to: '/impact' },
  { who: 'everyone', Icon: Globe2, t: 'BRICS comparison', d: 'Countries compare needs without sharing personal data.', to: '/brics' },
  { who: 'everyone', Icon: ShieldCheck, t: 'Privacy & open data', d: 'Personal details removed. Open APIs and CSV export.', to: '/trust' },
]
const WHO = { citizen: { label: 'No login', tone: 'green' }, official: { label: 'Officials', tone: 'amber' }, everyone: { label: 'Everyone', tone: 'blue' } }
const FILTERS = [{ v: 'all', l: 'All services' }, { v: 'citizen', l: 'For citizens' }, { v: 'official', l: 'For officials' }, { v: 'everyone', l: 'Open to all' }]

const STEPS = [
  { Icon: AudioLines, t: 'You speak', d: 'Any language, any phone' },
  { Icon: Layers, t: 'AI groups it', d: 'Same problems join together' },
  { Icon: BarChart3, t: 'Need is scored', d: 'With village data too' },
  { Icon: HandCoins, t: 'Officials act', d: 'Best projects approved' },
  { Icon: CheckCircle2, t: 'You confirm', d: 'Only you can say "fixed"' },
]
const CHANNELS = [
  { Icon: Smartphone, t: 'Web & app' }, { Icon: MessageCircle, t: 'WhatsApp' }, { Icon: MessageCircle, t: 'Telegram' },
  { Icon: Phone, t: 'Phone call (IVR)' }, { Icon: MessageCircle, t: 'SMS' }, { Icon: UserRound, t: 'CSC / ASHA helper' },
  { Icon: Users, t: 'Gram Sabha meeting' }, { Icon: CloudOff, t: 'Offline outbox' }, { Icon: Languages, t: '13+ languages' },
]
const STORIES = [
  { id: 'JS-IN-LAKSH1', who: 'Lakshmi', where: 'Telangana, India', what: 'No road to her village. Spoke in Telugu. Now a recommended project.' },
  { id: 'JS-IN-RAMES1', who: 'Ramesh', where: 'Delhi, India', what: 'Told "complaint disposed". He said "not fixed" and it reopened.' },
  { id: 'JS-BR-MARIA1', who: 'Maria', where: 'São Paulo, Brazil', what: 'Dark streets. Counted by need, not by how loud her area is.' },
  { id: 'JS-ZA-THAND1', who: 'Thandi', where: 'Soweto, South Africa', what: 'Power cuts reported in isiZulu triggered an early warning.' },
]

function TiltCard({ children, className = '', to }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 250, damping: 20 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 250, damping: 20 })
  const onMove = (e) => {
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
  const root = useRef(null)
  const [filter, setFilter] = useState('all')
  const board = useAsync(() => api.board(), [])
  const ov = useAsync(() => api.overview(), [])
  const shown = useMemo(() => SERVICES.filter((s) => filter === 'all' || s.who === filter), [filter])
  const ready = !!board.data && !!ov.data

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.lp-word', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out', delay: 0.1 })
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

  const headline = 'Every voice. Every language. The right public work.'
  return (
    <div className="lp" ref={root}>
      <Navbar />

      {/* ---------------- HERO ---------------- */}
      <section className="lp-hero" id="top">
        <div className="lp-orb lp-orb-a" aria-hidden="true" />
        <div className="lp-orb lp-orb-b" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <motion.span className="lp-eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <span className="lp-dot" />BRICS 2026 · AI for Digital Public Infrastructure
            </motion.span>
            <h1 className="lp-h1" aria-label={headline}>
              {headline.split(' ').map((w, i) => (
                <span key={i} className="lp-word-wrap" aria-hidden="true"><span className="lp-word">{w}</span></span>
              ))}
            </h1>
            <p className="lp-hero-sub">Tell the government what your area needs by voice, WhatsApp or a phone call. JanSetu turns millions of voices into clear priorities, and shows what was done.</p>
            <div className="lp-hero-ctas">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/report" className="lp-btn lp-btn-accent lp-btn-lg"><Megaphone size={20} aria-hidden="true" />Report a problem</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/login?as=citizen" className="lp-btn lp-btn-glass lp-btn-md"><UserRound size={18} aria-hidden="true" />Citizen login</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link to="/login?as=official" className="lp-btn lp-btn-glass lp-btn-md"><Building2 size={18} aria-hidden="true" />Official login</Link>
              </motion.div>
            </div>
            <div className="lp-hero-chips">
              <span><CheckCircle2 size={16} aria-hidden="true" />No login needed to report</span>
              <span><Languages size={16} aria-hidden="true" />13+ languages</span>
              <span><Lock size={16} aria-hidden="true" />Personal data protected</span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-globe">
              <Suspense fallback={<div className="lp-globe-fallback" />}>
                <Globe3D />
              </Suspense>
            </div>
            <motion.div className="lp-float lp-float-1" animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
              <AudioLines size={16} aria-hidden="true" /><span><strong>Telugu voice note</strong><small>→ Roads · Narnoor</small></span>
            </motion.div>
            <motion.div className="lp-float lp-float-2" animate={{ y: [0, 12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}>
              <Users size={16} aria-hidden="true" /><span><strong>212 families</strong><small>= 1 clear need</small></span>
            </motion.div>
            <motion.div className="lp-float lp-float-3" animate={{ y: [0, -8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}>
              <VolumeX size={16} aria-hidden="true" /><span><strong>Silent area found</strong><small>High need, few voices</small></span>
            </motion.div>
            <div className="lp-legend"><span><i className="amber" />Live nodes</span><span><i className="sky" />Partner nodes</span></div>
          </div>
        </div>
        <a href="#services" className="lp-scroll" aria-label="Scroll to services"><span /></a>
      </section>

      {/* ---------------- NUMBERS ---------------- */}
      <section className="lp-stats" id="impact" aria-label="Live numbers">
        <Counter Icon={MessageCircle} tone="blue" value={board.data?.requests} label="Reports received" />
        <Counter Icon={Users} tone="blue" value={board.data?.households} label="Families heard" />
        <Counter Icon={Languages} tone="green" value={ov.data?.languages} label="Languages" />
        <Counter Icon={VolumeX} tone="violet" value={ov.data?.silent_zones} label="Silent areas found" />
        <Counter Icon={CheckCircle2} tone="green" value={board.data?.completed} label="Projects completed" />
        <Counter Icon={ThumbsUp} tone="green" value={board.data?.verified_fixed} label="Fixes confirmed" />
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section className="lp-section" id="services">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">Services</span>
          <h2>Everything JanSetu offers</h2>
          <p>From one voice note to a funded project: for citizens, officials and every BRICS country.</p>
        </div>
        <div className="lp-filters lp-reveal" role="tablist" aria-label="Filter services">
          {FILTERS.map((f) => (
            <button key={f.v} role="tab" aria-selected={filter === f.v} className={`lp-filter ${filter === f.v ? 'active' : ''}`} onClick={() => setFilter(f.v)}>
              {filter === f.v && <motion.span layoutId="lp-filter-pill" className="lp-filter-pill" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span>{f.l}</span>
            </button>
          ))}
        </div>
        <motion.div layout className="lp-services">
          <AnimatePresence mode="popLayout">
            {shown.map((s) => (
              <TiltCard key={s.t} to={s.to} className={`who-${s.who}`}>
                <div className="lp-svc-top">
                  <span className={`lp-svc-icon tone-${WHO[s.who].tone}`}><s.Icon size={22} aria-hidden="true" /></span>
                  <span className={`lp-tag tone-${WHO[s.who].tone}`}>{WHO[s.who].label}</span>
                </div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <span className="lp-svc-go">Open <ArrowRight size={14} aria-hidden="true" /></span>
              </TiltCard>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="lp-section lp-dark" id="how">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">How it works</span>
          <h2>From your voice to real work, in 5 steps</h2>
        </div>
        <div className="lp-hiw">
          <div className="lp-hiw-track"><div className="lp-hiw-progress" /></div>
          <ol className="lp-steps">
            {STEPS.map(({ Icon, t, d }, i) => (
              <li key={t} className="lp-step">
                <span className="lp-step-num">{i + 1}</span>
                <span className="lp-step-icon"><Icon size={26} aria-hidden="true" /></span>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-marquee" aria-label="Ways to reach JanSetu">
          <motion.div className="lp-marquee-row" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
            {[...CHANNELS, ...CHANNELS].map((c, i) => (
              <span key={i} className="lp-chip"><c.Icon size={16} aria-hidden="true" />{c.t}</span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- AUDIENCE ---------------- */}
      <section className="lp-section" id="audience">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">Who it is for</span>
          <h2>One platform, two simple doors</h2>
        </div>
        <div className="lp-audience">
          <motion.div className="lp-door lp-reveal" whileHover={{ y: -6 }}>
            <span className="lp-svc-icon tone-green"><UserRound size={24} aria-hidden="true" /></span>
            <h3>Citizens</h3>
            <ul>
              <li><CheckCircle2 size={18} aria-hidden="true" />Report without any login</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />Replies come in your language, read aloud</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />Log in with your phone to see all requests</li>
            </ul>
            <div className="lp-door-ctas">
              <Link to="/report" className="lp-btn lp-btn-accent"><Megaphone size={16} aria-hidden="true" />Report a problem</Link>
              <Link to="/login?as=citizen" className="lp-btn lp-btn-outline"><UserRound size={16} aria-hidden="true" />Citizen login</Link>
            </div>
          </motion.div>
          <motion.div className="lp-door lp-door-dark lp-reveal" whileHover={{ y: -6 }}>
            <span className="lp-svc-icon tone-amber"><Building2 size={24} aria-hidden="true" /></span>
            <h3>Government officials</h3>
            <ul>
              <li><CheckCircle2 size={18} aria-hidden="true" />See needs on a map, find silent areas</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />Get ranked, costed projects with reasons</li>
              <li><CheckCircle2 size={18} aria-hidden="true" />Prove impact and keep citizens informed</li>
            </ul>
            <div className="lp-door-ctas">
              <Link to="/login?as=official" className="lp-btn lp-btn-solid-light"><Building2 size={16} aria-hidden="true" />Official login</Link>
              <Link to="/results" className="lp-btn lp-btn-glass"><Award size={16} aria-hidden="true" />Public results</Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- STORIES ---------------- */}
      <section className="lp-section lp-soft">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">Real journeys</span>
          <h2>Stories you can open and follow</h2>
        </div>
        <div className="lp-stories">
          {STORIES.map((s, i) => (
            <motion.div key={s.id} className="lp-story" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }}>
              <Link to={`/track/${s.id}`}>
                <span className="lp-avatar" aria-hidden="true">{s.who[0]}</span>
                <strong>{s.who}</strong><small>{s.where}</small>
                <p>{s.what}</p>
                <span className="lp-svc-go">See journey <ArrowRight size={14} aria-hidden="true" /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- BRICS & TRUST ---------------- */}
      <section className="lp-section" id="brics">
        <div className="lp-section-head lp-reveal">
          <span className="lp-kicker">Built for BRICS</span>
          <h2>Each country keeps its own data</h2>
          <p>Only anonymous totals are shared, so countries can compare needs and plan together.</p>
        </div>
        <div className="lp-trust">
          {[
            { Icon: Globe2, t: '10 countries, 1 platform', d: 'Each runs its own copy. Data never leaves the country.' },
            { Icon: ShieldCheck, t: 'Privacy by design', d: 'Names and numbers removed before any official sees text.' },
            { Icon: Sparkles, t: 'Works without AI keys', d: 'Runs offline, and gets smarter with Bhashini or any AI model.' },
            { Icon: Award, t: 'Digital Public Good', d: 'Free, open source, and meets all 9 DPG standards.' },
          ].map(({ Icon, t, d }) => (
            <motion.div key={t} className="lp-trust-card lp-reveal" whileHover={{ scale: 1.02 }}>
              <Icon size={24} aria-hidden="true" /><strong>{t}</strong><span>{d}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="lp-cta">
        <motion.div className="lp-cta-inner" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h2>Your area needs something? Say it now.</h2>
          <p>It takes one minute. No login. Any language.</p>
          <div className="lp-hero-ctas" style={{ justifyContent: 'center' }}>
            <Link to="/report" className="lp-btn lp-btn-accent lp-btn-lg"><Megaphone size={20} aria-hidden="true" />Report a problem</Link>
            <Link to="/channels" className="lp-btn lp-btn-glass lp-btn-lg"><MessageCircle size={20} aria-hidden="true" />Try WhatsApp demo</Link>
          </div>
        </motion.div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-brand"><img src="/favicon.svg" width="30" height="30" alt="" /><span><strong>JanSetu</strong><small>Open source · Digital Public Good</small></span></div>
          <nav aria-label="Footer">
            <Link to="/report">Report</Link><Link to="/track">My requests</Link><Link to="/results">Public results</Link>
            <Link to="/brics">BRICS</Link><Link to="/trust">Privacy</Link><Link to="/login?as=official">Officials</Link>
          </nav>
          <small>Demo data is synthetic. Built for BRICS Track 1 · Apache-2.0</small>
        </div>
      </footer>
    </div>
  )
}
