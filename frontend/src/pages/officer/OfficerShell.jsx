import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield, MapPin, Building, User, LogOut, Menu, X, ChevronRight,
  Inbox, Users, CheckCircle, FolderPlus, FileText, BarChart3,
  Layers, DollarSign, UserCheck, AlertTriangle, Globe, Bell,
  Search, Eye, Sun, Moon, Type, HelpCircle, FileCheck, Check,
  Clock, ArrowUpRight, Compass, ShieldAlert, BookOpen
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { Badge, Modal } from '../../components/ui'
import { api } from '../../api/client'

export default function OfficerShell({
  roleTitle,
  jurisdictionText,
  navItems,
  activeNav,
  onNavChange,
  children,
  badgeTone = 'blue',
  kpis = null,
}) {
  const { user, role, logout, t } = useApp()
  const nav = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef(null)

  // Accessibility State
  const [fontSizeScale, setFontSizeScale] = useState(100)
  const [highContrast, setHighContrast] = useState(false)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [resourcesData, setResourcesData] = useState(null)
  const [escalationMatrixOpen, setEscalationMatrixOpen] = useState(false)

  // Fetch Notifications
  const loadNotifications = () => {
    api.officerNotifications().then((res) => {
      setNotifs(res.notifications || [])
      setUnreadCount(res.unread_count || 0)
    }).catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
    const timer = setInterval(loadNotifications, 15000)
    return () => clearInterval(timer)
  }, [])

  // Close search when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle Global Search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    setSearchBusy(true)
    const timeout = setTimeout(() => {
      api.officerSearch(searchQuery).then((res) => {
        setSearchResults(res.results || [])
        setSearchOpen(true)
      }).catch(() => {
        setSearchResults([])
      }).finally(() => {
        setSearchBusy(false)
      })
    }, 250)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  // Open Resources Modal
  const handleOpenResources = () => {
    if (!resourcesData) {
      api.officerResources().then(setResourcesData).catch(() => {})
    }
    setResourcesOpen(true)
  }

  // Mark all notifs as read
  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead()
    setUnreadCount(0)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  // Compute Clean Scope Breadcrumbs (D3 fix)
  const renderScopeBreadcrumbs = () => {
    if (role === 'super_admin' || role === 'admin') {
      return <span><strong>India</strong> › All States & Union Territories</span>
    }
    if (role === 'state_officer') {
      return <span><strong>India</strong> › <strong>{user?.state || 'Telangana'}</strong> › All Districts</span>
    }
    if (role === 'district_officer') {
      return <span><strong>India</strong> › {user?.state || 'Telangana'} › <strong>{user?.district || 'Adilabad'}</strong> › All Departments</span>
    }
    if (role === 'dept_officer') {
      return <span><strong>India</strong> › {user?.state || 'Telangana'} › {user?.district || 'Adilabad'} › <strong>{(user?.department || 'Water').toUpperCase()}</strong></span>
    }
    if (role === 'field_officer') {
      return <span><strong>India</strong> › {user?.state || 'Telangana'} › {user?.district || 'Adilabad'} › <strong>Block {user?.block || 'Utnoor'}</strong> ({user?.department || 'Water'})</span>
    }
    return <span>{jurisdictionText || 'All India'}</span>
  }

  return (
    <div
      className={`officer-shell-container ${highContrast ? 'high-contrast-mode' : ''}`}
      style={{
        display: 'flex',
        minHeight: 'calc(100vh - 70px)',
        background: highContrast ? '#000' : 'var(--color-bg)',
        color: highContrast ? '#fff' : 'inherit',
        fontSize: `${fontSizeScale}%`,
      }}
    >
      {/* Mobile Sidebar Backdrop */}
      {mobileOpen && (
        <div
          className="officer-backdrop"
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`officer-sidebar ${mobileOpen ? 'open' : ''}`}
        style={{
          width: 270,
          borderRight: highContrast ? '2px solid #fff' : '1px solid var(--color-border)',
          background: highContrast ? '#111' : 'var(--color-surface)',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          flexShrink: 0,
          transition: 'transform 0.2s ease',
          zIndex: 999,
        }}
      >
        <div className="row-between mb">
          <div className="row" style={{ gap: 8 }}>
            <Shield size={22} color={highContrast ? '#38bdf8' : 'var(--color-primary)'} />
            <strong style={{ fontSize: 16, color: highContrast ? '#fff' : '#0f172a' }}>
              JanSetu Command
            </strong>
          </div>
          <button
            className="btn btn-ghost btn-sm hide-desktop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Badge Info Card with WCAG 2.1 AA Contrast (D4 Fix) */}
        <div
          style={{
            padding: '14px 14px',
            background: highContrast ? '#1e293b' : '#f8fafc',
            borderRadius: 8,
            border: highContrast ? '1px solid #94a3b8' : '1px solid #cbd5e1',
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, color: highContrast ? '#fff' : '#0f172a', fontSize: 14 }}>
            {user?.name || 'Administrative Official'}
          </div>
          <div style={{ color: highContrast ? '#cbd5e1' : '#334155', marginTop: 2, fontWeight: 500 }}>
            {user?.title || roleTitle}
          </div>
          <div className="row mt-xs" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                padding: '2px 8px',
                borderRadius: 4,
                background: highContrast ? '#0f766e' : '#e0f2fe',
                color: highContrast ? '#fff' : '#0369a1',
                fontWeight: 600,
                fontSize: 11,
              }}
            >
              <MapPin size={11} />
              {jurisdictionText || 'All India'}
            </span>
            {user?.department && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: highContrast ? '#334155' : '#f1f5f9',
                  color: highContrast ? '#fff' : '#334155',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                <Building size={11} />
                {user.department.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Primary Role Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginTop: 4 }}>
          {navItems.map((item) => {
            const Icon = item.icon || Inbox
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavChange(item.id)
                  setMobileOpen(false)
                }}
                className={`officer-nav-btn ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: isActive ? (highContrast ? '#2563eb' : 'var(--color-primary)') : 'transparent',
                  color: isActive ? '#fff' : (highContrast ? '#e2e8f0' : '#1e293b'),
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} opacity={isActive ? 1 : 0.85} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : (item.urgent ? '#fee2e2' : '#e2e8f0'),
                      color: isActive ? '#fff' : (item.urgent ? '#dc2626' : '#0f172a'),
                      padding: '2px 7px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer: Resources, Escalation Matrix & More Section (D6 Fix) */}
        <div style={{ paddingTop: 12, borderTop: highContrast ? '1px solid #475569' : '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={handleOpenResources}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: highContrast ? '#cbd5e1' : '#475569', fontSize: 13 }}
          >
            <BookOpen size={15} />
            <span>SOPs & Resource Center</span>
          </button>

          <button
            onClick={() => setEscalationMatrixOpen(true)}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: highContrast ? '#cbd5e1' : '#475569', fontSize: 13 }}
          >
            <ShieldAlert size={15} />
            <span>Escalation Matrix</span>
          </button>

          <Link
            to="/brics"
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: highContrast ? '#cbd5e1' : '#475569', fontSize: 13 }}
          >
            <Globe size={15} />
            <span>BRICS Public Hub</span>
          </Link>

          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', color: '#dc2626', marginTop: 4, fontWeight: 600 }}
          >
            <LogOut size={15} />
            <span>{t('logout', 'Log out')}</span>
          </button>
        </div>
      </aside>

      {/* Main Command Center Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Operational Header Bar */}
        <header
          style={{
            padding: '12px 24px',
            borderBottom: highContrast ? '2px solid #fff' : '1px solid var(--color-border)',
            background: highContrast ? '#111' : 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div className="row" style={{ gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm hide-desktop"
              onClick={() => setMobileOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: highContrast ? '#fff' : '#0f172a' }}>
                {roleTitle}
              </div>
              <div className="xs muted row" style={{ gap: 6, color: highContrast ? '#cbd5e1' : '#475569', marginTop: 1 }}>
                <Compass size={12} />
                <span>Scope: {renderScopeBreadcrumbs()}</span>
              </div>
            </div>
          </div>

          {/* Search, Notifications & Accessibility Controls */}
          <div className="row" style={{ gap: 10, position: 'relative' }}>
            {/* Global Scoped Search Bar */}
            <div ref={searchRef} style={{ position: 'relative', width: 260 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: highContrast ? '#1e293b' : '#f1f5f9',
                  borderRadius: 6,
                  padding: '6px 10px',
                  gap: 6,
                  border: highContrast ? '1px solid #64748b' : '1px solid #cbd5e1',
                }}
              >
                <Search size={14} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search tracking ID or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: 12,
                    outline: 'none',
                    width: '100%',
                    color: highContrast ? '#fff' : '#0f172a',
                  }}
                />
              </div>

              {/* Search Dropdown Results */}
              {searchOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: 320,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    marginTop: 6,
                    maxHeight: 350,
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: 8,
                  }}
                >
                  <div className="xs muted mono mb-xs">
                    {searchBusy ? 'Searching scope...' : `${searchResults.length} grievances found`}
                  </div>
                  {searchResults.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSearchOpen(false)
                        setSearchQuery('')
                        nav(`/track/${r.tracking_id}`)
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      className="hover-card"
                    >
                      <div className="row-between">
                        <strong className="xs mono" style={{ color: 'var(--color-primary)' }}>{r.tracking_id}</strong>
                        <span className="badge xs badge-blue">{r.category}</span>
                      </div>
                      <div className="small" style={{ marginTop: 2 }}>{r.text?.slice(0, 50)}...</div>
                    </div>
                  ))}
                  {searchResults.length === 0 && !searchBusy && (
                    <div className="small muted p-sm text-center">No matching grievances in your jurisdiction scope.</div>
                  )}
                </div>
              )}
            </div>

            {/* In-App Live Notifications Center */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notification center"
                style={{ position: 'relative', padding: '6px 10px' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: 10,
                      padding: '1px 5px',
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: 340,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    marginTop: 6,
                    maxHeight: 400,
                    overflowY: 'auto',
                    zIndex: 1000,
                    padding: 12,
                  }}
                >
                  <div className="row-between mb-sm">
                    <strong className="small">Notifications ({unreadCount} unread)</strong>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="btn btn-ghost btn-xs">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {notifs.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 6,
                          background: n.is_read ? 'transparent' : '#f0f9ff',
                          border: '1px solid',
                          borderColor: n.is_read ? 'var(--color-border)' : '#bae6fd',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{n.title}</div>
                        <div style={{ color: '#475569', marginTop: 2 }}>{n.message}</div>
                        <div className="row-between mt-xs xs muted">
                          <span>{n.created_at?.slice(0, 10)}</span>
                          <span className="mono">{n.type}</span>
                        </div>
                      </div>
                    ))}
                    {notifs.length === 0 && (
                      <div className="small muted text-center p-md">No new operational alerts.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Accessibility Menu (Font Sizing & High Contrast) */}
            <div className="row" style={{ gap: 4 }}>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setFontSizeScale(prev => Math.max(85, prev - 10))}
                title="Decrease font size"
              >
                A-
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setFontSizeScale(prev => Math.min(130, prev + 10))}
                title="Increase font size"
              >
                A+
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setHighContrast(!highContrast)}
                title="Toggle High Contrast Mode"
              >
                {highContrast ? <Sun size={14} /> : <Moon size={14} />}
              </button>
            </div>
          </div>
        </header>

        {/* Live KPI Strip */}
        {kpis && (
          <div
            style={{
              padding: '16px 24px 0 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
            }}
          >
            {kpis}
          </div>
        )}

        {/* Dynamic Role View Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {children}
        </div>
      </main>

      {/* Resources & SOPs Modal */}
      {resourcesOpen && (
        <Modal title="Government SOPs, Policies & Guidelines" onClose={() => setResourcesOpen(false)}>
          <div className="stack" style={{ gap: 14 }}>
            <p className="small muted">
              Official operating standards, grievance redressal policy, and field protocols for JanSetu administrative officials.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(resourcesData?.documents || []).map((d) => (
                <div key={d.id} className="card stack" style={{ padding: 12, border: '1px solid var(--color-border)' }}>
                  <div className="row-between">
                    <strong>{d.title}</strong>
                    <span className="badge xs badge-blue">{d.category.toUpperCase()} ({d.version})</span>
                  </div>
                  <div className="small muted">{d.description}</div>
                  <div className="row-between mt-xs xs">
                    <span className="muted">Effective Date: {d.created_at?.slice(0, 10)}</span>
                    <a href="#" className="row" style={{ gap: 4, color: 'var(--color-primary)', fontWeight: 600 }}>
                      Download Official SOP <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Escalation Matrix Modal */}
      {escalationMatrixOpen && (
        <Modal title="Multi-Tier Redressal Escalation Matrix" onClose={() => setEscalationMatrixOpen(false)}>
          <div className="stack" style={{ gap: 14 }}>
            <p className="small muted">
              Statutory operational resolution windows and responsibilities across the 5 administrative tiers:
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Authority</th>
                    <th>Responsibility</th>
                    <th>Resolution Window</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: role === 'field_officer' ? '#f0f9ff' : 'transparent' }}>
                    <td><strong>Level 1</strong></td>
                    <td>Field Officer</td>
                    <td>Site visit, physical verification, geotagged proof submission</td>
                    <td>2 to 7 days by urgency</td>
                  </tr>
                  <tr style={{ background: role === 'dept_officer' ? '#f0f9ff' : 'transparent' }}>
                    <td><strong>Level 2</strong></td>
                    <td>Department Officer</td>
                    <td>Triage, assign, review proof, handle disputes & proposals</td>
                    <td>Up to 7 days</td>
                  </tr>
                  <tr style={{ background: role === 'district_officer' ? '#f0f9ff' : 'transparent' }}>
                    <td><strong>Level 3</strong></td>
                    <td>District Collector / DM</td>
                    <td>Cross-department action, show-cause, Jan Sunwai hearings</td>
                    <td>7 to 14 days</td>
                  </tr>
                  <tr style={{ background: role === 'state_officer' ? '#f0f9ff' : 'transparent' }}>
                    <td><strong>Level 4</strong></td>
                    <td>State Officer (Appeals Desk)</td>
                    <td>Second-tier appeals against district decisions & circulars</td>
                    <td>15 to 30 days</td>
                  </tr>
                  <tr style={{ background: (role === 'admin' || role === 'super_admin') ? '#f0f9ff' : 'transparent' }}>
                    <td><strong>Audit</strong></td>
                    <td>National Admin</td>
                    <td>System audit, global rules, security & central grants</td>
                    <td>Continuous</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
