import { Link } from 'react-router-dom'
import {
  ArrowRight, AudioLines, BarChart3, CheckCircle2, ClipboardCheck, Ear, HandCoins, Languages, Layers, LogIn, Megaphone,
  MessageCircle, Search, SearchCheck, ThumbsUp, Users, VolumeX,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAsync } from '../lib/useAsync'
import { ColorGuide, PageHead } from '../components/ui'
import { fmt } from '../lib/format'

const WHAT = [
  { Icon: Ear, tone: 'blue', t: 'Listens to everyone', d: 'Speak or type in your own language: app, WhatsApp, phone call or SMS.' },
  { Icon: Layers, tone: 'green', t: 'Finds the real needs', d: 'Groups the same problem from many people and spots villages nobody hears.' },
  { Icon: HandCoins, tone: 'amber', t: 'Guides public money', d: 'Tells officials what to build first, and checks that it really worked.' },
]

const STEPS = [
  { Icon: AudioLines, t: 'You speak', d: 'Any language, any phone' },
  { Icon: Layers, t: 'AI groups it', d: 'Same problems join together' },
  { Icon: BarChart3, t: 'Need is scored', d: 'Using village data too' },
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
  { Icon: LogIn, t: 'Log in', d: 'Pick a demo account.', to: '/login' },
  { Icon: ClipboardCheck, t: 'Check the inbox', d: 'Review unclear or urgent reports.', to: '/officer' },
  { Icon: BarChart3, t: 'See priorities', d: 'Map, ranking and forgotten areas.', to: '/dashboard' },
  { Icon: HandCoins, t: 'Approve projects', d: 'Citizens are told automatically.', to: '/projects' },
]

const STORIES = [
  { id: 'JS-IN-LAKSH1', who: 'Lakshmi · Telangana', what: 'No road to her village. Spoke in Telugu. Now a recommended project.' },
  { id: 'JS-IN-RAMES1', who: 'Ramesh · Delhi', what: 'Told "complaint disposed". He said "not fixed" and it reopened.' },
  { id: 'JS-BR-MARIA1', who: 'Maria · São Paulo', what: 'Dark streets. Counted by need, not by how loud her area is.' },
  { id: 'JS-ZA-THAND1', who: 'Thandi · Soweto', what: 'Power cuts in isiZulu. Triggered an early warning.' },
]

function Steps({ title, Icon, items, tone }) {
  return (
    <section className="card">
      <div className="row" style={{ marginBottom: 12 }}><span className={`icon-tile tone-${tone}`}><Icon size={20} aria-hidden="true" /></span><h3 style={{ margin: 0 }}>{title}</h3></div>
      <ol className="steps">
        {items.map((s, i) => (
          <li key={s.t}>
            <Link to={s.to} className="step-link">
              <span className="step-num">{i + 1}</span>
              <span><strong>{s.t}</strong><span className="small muted" style={{ display: 'block' }}>{s.d}</span></span>
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
  const { data: b } = useAsync(() => api.board(), [])
  return (
    <div className="stack-lg">
      <PageHead title="Your voice → better roads, water and schools." eyebrow="Quick guide · 2 minutes"
        steps={['Report in your language', 'Officials see the real needs', 'You confirm the fix']}
        actions={<>
          <Link to="/report" className="btn btn-primary btn-lg"><Megaphone size={20} aria-hidden="true" />Report a problem</Link>
          <Link to={isOfficial ? '/dashboard' : '/login?as=official'} className="btn btn-lg"><LogIn size={20} aria-hidden="true" />I am an official</Link>
        </>}>
        Tell the government what your area needs, in your own language. JanSetu makes sure it reaches the right people, and shows what they did.
      </PageHead>

      <section className="grid g-4" aria-label="Live numbers">
        <div className="card stat tile-blue"><span className="stat-label"><MessageCircle size={16} aria-hidden="true" />Reports received</span><span className="stat-value">{fmt(b?.requests)}</span></div>
        <div className="card stat tile-blue"><span className="stat-label"><Users size={16} aria-hidden="true" />Families heard</span><span className="stat-value">{fmt(b?.households)}</span></div>
        <div className="card stat tile-green"><span className="stat-label"><CheckCircle2 size={16} aria-hidden="true" />Projects completed</span><span className="stat-value">{fmt(b?.completed)}</span></div>
        <div className="card stat tile-green"><span className="stat-label"><ThumbsUp size={16} aria-hidden="true" />Fixes confirmed by citizens</span><span className="stat-value">{fmt(b?.verified_fixed)}</span></div>
      </section>

      <section>
        <h2 className="section-title">What is JanSetu?</h2>
        <div className="grid g-3">
          {WHAT.map(({ Icon, tone, t, d }) => (
            <div key={t} className="card feature-card">
              <span className={`icon-tile tone-${tone}`}><Icon size={22} aria-hidden="true" /></span>
              <h3>{t}</h3><p className="muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">How it works</h2>
        <ol className="flow">
          {STEPS.map(({ Icon, t, d }, i) => (
            <li key={t} className="card flow-step">
              <span className="step-num">{i + 1}</span>
              <Icon size={26} aria-hidden="true" className="flow-icon" />
              <strong>{t}</strong><span className="small muted">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="section-title">How to use it</h2>
        <div className="grid g-2">
          <Steps title="I am a citizen" Icon={Megaphone} tone="blue" items={CITIZEN_STEPS} />
          <Steps title="I am an official" Icon={ClipboardCheck} tone="amber" items={OFFICIAL_STEPS} />
        </div>
      </section>

      <section className="grid g-2">
        <div className="card">
          <h3>What the colours mean</h3>
          <ColorGuide />
        </div>
        <div className="card">
          <h3>What makes it different</h3>
          <ul className="check-list">
            <li><CheckCircle2 size={18} aria-hidden="true" /><span>Counts <strong>families</strong>, not repeated messages</span></li>
            <li><VolumeX size={18} aria-hidden="true" /><span>Finds <strong>silent villages</strong> that can't complain</span></li>
            <li><Languages size={18} aria-hidden="true" /><span>Replies in <strong>your language</strong>, can read it aloud</span></li>
            <li><Search size={18} aria-hidden="true" /><span>Explains <strong>why</strong> a project is chosen</span></li>
            <li><ThumbsUp size={18} aria-hidden="true" /><span>A case closes only when <strong>you confirm</strong></span></li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="section-title">Real stories to try</h2>
        <div className="grid g-4">
          {STORIES.map((s) => (
            <Link key={s.id} to={`/track/${s.id}`} className="card role-card">
              <strong>{s.who}</strong>
              <p className="small muted" style={{ margin: 0 }}>{s.what}</p>
              <span className="row small" style={{ color: 'var(--color-accent)', marginTop: 'auto' }}>See journey <ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
