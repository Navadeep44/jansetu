// Always-visible language switch: English | हिन्दी | తెలుగు. Every word in the app changes at once.
import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { UI_LANGS, UI_LANG_SHORT } from '../../i18n'

export default function LangSwitch({ large = false, full = false }) {
  const { uiLang, setUiLang } = useApp()
  const uid = useId()
  return (
    <div className={`lang-switch ${large ? 'lg' : ''}`} role="group" aria-label="Language / भाषा / భాష">
      {Object.keys(UI_LANGS).map((k) => (
        <button key={k} type="button" aria-pressed={uiLang === k} lang={k} title={UI_LANGS[k]} onClick={() => setUiLang(k)}>
          {uiLang === k && <motion.span layoutId={`lang-${uid}`} className="lang-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span>{full ? UI_LANGS[k] : UI_LANG_SHORT[k]}</span>
        </button>
      ))}
    </div>
  )
}

// Shown once, on the very first visit, before anything else.
export function LanguageWelcome() {
  const { langChosen, setUiLang } = useApp()
  const choices = [
    { k: 'te', big: 'తెలుగు', small: 'Telugu' },
    { k: 'hi', big: 'हिन्दी', small: 'Hindi' },
    { k: 'en', big: 'English', small: 'अंग्रेज़ी · ఇంగ్లీష్' },
  ]
  return (
    <AnimatePresence>
      {!langChosen && (
        <motion.div className="lang-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="lang-modal" role="dialog" aria-modal="true" aria-labelledby="lang-title"
            initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, opacity: 0 }}>
            <Languages size={34} color="#0369a1" aria-hidden="true" />
            <h2 id="lang-title">Choose your language · भाषा चुनें · భాష ఎంచుకోండి</h2>
            <p>You can change it any time from the top bar.</p>
            <div className="lang-choices">
              {choices.map((c) => (
                <button key={c.k} className="lang-choice" lang={c.k} onClick={() => setUiLang(c.k)} autoFocus={c.k === 'te'}>
                  <strong>{c.big}</strong><small>{c.small}</small>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
