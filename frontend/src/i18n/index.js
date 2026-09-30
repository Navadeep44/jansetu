// Whole-app translation: English text is the key, so pages stay readable.
// Add translations in ./dict/*.js files: export default { hi: { 'English text': 'हिन्दी' }, te: { ... } }
// Placeholders like {n} are filled from the second argument: t('{n} families', { n: 12 }).
import { useCallback } from 'react'
import { useApp } from '../context/AppContext'

export const UI_LANGS = { en: 'English', hi: 'हिन्दी', te: 'తెలుగు' }
export const UI_LANG_SHORT = { en: 'EN', hi: 'हिं', te: 'తె' }
export const SPEECH_TAG = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

const mods = import.meta.glob('./dict/*.js', { eager: true })
const DICT = { hi: {}, te: {} }
for (const m of Object.values(mods)) for (const l of ['hi', 'te']) Object.assign(DICT[l], m.default?.[l] || {})

const missing = { hi: new Set(), te: new Set() }
if (typeof window !== 'undefined') window.__jsMissing = missing

export function translate(lang, s, vars) {
  if (s === null || s === undefined) return ''
  let out = s
  if (lang && lang !== 'en') {
    const hit = DICT[lang]?.[s]
    if (hit) out = hit
    else if (typeof s === 'string' && /[A-Za-z]/.test(s)) missing[lang]?.add(s)
  }
  if (vars) out = String(out).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
  return out
}

export function useT() {
  const { uiLang } = useApp()
  return useCallback((s, vars) => translate(uiLang, s, vars), [uiLang])
}
