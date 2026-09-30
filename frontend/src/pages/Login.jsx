import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2, CheckCircle2, Copy, Info, KeyRound, Lock, LogIn,
  MapPin, Megaphone, Phone, ShieldAlert, ShieldCheck, Sparkles, UserCheck, UserPlus, Users
} from 'lucide-react'
import { api } from '../api/client'
import { useApp } from '../context/AppContext'
import { Badge, Card, ErrorBox, Tabs } from '../components/ui'

const DEFAULT_ROLES = [
  {
    role: 'super_admin',
    label: '👑 Super Admin (National Master)',
    description: 'Full unrestricted master access across all states, departments, users, and audit logs.',
    defaultUsername: 'superadmin',
    defaultPassword: 'admin123',
    jurisdictionNote: 'National (All States & Departments)',
  },
  {
    role: 'admin',
    label: '🏛️ National Admin / Planner',
    description: 'National Planning Commission, policy briefs, budget optimizer, and BRICS analytics.',
    defaultUsername: 'national_admin',
    defaultPassword: 'admin123',
    jurisdictionNote: 'National Planning Commission',
  },
  {
    role: 'state_officer',
    label: '🚩 State Grievance Officer',
    description: 'State-level oversight. Monitors all districts, inter-district priorities, and state schemes.',
    defaultUsername: 'state_telangana',
    defaultPassword: 'state123',
    jurisdictionNote: 'Telangana State',
    state: 'Telangana',
  },
  {
    role: 'district_officer',
    label: '🏢 District Collector / Magistrate',
    description: 'Approves local projects, monitors district grievance redressal, and allocates budget.',
    defaultUsername: 'collector_adilabad',
    defaultPassword: 'district123',
    jurisdictionNote: 'Adilabad District (Telangana)',
    state: 'Telangana',
    district: 'Adilabad',
  },
  {
    role: 'dept_officer',
    label: '💧 Department Officer (Water / PWD)',
    description: 'Manages department complaints, reviews field proofs, and assigns tasks to engineers.',
    defaultUsername: 'dept_water_tg',
    defaultPassword: 'dept123',
    jurisdictionNote: 'Water Supply (Telangana · Adilabad)',
    state: 'Telangana',
    district: 'Adilabad',
    department: 'water',
  },
  {
    role: 'field_officer',
    label: '👷 Field Redressal Officer / Engineer',
    description: 'On-site engineer. Resolves complaints and uploads mandatory geo-tagged photo proofs.',
    defaultUsername: 'field_utnoor',
    defaultPassword: 'field123',
    jurisdictionNote: 'Utnoor Block (Adilabad · Water)',
    state: 'Telangana',
    district: 'Adilabad',
    department: 'water',
  },
]

const ALL_OFFICER_DEMOS = [
  {
    role: 'super_admin',
    roleLabel: 'Super Admin',
    name: 'Dr. Rajeshwar Rao',
    title: 'Principal Secretary & Chief Administrator',
    username: 'superadmin',
    password: 'admin123',
    jurisdiction: 'National (All States)',
    dept: 'All Depts',
    badge: 'badge-red',
  },
  {
    role: 'admin',
    roleLabel: 'National Admin',
    name: 'Dr. S. Menon',
    title: 'National Planning Commission Director',
    username: 'national_admin',
    password: 'admin123',
    jurisdiction: 'National Commission',
    dept: 'Planning',
    badge: 'badge-blue',
  },
  {
    role: 'state_officer',
    roleLabel: 'State Officer (TG)',
    name: 'K. Chandrasekhar Reddy',
    title: 'State Grievance Commissioner, Telangana',
    username: 'state_telangana',
    password: 'state123',
    jurisdiction: 'Telangana State',
    dept: 'State Cell',
    badge: 'badge-amber',
  },
  {
    role: 'state_officer',
    roleLabel: 'State Officer (DL)',
    name: 'Priya Sharma, IAS',
    title: 'Special Secretary (Grievances), Govt of NCT Delhi',
    username: 'state_delhi',
    password: 'state123',
    jurisdiction: 'Delhi State (NCT)',
    dept: 'State Cell',
    badge: 'badge-amber',
  },
  {
    role: 'district_officer',
    roleLabel: 'District Collector (TG)',
    name: 'Anitha Rao, IAS',
    title: 'District Collector & Magistrate, Adilabad',
    username: 'collector_adilabad',
    password: 'district123',
    jurisdiction: 'Adilabad, Telangana',
    dept: 'District Admin',
    badge: 'badge-green',
  },
  {
    role: 'district_officer',
    roleLabel: 'District Magistrate (DL)',
    name: 'Amit Saxena, IAS',
    title: 'District Magistrate, South Delhi',
    username: 'dm_southdelhi',
    password: 'district123',
    jurisdiction: 'South Delhi, Delhi',
    dept: 'District Admin',
    badge: 'badge-green',
  },
  {
    role: 'dept_officer',
    roleLabel: 'Dept Officer (Water)',
    name: 'Er. P. Venkatesh',
    title: 'Superintending Engineer, Mission Bhagiratha',
    username: 'dept_water_tg',
    password: 'dept123',
    jurisdiction: 'Telangana · Adilabad',
    dept: 'Water Supply',
    badge: 'badge-violet',
  },
  {
    role: 'dept_officer',
    roleLabel: 'Dept Officer (PWD)',
    name: 'Er. Sanjeev Gupta',
    title: 'Executive Engineer, PWD Delhi',
    username: 'dept_pwd_delhi',
    password: 'dept123',
    jurisdiction: 'Delhi · South Delhi',
    dept: 'PWD / Roads',
    badge: 'badge-violet',
  },
  {
    role: 'field_officer',
    roleLabel: 'Field Officer (Utnoor)',
    name: 'Ravi Teja',
    title: 'Assistant Engineer / Field Redressal Officer',
    username: 'field_utnoor',
    password: 'field123',
    jurisdiction: 'Utnoor, Adilabad',
    dept: 'Water Supply',
    badge: 'badge-blue',
  },
  {
    role: 'field_officer',
    roleLabel: 'Field Officer (Mehrauli)',
    name: 'Vikram Singh',
    title: 'Junior Engineer / Field Redressal Officer',
    username: 'field_mehrauli',
    password: 'field123',
    jurisdiction: 'Mehrauli, South Delhi',
    dept: 'PWD / Roads',
    badge: 'badge-blue',
  },
]

const ALL_CITIZEN_DEMOS = [
  {
    username: 'citizen_ramesh',
    password: 'citizen123',
    phone: '+91 98111 22233',
    name: 'Ramesh Kumar',
    title: 'Resident, South Delhi',
    jurisdiction: 'South Delhi, Delhi',
  },
  {
    username: 'citizen_lakshmi',
    password: 'citizen123',
    phone: '+91 94400 55667',
    name: 'Lakshmi Bai',
    title: 'Resident, Utnoor, Adilabad',
    jurisdiction: 'Adilabad, Telangana',
  },
]

export default function Login() {
  const {
    login, officerLogin, citizenLogin, citizenRegister,
    isLoggedIn, isOfficial, isCitizen, role, t
  } = useApp()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()

  const defaultTab = sp.get('tab') === 'citizen' ? 'citizen' : 'officer'
  const [tab, setTab] = useState(defaultTab)
  const next = sp.get('next')

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (next) {
        nav(next, { replace: true })
      } else if (isOfficial) {
        nav('/officer', { replace: true })
      } else {
        nav('/track', { replace: true })
      }
    }
  }, [isLoggedIn, isOfficial, role, next, nav])

  // Citizen State
  const [citMode, setCitMode] = useState('phone') // 'phone' | 'credentials' | 'register'
  const [citPhone, setCitPhone] = useState('')
  const [citUsername, setCitUsername] = useState('citizen_ramesh')
  const [citPassword, setCitPassword] = useState('citizen123')
  const [citName, setCitName] = useState('')
  const [citState, setCitState] = useState('Delhi')
  const [citDistrict, setCitDistrict] = useState('South Delhi')

  // Officer State
  const [selectedRole, setSelectedRole] = useState('super_admin')
  const [offUsername, setOffUsername] = useState('superadmin')
  const [offPassword, setOffPassword] = useState('admin123')
  const [offState, setOffState] = useState('Telangana')
  const [offDistrict, setOffDistrict] = useState('Adilabad')
  const [offDept, setOffDept] = useState('water')

  const [rolesMeta, setRolesMeta] = useState({ roles: DEFAULT_ROLES, states_and_districts: [], departments: [] })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  useEffect(() => {
    api.rolesAndJurisdictions().then((res) => {
      if (res?.roles?.length) {
        setRolesMeta(res)
      }
    }).catch(() => {})
  }, [])

  // When changing role, automatically populate matching default credentials
  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey)
    const matchingRole = (rolesMeta.roles || DEFAULT_ROLES).find(r => r.role === roleKey) || DEFAULT_ROLES.find(r => r.role === roleKey)
    if (matchingRole) {
      if (matchingRole.defaultUsername) setOffUsername(matchingRole.defaultUsername)
      if (matchingRole.defaultPassword) setOffPassword(matchingRole.defaultPassword)
      if (matchingRole.state) setOffState(matchingRole.state)
      if (matchingRole.district) setOffDistrict(matchingRole.district)
      if (matchingRole.department) setOffDept(matchingRole.department)
    }
  }

  const handleSelectDemoOfficer = (demo) => {
    setSelectedRole(demo.role)
    setOffUsername(demo.username)
    setOffPassword(demo.password)
    if (demo.jurisdiction?.includes('Telangana')) setOffState('Telangana')
    if (demo.jurisdiction?.includes('Delhi')) setOffState('Delhi')
    if (demo.jurisdiction?.includes('Adilabad')) setOffDistrict('Adilabad')
    if (demo.jurisdiction?.includes('South Delhi')) setOffDistrict('South Delhi')
  }

  const handleSelectDemoCitizen = async (demo) => {
    setBusy(true)
    setErr(null)
    try {
      await citizenLogin({ demo_user: demo.username })
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }

  // Quick 1-Click Login for Officer Demo
  const handleInstantOfficerLogin = async (demo) => {
    setBusy(true)
    setErr(null)
    try {
      await officerLogin({
        username: demo.username,
        password: demo.password,
        selected_role: demo.role,
      })
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }

  // Citizen Submit
  const submitCitizen = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      if (citMode === 'register') {
        await citizenRegister({
          name: citName,
          phone: citPhone,
          state: citState,
          district: citDistrict,
          password: citPassword || 'citizen123',
        })
      } else if (citMode === 'phone') {
        await citizenLogin({ phone: citPhone })
      } else {
        await citizenLogin({ username: citUsername, password: citPassword })
      }
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }

  // Officer Submit
  const submitOfficer = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      await officerLogin({
        username: offUsername,
        password: offPassword,
        selected_role: selectedRole,
        state: offState,
        district: offDistrict,
        department: offDept,
      })
    } catch (x) {
      setErr(x)
    } finally {
      setBusy(false)
    }
  }

  const currentRoleObj = (rolesMeta.roles || DEFAULT_ROLES).find(r => r.role === selectedRole) || DEFAULT_ROLES[0]

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div className="text-center" style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 6 }}>{t('login_portal_heading', 'JanSetu Access & Redressal Portal')}</h1>
        <p className="muted lead" style={{ fontSize: '1.05rem', margin: 0 }}>
          {t('login_portal_lead', 'Select whether you are a Citizen or an Officer with specific administrative jurisdiction.')}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Tabs
          value={tab}
          onChange={(newTab) => {
            setTab(newTab)
            setSp({ tab: newTab })
            setErr(null)
          }}
          tabs={[
            { value: 'officer', label: `🛡️ ${t('tab_officer_login', 'Officer / Administrative Login')}` },
            { value: 'citizen', label: `👤 ${t('tab_citizen_login', 'Citizen / Public Login')}` },
          ]}
        />
      </div>

      <ErrorBox error={err} />

      {/* ===================== OFFICER LOGIN TAB ===================== */}
      {tab === 'officer' && (
        <div className="stack-lg">
          <div className="grid g-main" style={{ alignItems: 'start' }}>
            {/* Left Column: Form & Role Selection */}
            <div className="stack-md">
              <Card
                title={t('officer_login_title', 'Official Login')}
                sub={t('officer_login_sub', 'Select your administrative role rank and enter credentials')}
              >
                <form onSubmit={submitOfficer} className="stack-md">
                  {/* 1. Administrative Role Dropdown */}
                  <div className="field">
                    <label htmlFor="off-role" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                      Select Administrative Role Rank:
                    </label>
                    <select
                      id="off-role"
                      className="select"
                      style={{ fontSize: '1.05rem', fontWeight: 600, padding: '10px 14px', background: '#f8fafc' }}
                      value={selectedRole}
                      onChange={(e) => handleRoleSelect(e.target.value)}
                    >
                      {(rolesMeta.roles || DEFAULT_ROLES).map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Role Explanation Card */}
                  {currentRoleObj && (
                    <div className="alert alert-info" style={{ padding: '10px 14px' }}>
                      <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                      <div className="small">
                        <strong>{currentRoleObj.label}</strong>
                        <div>{currentRoleObj.description}</div>
                        <div className="xs muted mono mt-xs" style={{ marginTop: 4 }}>
                          Default Demo: <strong>{currentRoleObj.defaultUsername}</strong> / <strong>{currentRoleObj.defaultPassword}</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Jurisdiction Pickers (if required by role) */}
                  {selectedRole !== 'super_admin' && selectedRole !== 'admin' && (
                    <div className="grid g-2">
                      <div className="field">
                        <label htmlFor="off-st">Assigned State</label>
                        <select id="off-st" className="select" value={offState} onChange={(e) => setOffState(e.target.value)}>
                          <option value="Telangana">Telangana</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Odisha">Odisha</option>
                        </select>
                      </div>

                      {['district_officer', 'field_officer'].includes(selectedRole) && (
                        <div className="field">
                          <label htmlFor="off-dist">Assigned District</label>
                          <select id="off-dist" className="select" value={offDistrict} onChange={(e) => setOffDistrict(e.target.value)}>
                            {offState === 'Delhi' ? (
                              <>
                                <option value="South Delhi">South Delhi</option>
                                <option value="Central Delhi">Central Delhi</option>
                                <option value="North Delhi">North Delhi</option>
                              </>
                            ) : (
                              <>
                                <option value="Adilabad">Adilabad</option>
                                <option value="Warangal">Warangal</option>
                                <option value="Nizamabad">Nizamabad</option>
                                <option value="Patna">Patna</option>
                              </>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {['dept_officer', 'field_officer'].includes(selectedRole) && (
                    <div className="field">
                      <label htmlFor="off-dept">Department / Line Ministry</label>
                      <select id="off-dept" className="select" value={offDept} onChange={(e) => setOffDept(e.target.value)}>
                        <option value="water">Drinking Water & Sanitation (JJM)</option>
                        <option value="roads">Public Works / Roads & Bridges (PWD)</option>
                        <option value="electricity">Power & Electricity Discom</option>
                        <option value="health">Public Health & PHC</option>
                        <option value="sanitation">Municipal Solid Waste</option>
                        <option value="education">School Education</option>
                      </select>
                    </div>
                  )}

                  {/* 3. Credentials Input */}
                  <div className="grid g-2">
                    <div className="field">
                      <label htmlFor="off-u">{t('username', 'Username')}</label>
                      <input
                        id="off-u"
                        className="input mono"
                        value={offUsername}
                        onChange={(e) => setOffUsername(e.target.value)}
                        placeholder="e.g. superadmin"
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="off-p">{t('password', 'Password')}</label>
                      <input
                        id="off-p"
                        type="password"
                        className="input"
                        value={offPassword}
                        onChange={(e) => setOffPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <button className="btn btn-primary btn-lg" disabled={busy || !offUsername || !offPassword}>
                    <ShieldCheck size={18} aria-hidden="true" />
                    {busy ? t('verifying_credentials', 'Verifying Credentials…') : `Log in as ${selectedRole.replace(/_/g, ' ').toUpperCase()}`}
                  </button>
                </form>

                <p className="help mt" style={{ marginTop: 12 }}>
                  🔐 Data permissions, grievance queues, and approval limits are automatically enforced based on your role rank and administrative jurisdiction.
                </p>
              </Card>
            </div>

            {/* Right Column: Interactive Role Selection Cards */}
            <div className="stack-md">
              <Card
                title="Select Officer Role to Auto-Fill"
                sub="Click any role below to immediately set credentials & jurisdiction"
              >
                <div className="stack" style={{ gap: 8 }}>
                  {DEFAULT_ROLES.map((r) => {
                    const isSelected = selectedRole === r.role
                    return (
                      <div
                        key={r.role}
                        className={`card role-card clickable ${isSelected ? 'highlight' : ''}`}
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: '10px 14px',
                          boxShadow: 'none',
                          borderColor: isSelected ? 'var(--color-accent)' : undefined,
                          background: isSelected ? '#eff6ff' : undefined,
                        }}
                        onClick={() => handleRoleSelect(r.role)}
                      >
                        <div className="row-between">
                          <strong>{r.label}</strong>
                          <span className={`badge ${isSelected ? 'badge-blue' : 'badge-gray'} xs`}>
                            {r.role.toUpperCase()}
                          </span>
                        </div>
                        <div className="small muted" style={{ margin: '2px 0' }}>{r.description}</div>
                        <div className="xs mono" style={{ color: 'var(--color-accent)' }}>
                          User: <strong>{r.defaultUsername}</strong> · Pass: <strong>{r.defaultPassword}</strong>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>

          {/* Master Demo Credentials Reference Table with 1-Click Logins */}
          <Card
            title="🔑 Officer Demo Accounts (1-Click Instant Login)"
            sub="Complete list of test credentials for every administrative rank and territory"
          >
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Role Rank</th>
                    <th>Officer Name & Title</th>
                    <th>Jurisdiction</th>
                    <th>Username</th>
                    <th>Password</th>
                    <th className="num">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_OFFICER_DEMOS.map((o) => (
                    <tr key={o.username} style={{ background: offUsername === o.username ? '#f0fdf4' : undefined }}>
                      <td>
                        <span className={`badge ${o.badge}`}>
                          {o.roleLabel}
                        </span>
                      </td>
                      <td>
                        <strong>{o.name}</strong>
                        <div className="xs muted">{o.title}</div>
                      </td>
                      <td className="small">
                        📍 {o.jurisdiction}
                        <div className="xs muted">{o.dept}</div>
                      </td>
                      <td>
                        <code className="mono" style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                          {o.username}
                        </code>
                      </td>
                      <td>
                        <code className="mono" style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                          {o.password}
                        </code>
                      </td>
                      <td className="num">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleInstantOfficerLogin(o)}
                          disabled={busy}
                        >
                          <LogIn size={13} /> Log In
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ===================== CITIZEN LOGIN TAB ===================== */}
      {tab === 'citizen' && (
        <div className="grid g-2" style={{ alignItems: 'start' }}>
          <Card
            title={t('citizen_login_title', 'Citizen Access (Optional)')}
            sub={t('citizen_login_sub', 'Login is optional — only needed if you want to see all your past requests together in one place.')}
          >
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <Info size={16} aria-hidden="true" />
              <div className="small">
                <strong>No login required to file or track:</strong> Anyone can report a problem, track status by tracking ID, and confirm work without creating an account or logging in.
              </div>
            </div>
            <div className="row mb-md" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={`btn btn-sm ${citMode === 'phone' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCitMode('phone')}
              >
                <Phone size={14} /> {t('login_via_phone', 'Phone Number')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${citMode === 'credentials' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCitMode('credentials')}
              >
                <KeyRound size={14} /> {t('login_via_password', 'Username & Password')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${citMode === 'register' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCitMode('register')}
              >
                <UserPlus size={14} /> {t('register_account', 'Register')}
              </button>
            </div>

            <form onSubmit={submitCitizen} className="stack-md">
              {citMode === 'phone' && (
                <div className="field">
                  <label htmlFor="cit-ph">{t('mobile_number', 'Mobile Number')}</label>
                  <input
                    id="cit-ph"
                    type="tel"
                    className="input"
                    placeholder="+91 98111 22233"
                    value={citPhone}
                    onChange={(e) => setCitPhone(e.target.value)}
                    required
                  />
                  <span className="help">{t('otp_help', 'Access all grievances and proofs submitted from this phone number.')}</span>
                </div>
              )}

              {citMode === 'credentials' && (
                <>
                  <div className="field">
                    <label htmlFor="cit-u">{t('username', 'Username')}</label>
                    <input
                      id="cit-u"
                      className="input"
                      value={citUsername}
                      onChange={(e) => setCitUsername(e.target.value)}
                      placeholder="e.g. citizen_ramesh"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cit-p">{t('password', 'Password')}</label>
                    <input
                      id="cit-p"
                      type="password"
                      className="input"
                      value={citPassword}
                      onChange={(e) => setCitPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {citMode === 'register' && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      className="input"
                      value={citName}
                      onChange={(e) => setCitName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      required
                    />
                  </div>
                  <div className="field">
                    <label>Mobile Number</label>
                    <input
                      type="tel"
                      className="input"
                      value={citPhone}
                      onChange={(e) => setCitPhone(e.target.value)}
                      placeholder="+91 98111 22233"
                      required
                    />
                  </div>
                  <div className="grid g-2">
                    <div className="field">
                      <label>State</label>
                      <input className="input" value={citState} onChange={(e) => setCitState(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>District</label>
                      <input className="input" value={citDistrict} onChange={(e) => setCitDistrict(e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Create Password</label>
                    <input
                      type="password"
                      className="input"
                      value={citPassword}
                      onChange={(e) => setCitPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}

              <button className="btn btn-primary btn-lg" disabled={busy}>
                <LogIn size={18} aria-hidden="true" />
                {busy ? t('signing_in', 'Signing in…') : (citMode === 'register' ? t('register_and_login', 'Register & Login') : t('log_in', 'Log in as Citizen'))}
              </button>
            </form>

            <div className="alert alert-info mt" style={{ marginTop: 16 }}>
              <Info size={18} aria-hidden="true" />
              <div className="small">
                <strong>{t('no_login_needed_reminder', 'No login required to report problems!')}</strong>
                <p style={{ margin: '4px 0 8px 0' }}>
                  {t('no_login_desc', 'Citizens can report issues anonymously or track them using a Tracking ID anytime.')}
                </p>
                <div className="row" style={{ gap: 8 }}>
                  <Link to="/report" className="btn btn-sm btn-primary">
                    <Megaphone size={14} /> {t('report_now', 'Report a Problem')}
                  </Link>
                  <Link to="/track" className="btn btn-sm btn-ghost">
                    {t('track_with_id', 'Track with ID')}
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Demo Citizens */}
          <Card title={t('demo_citizens_title', 'Citizen Demo Accounts')} sub={t('demo_citizens_sub', 'Click to log in as a test citizen')}>
            <div className="stack">
              {ALL_CITIZEN_DEMOS.map((c) => (
                <div
                  key={c.username}
                  className="card role-card"
                  style={{ textAlign: 'left', borderColor: '#cbd5e1' }}
                >
                  <div className="row-between">
                    <strong>{c.name}</strong>
                    <span className="badge badge-green">Citizen</span>
                  </div>
                  <div className="small muted">{c.title}</div>
                  <div className="xs muted mono" style={{ margin: '4px 0' }}>
                    User: <strong>{c.username}</strong> · Pass: <strong>{c.password}</strong> · Phone: <strong>{c.phone}</strong>
                  </div>
                  <div className="row-between mt-xs" style={{ marginTop: 8 }}>
                    <span className="xs muted">📍 {c.jurisdiction}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                      onClick={() => handleSelectDemoCitizen(c)}
                      disabled={busy}
                    >
                      <LogIn size={13} /> Log In as {c.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
