import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setOnUnauthorised, setToken } from '../api/client'
import { UI_LANGS, tr } from '../i18n/strings'

const Ctx = createContext(null)

const load = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } }

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(load('js_session', 'null')) } catch { return null }
  })
  const [country, setCountry] = useState(() => load('js_country', 'all'))
  const [uiLang, setUiLangState] = useState(() => {
    const l = load('js_lang', 'en')
    return UI_LANGS[l] ? l : 'en'
  })
  const [meta, setMeta] = useState(null)

  const setUiLang = useCallback((lang) => {
    const valid = UI_LANGS[lang] ? lang : 'en'
    setUiLangState(valid)
  }, [])

  const t = useCallback((key, fallback) => {
    const val = tr(uiLang, key)
    return val !== undefined && val !== key ? val : (fallback ?? key)
  }, [uiLang])

  // Sync token to API client
  useEffect(() => {
    setToken(session?.token || null)
  }, [session])

  const logout = useCallback(() => {
    setSession(null)
    setToken(null)
    save('js_session', null)
  }, [])

  useEffect(() => { setOnUnauthorised(logout) }, [logout])
  useEffect(() => { save('js_country', country) }, [country])
  useEffect(() => { save('js_lang', uiLang); document.documentElement.lang = uiLang }, [uiLang])
  useEffect(() => { api.meta().then(setMeta).catch(() => setMeta(null)) }, [])

  // 1. Generic Legacy Login
  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password)
    setToken(res.token)
    setSession(res)
    save('js_session', JSON.stringify(res))
    return res
  }, [])

  // 2. Officer Login with Role & Jurisdiction
  const officerLogin = useCallback(async ({ username, password, selected_role, state, district, department }) => {
    const res = await api.officerLogin({ username, password, selected_role, state, district, department })
    setToken(res.token)
    setSession(res)
    save('js_session', JSON.stringify(res))
    return res
  }, [])

  // 3. Citizen Login
  const citizenLogin = useCallback(async ({ username, phone, password, demo_user }) => {
    const res = await api.citizenLogin({ username, phone, password, demo_user })
    setToken(res.token)
    setSession(res)
    save('js_session', JSON.stringify(res))
    return res
  }, [])

  // 4. Citizen Registration
  const citizenRegister = useCallback(async ({ name, phone, state, district, password }) => {
    const res = await api.citizenRegister({ name, phone, state, district, password })
    setToken(res.token)
    setSession(res)
    save('js_session', JSON.stringify(res))
    return res
  }, [])

  // Derived RBAC properties
  const user = session?.user || null
  const userType = user?.user_type || (session?.token ? 'officer' : 'guest')
  const role = user?.role || (session?.token ? 'field_officer' : 'citizen')
  const isOfficial = userType === 'officer' || (!!session?.token && role !== 'citizen')
  const isCitizen = userType === 'citizen'
  const isLoggedIn = !!session?.token

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = ['super_admin', 'admin', 'national'].includes(role)
  const isStateOfficer = role === 'state_officer'
  const isDistrictOfficer = ['district_officer', 'district'].includes(role)
  const isDeptOfficer = role === 'dept_officer'
  const isFieldOfficer = ['field_officer', 'officer'].includes(role)

  const permissions = user?.permissions || []
  const hasPermission = useCallback((perm) => {
    if (isSuperAdmin) return true
    return permissions.includes('*') || permissions.includes(perm)
  }, [isSuperAdmin, permissions])

  const jurisdiction = useMemo(() => ({
    state: user?.state || null,
    district: user?.district || null,
    department: user?.department || null,
    country: user?.country_code || 'IN',
  }), [user])

  const value = useMemo(() => ({
    user,
    userType,
    role,
    isLoggedIn,
    isOfficial,
    isCitizen,
    isSuperAdmin,
    isAdmin,
    isStateOfficer,
    isDistrictOfficer,
    isDeptOfficer,
    isFieldOfficer,
    jurisdiction,
    permissions,
    hasPermission,
    login,
    officerLogin,
    citizenLogin,
    citizenRegister,
    logout,
    country,
    setCountry,
    uiLang,
    setUiLang,
    t,
    meta,
    countryParam: country === 'all' ? undefined : country,
  }), [
    user, userType, role, isLoggedIn, isOfficial, isCitizen,
    isSuperAdmin, isAdmin, isStateOfficer, isDistrictOfficer, isDeptOfficer, isFieldOfficer,
    jurisdiction, permissions, hasPermission, login, officerLogin, citizenLogin, citizenRegister,
    logout, country, uiLang, setUiLang, t, meta
  ])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
