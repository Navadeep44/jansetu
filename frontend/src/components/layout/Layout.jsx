import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Award, BarChart3, Building2, ClipboardList, FileText, Globe2,
  HandCoins, Home, Inbox, Layers, ListOrdered, Lock, LogIn, LogOut,
  MapPin, Megaphone, Menu, MessageCircle, SearchCheck, ShieldAlert,
  ShieldCheck, Sparkles, TrendingUp, UserCheck, UserPlus, UserRound, Users
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS } from '../../i18n/strings'
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
        { to: '/officer', label: t('nav_officer_inbox', 'Field Tasks & Proof Upload'), Icon: Inbox },
        { to: '/results', label: t('nav_results', 'Public Results'), Icon: Award },
      ]
    }
    if (isDeptOfficer) {
      return [
        { to: '/officer', label: t('nav_officer_inbox', 'Department Grievance Queue'), Icon: Inbox },
        { to: '/clusters', label: t('nav_clusters', 'Department Needs (Clusters)'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'Department Projects'), Icon: HandCoins },
        { to: '/results', label: t('nav_results', 'Public Results'), Icon: Award },
      ]
    }
    if (isDistrictOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'District Dashboard'), Icon: BarChart3 },
        { to: '/priorities', label: t('nav_priorities', 'Priority Ranking (NGI)'), Icon: ListOrdered },
        { to: '/clusters', label: t('nav_clusters', 'Grouped Needs'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'Approve Projects & Budget'), Icon: HandCoins },
        { to: '/officer', label: t('nav_officer_inbox', 'District Grievance Queue'), Icon: Inbox },
      ]
    }
    if (isStateOfficer) {
      return [
        { to: '/dashboard', label: t('nav_dashboard', 'State Dashboard'), Icon: BarChart3 },
        { to: '/priorities', label: t('nav_priorities', 'Inter-District Priorities'), Icon: ListOrdered },
        { to: '/clusters', label: t('nav_clusters', 'Grouped State Needs'), Icon: Layers },
        { to: '/projects', label: t('nav_projects', 'State Projects & Budget'), Icon: HandCoins },
        { to: '/officer', label: t('nav_officer_inbox', 'State Grievance Inbox'), Icon: Inbox },
        { to: '/brief', label: t('nav_brief', 'Policy Briefs'), Icon: FileText },
      ]
    }
    // Super Admin & National Admin
    const items = [
      { to: '/dashboard', label: t('nav_dashboard', 'National Dashboard'), Icon: BarChart3 },
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
              {t('citizen_login', 'Citizen Login')}
            </NavLink>
            <NavLink to="/login?tab=officer" className="nav-link">
              <Lock size={18} aria-hidden="true" />
              {t('official_login', 'Officer Login')}
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
      </div>
    </div>
  )
}
