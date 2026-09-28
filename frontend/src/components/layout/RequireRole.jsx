import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LogIn, Lock } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function RequireRole({ children, roles = [], permission = null }) {
  const { user, isLoggedIn, isOfficial, isSuperAdmin, role, hasPermission, t } = useApp()
  const loc = useLocation()

  // 1. Not logged in at all
  if (!isLoggedIn) {
    return (
      <div className="card text-center" style={{ maxWidth: 540, margin: '40px auto', padding: 32 }}>
        <div style={{ display: 'inline-flex', padding: 14, background: '#eff6ff', borderRadius: '50%', color: 'var(--color-accent)', marginBottom: 16 }}>
          <Lock size={32} aria-hidden="true" />
        </div>
        <h2>{t('login_required', 'Login Required')}</h2>
        <p className="muted small mt-xs">
          {t('login_required_desc', 'You need an authorized account to access this administrative portal.')}
        </p>
        <div className="row justify-center mt-lg" style={{ justifyContent: 'center' }}>
          <Link to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} className="btn btn-primary">
            <LogIn size={18} aria-hidden="true" /> {t('go_to_login', 'Go to Login')}
          </Link>
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft size={16} aria-hidden="true" /> {t('back_to_home', 'Back to Home')}
          </Link>
        </div>
      </div>
    )
  }

  // 2. Super Admin has unrestricted access to everything
  if (isSuperAdmin) {
    return children
  }

  // 3. Check role requirement
  const allowed = Array.isArray(roles) ? roles : [roles]
  const roleMatch = allowed.length === 0 || allowed.includes(role) || (allowed.includes('admin') && ['admin', 'super_admin', 'national'].includes(role))

  // 4. Check permission requirement
  const permMatch = !permission || hasPermission(permission)

  if (!roleMatch || !permMatch) {
    return (
      <div className="card highlight text-center" style={{ maxWidth: 600, margin: '40px auto', padding: 32, borderColor: '#fca5a5' }}>
        <div style={{ display: 'inline-flex', padding: 14, background: '#fef2f2', borderRadius: '50%', color: '#dc2626', marginBottom: 16 }}>
          <ShieldAlert size={36} aria-hidden="true" />
        </div>
        <h2 style={{ color: '#991b1b' }}>{t('access_denied', 'Access Denied')}</h2>
        <p className="muted small mt-xs">
          {t('access_denied_desc', 'Your current role')} (<strong>{role.replace(/_/g, ' ').toUpperCase()}</strong>) {t('not_authorized_for_page', 'does not have sufficient administrative permissions to access this page.')}
        </p>
        
        <div className="alert alert-info mt-md" style={{ textAlign: 'left' }}>
          <div className="xs">
            <strong>Required Role(s):</strong> {allowed.map(r => r.replace(/_/g, ' ')).join(', ') || 'Higher Administrative Rank'}<br />
            {user?.state && <span><strong>Your Jurisdiction:</strong> {user.state} {user.district ? `· ${user.district}` : ''}</span>}
          </div>
        </div>

        <div className="row justify-center mt-lg" style={{ justifyContent: 'center', gap: 12 }}>
          <Link to={isOfficial ? "/dashboard" : "/track"} className="btn btn-primary">
            {t('go_to_my_dashboard', 'Go to My Portal')}
          </Link>
          <Link to="/login" className="btn btn-ghost">
            {t('switch_account', 'Switch Account')}
          </Link>
        </div>
      </div>
    )
  }

  return children
}

export function RequireOfficial({ children }) {
  const { isOfficial } = useApp()
  const loc = useLocation()
  
  if (!isOfficial) {
    return (
      <div className="card text-center" style={{ maxWidth: 540, margin: '40px auto', padding: 32 }}>
        <div style={{ display: 'inline-flex', padding: 14, background: '#eff6ff', borderRadius: '50%', color: 'var(--color-accent)', marginBottom: 16 }}>
          <Lock size={32} aria-hidden="true" />
        </div>
        <h2>{t('official_portal', 'Official Portal')}</h2>
        <p className="muted small mt-xs">
          {t('official_portal_desc', 'This section is strictly reserved for government officials and grievance redressal officers.')}
        </p>
        <div className="row justify-center mt-lg" style={{ justifyContent: 'center', gap: 12 }}>
          <Link to={`/login?tab=officer&next=${encodeURIComponent(loc.pathname + loc.search)}`} className="btn btn-primary">
            <LogIn size={18} aria-hidden="true" /> {t('officer_login', 'Officer Login')}
          </Link>
          <Link to="/report" className="btn btn-ghost">
            {t('citizen_report_link', 'I am a Citizen')}
          </Link>
        </div>
      </div>
    )
  }
  return children
}

export function RequireCitizen({ children }) {
  const { userType, isOfficial } = useApp()
  return children
}
