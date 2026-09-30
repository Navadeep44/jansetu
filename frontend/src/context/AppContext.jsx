import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setOnUnauthorised, setToken } from '../api/client'

const Ctx = createContext(null)

const load = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const save = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* private mode */ } }

export function AppProvider({ children }) {
  const [session, setSession] = useState(() => { try { return JSON.parse(load('js_session', 'null')) } catch { return null } })
  const [country, setCountry] = useState(() => load('js_country', 'all'))
  const [uiLang, setUiLang] = useState(() => load('js_lang', 'en'))
  const [meta, setMeta] = useState(null)

  setToken(session?.token || null)
  const logout = useCallback(() => { setSession(null); setToken(null); save('js_session', null) }, [])
  useEffect(() => { setOnUnauthorised(logout) }, [logout])
  useEffect(() => { save('js_country', country) }, [country])
  useEffect(() => { save('js_lang', uiLang); document.documentElement.lang = uiLang }, [uiLang])
  useEffect(() => { api.meta().then(setMeta).catch(() => setMeta(null)) }, [])

  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password)
    setToken(res.token)
    setSession(res)
    save('js_session', JSON.stringify(res))
    return res
  }, [])

  // Optional citizen login: phone + one-time code. Reporting never requires it.
  const sendCitizenCode = useCallback((phone) => api.citizenSendCode(phone), [])
  const loginCitizen = useCallback(async (phone, code) => {
    const res = await api.citizenVerify(phone, code)
    const s2 = { ...res, phone }
    setToken(res.token)
    setSession(s2)
    save('js_session', JSON.stringify(s2))
    return s2
  }, [])

  const role = session?.user?.role || 'guest'
  const value = useMemo(() => ({
    user: session?.user || null, role, login, logout, sendCitizenCode, loginCitizen,
    isOfficial: !!session?.token && role !== 'citizen', isCitizen: !!session?.token && role === 'citizen',
    citizenPhone: role === 'citizen' ? session?.phone : null,
    country, setCountry, uiLang, setUiLang, meta, countryParam: country === 'all' ? undefined : country,
  }), [session, role, login, logout, sendCitizenCode, loginCitizen, country, uiLang, meta])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useApp = () => useContext(Ctx)
