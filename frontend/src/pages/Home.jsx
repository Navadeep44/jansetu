import { Link } from 'react-router-dom'
import {
  ArrowRight, AudioLines, BarChart3, CheckCircle2, ClipboardCheck, Ear, HandCoins, Languages, Layers, LogIn, Megaphone,
  MessageCircle, Search, SearchCheck, ThumbsUp, Users, VolumeX,
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAsync } from '../lib/useAsync'
import { ColorGuide } from '../components/ui'
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
  const { isOfficial, t } = useApp()
  const { data: b } = useAsync(() => api.board(), [])

  const whatItems = [
    { Icon: Ear, tone: 'blue', t: t('home_listens_title', 'Listens to everyone'), d: t('home_listens_desc', 'Speak or type in your own language: app, WhatsApp, phone call or SMS.') },
    { Icon: Layers, tone: 'green', t: t('home_finds_title', 'Finds the real needs'), d: t('home_finds_desc', 'Groups the same problem from many people and spots villages nobody hears.') },
    { Icon: HandCoins, tone: 'amber', t: t('home_guides_title', 'Guides public money'), d: t('home_guides_desc', 'Tells officials what to build first, and checks that it really worked.') },
  ]

  const flowSteps = [
    { Icon: AudioLines, t: t('step_you_speak', 'You speak'), d: t('step_you_speak_desc', 'Any language, any phone') },
    { Icon: Layers, t: t('step_ai_groups', 'AI groups it'), d: t('step_ai_groups_desc', 'Same problems join together') },
    { Icon: BarChart3, t: t('step_need_scored', 'Need is scored'), d: t('step_need_scored_desc', 'Using village data too') },
    { Icon: HandCoins, t: t('step_officials_act', 'Officials act'), d: t('step_officials_act_desc', 'Best projects approved') },
    { Icon: CheckCircle2, t: t('step_you_confirm', 'You confirm'), d: t('step_you_confirm_desc', 'Only you can say "fixed"') },
  ]

  const citizenSteps = [
    { Icon: Megaphone, t: t('step_cit_report', 'Report'), d: t('step_cit_report_desc', 'Tap the mic and speak, or type.'), to: '/report' },
    { Icon: ThumbsUp, t: t('step_cit_metoo', 'Or say "Me too"'), d: t('step_cit_metoo_desc', 'Support a problem already reported near you.'), to: '/report' },
    { Icon: SearchCheck, t: t('step_cit_track', 'Track'), d: t('step_cit_track_desc', 'Use your tracking ID or phone number.'), to: '/track' },
    { Icon: CheckCircle2, t: t('step_cit_confirm', 'Confirm the fix'), d: t('step_cit_confirm_desc', 'Say yes or no when work is done.'), to: '/track/JS-IN-RAMES1' },
  ]

  const officialSteps = [
    { Icon: LogIn, t: t('step_off_login', 'Log in'), d: t('step_off_login_desc', 'Pick a demo account.'), to: '/login' },
    { Icon: ClipboardCheck, t: t('step_off_inbox', 'Check the inbox'), d: t('step_off_inbox_desc', 'Review unclear or urgent reports.'), to: '/officer' },
    { Icon: BarChart3, t: t('step_off_priorities', 'See priorities'), d: t('step_off_priorities_desc', 'Map, ranking and forgotten areas.'), to: '/dashboard' },
    { Icon: HandCoins, t: t('step_off_approve', 'Approve projects'), d: t('step_off_approve_desc', 'Citizens are told automatically.'), to: '/projects' },
  ]

  const stories = [
    { id: 'JS-IN-LAKSH1', who: 'Lakshmi · Telangana', what: 'No road to her village. Spoke in Telugu. Now a recommended project.' },
    { id: 'JS-IN-RAMES1', who: 'Ramesh · Delhi', what: 'Told "complaint disposed". He said "not fixed" and it reopened.' },
    { id: 'JS-IN-LAKSH1', who: 'Pooja · Bihar', what: 'Reported water logging in Bhojpuri. Grouped into a high-priority cluster.' },
    { id: 'JS-IN-RAMES1', who: 'Kavitha · Tamil Nadu', what: 'Broken bridge over stream. Verified when new bridge work began.' },
  ]

  return (
    <div className="stack-lg">
      <section className="hero">
        <h1>{t('home_hero_title', 'Your voice → better roads, water and schools.')}</h1>
        <p className="lead">{t('home_hero_lead', 'Tell the government what your area needs, in your own language. JanSetu makes sure it reaches the right people, and shows what they did.')}</p>
        <div className="row mt-lg">
          <Link to="/report" className="btn btn-primary btn-lg"><Megaphone size={20} aria-hidden="true" />{t('home_report_btn', 'Report a problem')}</Link>
          {isOfficial ? (
            <Link to="/dashboard" className="btn btn-lg btn-hero-ghost"><BarChart3 size={20} aria-hidden="true" />Policymaker Dashboard</Link>
          ) : (
            <Link to="/track" className="btn btn-lg btn-hero-ghost"><SearchCheck size={20} aria-hidden="true" />{t('nav_track', 'Track your request')}</Link>
          )}
        </div>
        <p className="small" style={{ color: '#94a3b8', marginTop: 12 }}>{t('home_hero_sub', 'No login needed for citizens · Works in 12+ Indian languages · Free and open source')}</p>
      </section>

      <section className="grid g-4" aria-label="Live numbers">
        <div className="card stat tile-blue"><span className="stat-label"><MessageCircle size={16} aria-hidden="true" />{t('stat_reports_received', 'Reports received')}</span><span className="stat-value">{fmt(b?.requests)}</span></div>
        <div className="card stat tile-blue"><span className="stat-label"><Users size={16} aria-hidden="true" />{t('stat_families_heard', 'Families heard')}</span><span className="stat-value">{fmt(b?.households)}</span></div>
        <div className="card stat tile-green"><span className="stat-label"><CheckCircle2 size={16} aria-hidden="true" />{t('stat_projects_completed', 'Projects completed')}</span><span className="stat-value">{fmt(b?.completed)}</span></div>
        <div className="card stat tile-green"><span className="stat-label"><ThumbsUp size={16} aria-hidden="true" />{t('stat_fixes_confirmed', 'Fixes confirmed by citizens')}</span><span className="stat-value">{fmt(b?.verified_fixed)}</span></div>
      </section>

      <section>
        <h2 className="section-title">{t('home_what_is', 'What is JanSetu?')}</h2>
        <div className="grid g-3">
          {whatItems.map(({ Icon, tone, t: itemT, d }) => (
            <div key={itemT} className="card feature-card">
              <span className={`icon-tile tone-${tone}`}><Icon size={22} aria-hidden="true" /></span>
              <h3>{itemT}</h3><p className="muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('home_how_it_works', 'How it works')}</h2>
        <ol className="flow">
          {flowSteps.map(({ Icon, t: stepT, d }, i) => (
            <li key={stepT} className="card flow-step">
              <span className="step-num">{i + 1}</span>
              <Icon size={26} aria-hidden="true" className="flow-icon" />
              <strong>{stepT}</strong><span className="small muted">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="section-title">{t('home_how_it_works', 'How to use it')}</h2>
        <div className="grid g-2">
          <Steps title={t('home_for_citizens', 'I am a citizen')} Icon={Megaphone} tone="blue" items={citizenSteps} />
          <Steps title={t('home_for_officials', 'I am an official')} Icon={ClipboardCheck} tone="amber" items={officialSteps} />
        </div>
      </section>

      <section className="grid g-2">
        <div className="card">
          <h3>{t('home_what_colours_mean', 'What the colours mean')}</h3>
          <ColorGuide />
        </div>
        <div className="card">
          <h3>{t('home_what_different', 'What makes it different')}</h3>
          <ul className="check-list">
            <li><CheckCircle2 size={18} aria-hidden="true" /><span>{t('home_diff_families', 'Counts families, not repeated messages')}</span></li>
            <li><VolumeX size={18} aria-hidden="true" /><span>{t('home_diff_silent', "Finds silent villages that can't complain")}</span></li>
            <li><Languages size={18} aria-hidden="true" /><span>{t('home_diff_language', 'Replies in your language, can read it aloud')}</span></li>
            <li><Search size={18} aria-hidden="true" /><span>{t('home_diff_why', 'Explains why a project is chosen')}</span></li>
            <li><ThumbsUp size={18} aria-hidden="true" /><span>{t('home_diff_confirm', 'A case closes only when you confirm')}</span></li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="section-title">{t('home_stories', 'Voices from the ground')}</h2>
        <div className="grid g-4">
          {stories.map((s, idx) => (
            <Link key={idx} to={`/track/${s.id}`} className="card role-card">
              <strong>{s.who}</strong>
              <p className="small muted" style={{ margin: 0 }}>{s.what}</p>
              <span className="row small" style={{ color: 'var(--color-accent)', marginTop: 'auto' }}>{t('home_see_journey', 'See journey')} <ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
