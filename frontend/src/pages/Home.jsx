import { Link } from 'react-router-dom'
import {
  ArrowRight, AudioLines, BarChart3, CheckCircle2, ClipboardCheck, Ear, HandCoins, Languages, Layers, LogIn, Megaphone,
  MessageCircle, Search, SearchCheck, ThumbsUp, Users, VolumeX,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { useT } from '../i18n'
import { useAsync } from '../lib/useAsync'
import { ColorGuide, PageHead, Stat } from '../components/ui'
import { fmt } from '../lib/format'

const WHAT = [
  { Icon: Ear, tone: 'blue', t: 'Listens to everyone', d: 'Speak or type in your language. App, WhatsApp, call or SMS.' },
  { Icon: Layers, tone: 'green', t: 'Finds the real needs', d: 'Joins the same problem from many families. Finds silent villages.' },
  { Icon: HandCoins, tone: 'amber', t: 'Guides public money', d: 'Shows officials what to build first. Checks that it worked.' },
]

const STEPS = [
  { Icon: AudioLines, t: 'You speak', d: 'Any language, any phone' },
  { Icon: Layers, t: 'AI groups it', d: 'Same problems join together' },
  { Icon: BarChart3, t: 'Need is scored', d: 'With village data too' },
  { Icon: HandCoins, t: 'Officials act', d: 'Best projects approved' },
  { Icon: CheckCircle2, t: 'You confirm', d: 'Only you can say "fixed"' },
]

const CITIZEN_STEPS = [
  { Icon: Megaphone, t: 'Report', d: 'Tap the mic and speak, or type.', to: '/report' },
  { Icon: ThumbsUp, t: 'Or say "Me too"', d: 'Support a problem already reported near you.', to: '/report' },
  { Icon: SearchCheck, t: 'Track', d: 'Use your tracking ID or phone number.', to: '/track' },
  { Icon: CheckCircle2, t: 'Confirm the fix', d: 'Say yes or no when work is done.', to: '/track/JS-IN-RAMES1' },
]
const OFFICIAL_STEPS = [
  { Icon: LogIn, t: 'Log in', d: 'Pick a demo account.', to: '/login?as=official' },
  { Icon: ClipboardCheck, t: 'Check the inbox', d: 'Look at unclear or urgent reports.', to: '/officer' },
  { Icon: BarChart3, t: 'See priorities', d: 'Map, ranking and silent areas.', to: '/dashboard' },
  { Icon: HandCoins, t: 'Approve projects', d: 'Citizens are told automatically.', to: '/projects' },
]

const STORIES = [
  { id: 'JS-IN-LAKSH1', who: 'Lakshmi · Narnoor, Adilabad', what: 'No all-weather road. Spoke in Telugu with ASHA help. Now in a project.' },
  { id: 'JS-IN-RAMES1', who: 'Ramesh · Bawana, Delhi', what: 'Drain overflow. Told "disposed", but not fixed. He reopened it.' },
  { id: 'JS-IN-SUNIT1', who: 'Sunita · Mihinpurwa, Bahraich', what: 'No doctor at the health centre. A silent area, now seen.' },
  { id: 'JS-IN-PRIYA1', who: 'Priya · Malakpet, Hyderabad', what: 'Power cuts. Her report started an early warning.' },
]

function Steps({ title, Icon, items, tone }) {
  const t = useT()
  return (
    <section className="card">
      <div className="row" style={{ marginBottom: 12 }}><span className={`icon-tile tone-${tone}`}><Icon size={20} aria-hidden="true" /></span><h3 style={{ margin: 0 }}>{t(title)}</h3></div>
      <ol className="steps">
        {items.map((s, i) => (
          <li key={s.t}>
            <Link to={s.to} className="step-link">
              <span className="step-num">{i + 1}</span>
              <span><strong>{t(s.t)}</strong><span className="small muted" style={{ display: 'block' }}>{t(s.d)}</span></span>
              <ArrowRight size={16} aria-hidden="true" className="muted" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Home() {
  const { isOfficial } = useApp()
  const t = useT()
  const { data: b } = useAsync(() => api.board(), [])
  return (
    <div className="stack-lg">
      <PageHead title="Your voice → better roads, water and schools." eyebrow="Quick guide · 2 minutes"
        steps={['Report in your language', 'Officials see the real needs', 'You confirm the fix']}
        actions={<>
          <Link to="/report" className="btn btn-primary btn-lg"><Megaphone size={20} aria-hidden="true" />{t('Report a problem')}</Link>
          <Link to={isOfficial ? '/dashboard' : '/login?as=official'} className="btn btn-lg"><LogIn size={20} aria-hidden="true" />{t('I am an official')}</Link>
        </>}>
        Tell the government what your area needs, in your own language. We make sure it reaches the right officer.
      </PageHead>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }} aria-label={t("Live numbers")}>
        <Stat icon={MessageCircle} tone="blue" label="Reports received" value={fmt(b?.requests)} />
        <Stat icon={Users} tone="blue" label="Families heard" value={fmt(b?.households)} />
        <Stat icon={CheckCircle2} tone="green" label="Projects done" value={fmt(b?.completed)} />
        <Stat icon={ThumbsUp} tone="green" label="Fixes confirmed by citizens" value={fmt(b?.verified_fixed)} />
      </section>

      <section>
        <h2 className="section-title">{t('What is JanSetu?')}</h2>
        <div className="grid g-3">
          {WHAT.map(({ Icon, tone, t: title, d }) => (
            <div key={title} className="card feature-card">
              <span className={`icon-tile tone-${tone}`}><Icon size={22} aria-hidden="true" /></span>
              <h3>{t(title)}</h3><p className="muted">{t(d)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('How it works')}</h2>
        <ol className="flow">
          {STEPS.map(({ Icon, t: title, d }, i) => (
            <li key={title} className="card flow-step">
              <span className="step-num">{i + 1}</span>
              <Icon size={26} aria-hidden="true" className="flow-icon" />
              <strong>{t(title)}</strong><span className="small muted">{t(d)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="section-title">{t('How to use it')}</h2>
        <div className="grid g-2">
          <Steps title="I am a citizen" Icon={Megaphone} tone="blue" items={CITIZEN_STEPS} />
          <Steps title="I am an official" Icon={ClipboardCheck} tone="amber" items={OFFICIAL_STEPS} />
        </div>
      </section>

      <section className="grid g-2">
        <div className="card">
          <h3>{t('What the colours mean')}</h3>
          <ColorGuide />
        </div>
        <div className="card">
          <h3>{t('What makes it different')}</h3>
          <ul className="check-list">
            <li><Users size={18} aria-hidden="true" /><span>{t('Counts families, not repeated messages')}</span></li>
            <li><VolumeX size={18} aria-hidden="true" /><span>{t('Finds silent villages that cannot complain')}</span></li>
            <li><Languages size={18} aria-hidden="true" /><span>{t('Replies in your language, and reads it aloud')}</span></li>
            <li><Search size={18} aria-hidden="true" /><span>{t('Explains why a project is chosen')}</span></li>
            <li><ThumbsUp size={18} aria-hidden="true" /><span>{t('A case closes only when you confirm')}</span></li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('Real stories to try')}</h2>
        <div className="grid g-4">
          {STORIES.map((s) => (
            <Link key={s.id} to={`/track/${s.id}`} className="card role-card">
              <strong>{t(s.who)}</strong>
              <p className="small muted" style={{ margin: 0 }}>{t(s.what)}</p>
              <span className="row small" style={{ color: 'var(--color-accent)', marginTop: 'auto' }}>{t('See journey')} <ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
