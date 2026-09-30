import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Award, BarChart3, Building2, ClipboardList, Eye, FileText, Globe2,
  HandCoins, Home, Inbox, Layers, ListOrdered, Lock, LogIn, LogOut,
  MapPin, Megaphone, Menu, MessageCircle, SearchCheck, ShieldAlert,
  ShieldCheck, Sparkles, TrendingUp, UserCheck, UserPlus, UserRound, Users,
  Volume2, VolumeX
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS } from '../../i18n/strings'
import { Modal } from '../ui'
export { RequireRole, RequireOfficial, RequireCitizen } from './RequireRole'

const ROLE_DISPLAY_NAMES = {
  super_admin: 'Super Admin (National Master)',
  admin: 'National Admin / Planner',
  state_officer: 'State Grievance Officer',
  district_officer: 'District Collector',
  dept_officer: 'Department Officer',
  field_officer: 'Field Redressal Officer',
  district: 'District Collector',
  national: 'National Planner',
  citizen: 'Registered Citizen',
}

const ROLE_BADGE_STYLE = {
  super_admin: 'badge-red',
  admin: 'badge-blue',
  state_officer: 'badge-amber',
  district_officer: 'badge-green',
  dept_officer: 'badge-violet',
  field_officer: 'badge-blue',
  citizen: 'badge-gray',
}

function Group({ title, items }) {
  return (
    <nav className="nav-group" aria-label={title}>
      <div className="nav-title">{title}</div>
      {items.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-link">
          <Icon size={18} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default function Layout() {
  const {
    user, isLoggedIn, isOfficial, isCitizen, isSuperAdmin, isAdmin,
    isStateOfficer, isDistrictOfficer, isDeptOfficer, isFieldOfficer,
    role, jurisdiction, logout, country, setCountry, uiLang, setUiLang, t
  } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  // Accessibility state
  const [fontSizeLevel, setFontSizeLevel] = useState(0)
  const [highContrast, setHighContrast] = useState(false)
  const [readingAloud, setReadingAloud] = useState(false)

  // Platform bug / feedback modal state
  const [bugModalOpen, setBugModalOpen] = useState(false)
  const [bugType, setBugType] = useState('bug')
  const [bugDesc, setBugDesc] = useState('')
  const [bugEmail, setBugEmail] = useState('')
  const [bugSubmitted, setBugSubmitted] = useState(false)

  const changeFontSize = (delta) => {
    setFontSizeLevel((curr) => {
      const next = Math.max(-1, Math.min(2, curr + delta))
      const sizes = { '-1': '14px', '0': '16px', '1': '18px', '2': '20px' }
      document.documentElement.style.fontSize = sizes[next] || '16px'
      return next
    })
  }

  const toggleHighContrast = () => {
    setHighContrast((curr) => {
      const next = !curr
      if (next) {
        document.documentElement.classList.add('high-contrast')
      } else {
        document.documentElement.classList.remove('high-contrast')
      }
      return next
    })
  }

  const readPageAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    if (readingAloud) {
      setReadingAloud(false)
      return
    }
    const mainEl = document.getElementById('main')
    const textToRead = mainEl?.innerText?.slice(0, 800) || document.title
    if (!textToRead) return
    const u = new SpeechSynthesisUtterance(textToRead)
    u.lang = uiLang === 'hi' ? 'hi-IN' : uiLang === 'te' ? 'te-IN' : uiLang === 'ta' ? 'ta-IN' : 'en-IN'
    u.onend = () => setReadingAloud(false)
    u.onerror = () => setReadingAloud(false)
    setReadingAloud(true)
    window.speechSynthesis.speak(u)
  }

  const handleBugSubmit = (e) => {
    e.preventDefault()
    setBugSubmitted(true)
    try {
      const existing = JSON.parse(localStorage.getItem('js_platform_issues') || '[]')
      existing.push({ id: 'PL-' + Date.now().toString().slice(-6), type: bugType, desc: bugDesc, email: bugEmail, at: new Date().toISOString() })
      localStorage.setItem('js_platform_issues', JSON.stringify(existing))
    } catch {}
    setTimeout(() => {
      setBugSubmitted(false)
      setBugDesc('')
      setBugEmail('')
      setBugModalOpen(false)
    }, 2200)
  }

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [loc.pathname])

  // Dynamic Navigation Building based on RBAC Role
  const citizenItems = [
    { to: '/', label: t('nav_home', 'Home'), Icon: Home, end: true },
    { to: '/report', label: t('nav_report', 'Report a problem'), Icon: Megaphone },
    { to: '/track', label: t('nav_track', 'My Requests & Status'), Icon: SearchCheck },
    { to: '/channels', label: t('nav_channels', 'WhatsApp & Phone Demo'), Icon: MessageCircle },
    { to: '/results', label: t('nav_results', 'Public Results'), Icon: Award },
  ]

  // Role-specific official items
  const buildOfficialItems = () => {
    if (isFieldOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'Policymaker Dashboard'), Icon: BarChart3 },
        { to: '/officer', label: t('nav_officer_inbox', 'Field Tasks & Proof Upload'), Icon: Inbox },
        { to: '/results', label: t('nav_results', 'Public Results'), Icon: Award },
      ]
    }
    if (isDeptOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'Policymaker Dashboard'), Icon: BarChart3 },
        { to: '/officer', label: t('nav_officer_inbox', 'Department Grievance Queue'), Icon: Inbox },
        { to: '/clusters', label: t('nav_clusters', 'Department Needs (Clusters)'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'Department Projects'), Icon: HandCoins },
        { to: '/results', label: t('nav_results', 'Public Results'), Icon: Award },
      ]
    }
    if (isDistrictOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'District Policymaker Dashboard'), Icon: BarChart3 },
        { to: '/priorities', label: t('nav_priorities', 'Priority Ranking (NGI)'), Icon: ListOrdered },
        { to: '/clusters', label: t('nav_clusters', 'Grouped Needs'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'Approve Projects & Budget'), Icon: HandCoins },
        { to: '/officer', label: t('nav_officer_inbox', 'District Grievance Queue'), Icon: Inbox },
      ]
    }
    if (isStateOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'State Policymaker Dashboard'), Icon: BarChart3 },
        { to: '/priorities', label: t('nav_priorities', 'Inter-District Priorities'), Icon: ListOrdered },
        { to: '/clusters', label: t('nav_clusters', 'Grouped State Needs'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'State Projects & Budget'), Icon: HandCoins },
        { to: '/officer', label: t('nav_officer_inbox', 'State Grievance Inbox'), Icon: Inbox },
        { to: '/brief', label: t('nav_brief', 'Policy Briefs'), Icon: FileText },
      ]
    }
    // Super Admin & National Admin
    const items = [
      { to: '/dashboard', label: t('nav_dashboard', 'National Policymaker Dashboard'), Icon: BarChart3 },
      { to: '/priorities', label: t('nav_priorities', 'Priority Ranking'), Icon: ListOrdered },
      { to: '/clusters', label: t('nav_clusters', 'Grouped Needs'), Icon: Layers },
      { to: '/projects', label: t('nav_projects', 'Projects & Budget Optimiser'), Icon: HandCoins },
      { to: '/ask', label: t('nav_ask', 'Ask AI Intelligence'), Icon: Sparkles },
      { to: '/officer', label: t('nav_officer_inbox', 'Grievance Review Inbox'), Icon: Inbox },
      { to: '/impact', label: t('nav_impact', 'Results & Impact'), Icon: TrendingUp },
    ]
    if (isSuperAdmin) {
      items.push({ to: '/admin/users', label: 'User & Officer Management', Icon: Users })
    }
    return items
  }

  const officialItems = buildOfficialItems()

  const openItems = [
    { to: '/brics', label: t('nav_brics', 'BRICS Comparison'), Icon: Globe2 },
    { to: '/trust', label: t('nav_trust', 'Privacy & Open Standards'), Icon: ShieldCheck },
  ]

  const auditItems = isOfficial ? [{ to: '/audit', label: t('nav_audit', 'Decision Audit Log'), Icon: ClipboardList }] : []

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{t('skip_to_main', 'Skip to main content')}</a>
      
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <Link to="/" className="brand">
          <img src="/favicon.svg" width="34" height="34" alt="" />
          <span>
            <span className="brand-name">JanSetu</span>
            <span className="brand-tag" style={{ display: 'block' }}>{t('brand_tag', "People's voice → public action")}</span>
          </span>
        </Link>

        {/* User Identity Pill in Sidebar if logged in */}
        {isLoggedIn && (
          <div style={{ padding: '8px 12px', margin: '4px 12px 14px', background: '#f8fafc', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <div className="row-between">
              <span className="xs muted mono">{isOfficial ? 'OFFICIAL PORTAL' : 'CITIZEN PORTAL'}</span>
              <span className={`badge xs ${ROLE_BADGE_STYLE[role] || 'badge-blue'}`}>
                {role.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 4 }}>{user?.name}</div>
            <div className="xs muted">
              {user?.state ? `📍 ${user.state}${user?.district ? ` · ${user.district}` : ''}` : '🌐 National Master'}
              {user?.department ? ` · ${user.department.toUpperCase()}` : ''}
            </div>
          </div>
        )}

        {/* Dynamic Groups */}
        {!isOfficial && (
          <Group title={t('nav_for_citizens', 'For Citizens')} items={citizenItems} />
        )}

        {isOfficial && (
          <Group
            title={
              isSuperAdmin ? 'Super Admin Portal' :
              isStateOfficer ? `${user?.state || 'State'} Grievances` :
              isDistrictOfficer ? `${user?.district || 'District'} Administration` :
              isDeptOfficer ? `${user?.department?.toUpperCase() || 'Department'} Queue` :
              'Official Portal'
            }
            items={officialItems}
          />
        )}

        {!isLoggedIn && (
          <nav className="nav-group" aria-label="Portals">
            <div className="nav-title">{t('nav_portals', 'Portals & Login')}</div>
            <NavLink to="/login?tab=citizen" className="nav-link">
              <UserCheck size={18} aria-hidden="true" />
              <span>{t('citizen_login', 'Citizen Login')}</span>
            </NavLink>
            <div className="xs muted" style={{ padding: '2px 14px 8px', fontSize: '0.72rem', lineHeight: 1.4, color: '#64748b' }}>
              {t('citizen_login_note', 'Login is optional — only needed if you want to see all your past requests together in one place.')}
            </div>
            <NavLink to="/login?tab=officer" className="nav-link">
              <Lock size={18} aria-hidden="true" />
              <span>{t('official_login', 'Officer Login')}</span>
            </NavLink>
          </nav>
        )}

        <Group
          title={t('nav_open_to_all', 'Transparency & Standards')}
          items={[...openItems, ...auditItems]}
        />

        <div className="nav-foot">
          {t('nav_footer', 'Open source · Digital Public Good')}
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      {/* Main Content Area */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="btn btn-icon btn-ghost menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
          </div>

          <div className="topbar-controls">
            {/* Accessibility Toolbar */}
            <div className="row small" style={{ gap: 4, background: '#f1f5f9', padding: '2px 6px', borderRadius: 8 }} aria-label="Accessibility options">
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => changeFontSize(-1)}
                title="Decrease font size"
                aria-label="Decrease font size"
                style={{ padding: '2px 6px', fontWeight: 700 }}
              >
                A-
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => changeFontSize(1)}
                title="Increase font size"
                aria-label="Increase font size"
                style={{ padding: '2px 6px', fontWeight: 700 }}
              >
                A+
              </button>
              <button
                type="button"
                className={`btn btn-xs ${highContrast ? 'btn-primary' : 'btn-ghost'}`}
                onClick={toggleHighContrast}
                title="Toggle high contrast"
                aria-label="Toggle high contrast"
                style={{ padding: '2px 6px' }}
              >
                <Eye size={13} aria-hidden="true" />
                <span className="xs">Contrast</span>
              </button>
              <button
                type="button"
                className={`btn btn-xs ${readingAloud ? 'btn-primary' : 'btn-ghost'}`}
                onClick={readPageAloud}
                title="Read page aloud"
                aria-label="Read this page aloud"
                style={{ padding: '2px 6px' }}
              >
                <Volume2 size={13} aria-hidden="true" />
                <span className="xs">{readingAloud ? 'Stop' : 'Read'}</span>
              </button>
            </div>

            {/* Language Selector */}
            <label className="row small">
              <span className="muted">{t('language', 'Language')}</span>
              <select className="select" style={{ minHeight: 36, width: 'auto' }} value={uiLang} onChange={(e) => setUiLang(e.target.value)}>
                {Object.entries(UI_LANGS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            {/* Country Selector for Officials */}
            {isOfficial && isSuperAdmin && (
              <label className="row small">
                <span className="muted">{t('country', 'Country')}</span>
                <select className="select" style={{ minHeight: 36, width: 'auto' }} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="all">{t('all', 'All Nodes')}</option>
                  <option value="IN">India</option>
                  <option value="BR">Brazil</option>
                  <option value="ZA">South Africa</option>
                </select>
              </label>
            )}

            {/* User Login/Logout Status */}
            {isLoggedIn ? (
              <div className="row">
                <span className="user-chip">
                  <UserRound size={16} aria-hidden="true" />
                  <span>
                    <strong>{user?.name}</strong>
                    <span className="xs muted" style={{ display: 'block' }}>
                      {ROLE_DISPLAY_NAMES[role] || user?.title || role}
                      {user?.state && ` (${user.state}${user.district ? ` · ${user.district}` : ''})`}
                    </span>
                  </span>
                </span>
                <button className="btn btn-sm btn-ghost" onClick={logout} title={t('logout', 'Log out')}>
                  <LogOut size={16} aria-hidden="true" />
                  {t('logout', 'Log out')}
                </button>
              </div>
            ) : (
              <div className="row" style={{ gap: 6 }}>
                <Link to="/login?tab=citizen" className="btn btn-sm btn-ghost">
                  <UserCheck size={15} aria-hidden="true" />
                  {t('citizen_login', 'Citizen Login')}
                </Link>
                <Link to="/login?tab=officer" className="btn btn-sm btn-primary">
                  <Lock size={15} aria-hidden="true" />
                  {t('official_login', 'Officer Login')}
                </Link>
              </div>
            )}
          </div>
        </header>

        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>

        {/* Global Government Platform Footer */}
        <footer className="gov-footer" role="contentinfo">
          <div className="gov-footer-grid">
            {/* 1. Government Branding & Digital Public Good */}
            <div>
              <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                <img src="/favicon.svg" width="32" height="32" alt="Government Emblem" />
                <div>
                  <strong style={{ fontSize: '1.05rem', color: '#fff' }}>JanSetu Platform</strong>
                  <span className="xs muted" style={{ display: 'block' }}>Digital Public Good · Open Source</span>
                </div>
              </div>
              <p className="small" style={{ color: '#cbd5e1', lineHeight: 1.5, margin: 0 }}>
                Recognized open-source citizen grievance redressal & demand intelligence system. Bridging community voice to public infrastructure planning across India and BRICS partner nations.
              </p>
              <div className="xs muted" style={{ marginTop: 8 }}>
                Ministry of Rural Development & Panchayati Raj · Government of India
              </div>
            </div>

            {/* 2. Official Contact & Helpline */}
            <div>
              <h4>Official Helpline & Support</h4>
              <ul className="stack-xs" style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                <li style={{ color: '#cbd5e1' }}>📞 <strong>Toll-Free:</strong> 1800-111-222 (24x7 National Helpline)</li>
                <li style={{ color: '#cbd5e1' }}>💬 <strong>WhatsApp Bot:</strong> +91 90000 11111</li>
                <li style={{ color: '#cbd5e1' }}>✉️ <strong>Grievance Desk:</strong> support@jansetu.gov.in</li>
                <li style={{ color: '#cbd5e1' }}>🏢 <strong>National Cell:</strong> Krishi Bhawan, New Delhi 110001</li>
              </ul>
            </div>

            {/* 3. Quick Links & Compliance */}
            <div>
              <h4>Transparency & Governance</h4>
              <ul className="stack-xs" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li><Link to="/results">Public Results & SLA Redressal</Link></li>
                <li><Link to="/trust">DPDP Act 2023 Privacy & Retention</Link></li>
                <li><Link to="/trust">Open Standards & Data Integrity</Link></li>
                <li><Link to="/brics">BRICS Interoperability Framework</Link></li>
                <li><Link to="/channels">WhatsApp & IVR Simulation</Link></li>
              </ul>
            </div>

            {/* 4. Report Platform Bug */}
            <div>
              <h4>Platform Feedback</h4>
              <p className="small" style={{ color: '#cbd5e1', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                Found a technical bug, translation error, or accessibility barrier in JanSetu itself?
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#60a5fa', color: '#93c5fd' }}
                onClick={() => setBugModalOpen(true)}
              >
                🛠️ Report a Problem About JanSetu
              </button>
            </div>
          </div>

          <div className="gov-footer-bottom">
            <div>
              © 2026 JanSetu · Developed under India's Digital Public Infrastructure (DPI) & BRICS Open Tech Framework.
            </div>
            <div className="xs" style={{ color: '#64748b' }}>
              Compliant with Digital Personal Data Protection (DPDP) Act 2023 & WCAG 2.1 AA Accessibility Guidelines.
            </div>
          </div>
        </footer>

        {/* Modal: Report an Issue ABOUT the JanSetu Platform */}
        <Modal
          isOpen={bugModalOpen}
          onClose={() => setBugModalOpen(false)}
          title="Report a Problem About the JanSetu Platform"
          maxWidth={540}
        >
          {bugSubmitted ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
              <h3 style={{ margin: '0 0 6px 0', color: '#16a34a' }}>Platform Feedback Logged!</h3>
              <p className="small muted">
                Ticket <strong>PL-{Math.floor(100000 + Math.random() * 900000)}</strong> has been registered with the open source developer team. Thank you for making JanSetu better.
              </p>
            </div>
          ) : (
            <form onSubmit={handleBugSubmit} className="stack-md">
              <p className="small muted" style={{ margin: 0 }}>
                This form is for reporting bugs or usability issues <strong>ABOUT the JanSetu website or software</strong> (e.g. microphone not working, translation typo, UI broken on phone). For water, roads, electricity grievances, please use "Report a problem".
              </p>

              <div className="field">
                <label>Issue Type</label>
                <select className="select" value={bugType} onChange={(e) => setBugType(e.target.value)}>
                  <option value="bug">Technical Bug / Button not working</option>
                  <option value="translation">Incorrect Translation / Language Error</option>
                  <option value="accessibility">Accessibility Barrier (Screen reader / font / contrast)</option>
                  <option value="suggestion">Feature Suggestion or UX Improvement</option>
                </select>
              </div>

              <div className="field">
                <label>Describe the issue with the platform</label>
                <textarea
                  className="input"
                  rows={4}
                  required
                  placeholder="Example: When I switched to Telugu on mobile, the submit button shifted off-screen..."
                  value={bugDesc}
                  onChange={(e) => setBugDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Your email (optional, for engineering team follow-up)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="name@example.com"
                  value={bugEmail}
                  onChange={(e) => setBugEmail(e.target.value)}
                />
              </div>

              <div className="row-between" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setBugModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Platform Report
                </button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  )
}
