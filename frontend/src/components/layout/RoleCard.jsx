// "Your job" card shown at the top of an officer's home page:
// who you are, your area, what you can do here, and why other pages are hidden.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, EyeOff, MapPin, X } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { jurisdictionText } from '../../lib/roles'

const KEY = (role) => `js_rolecard_hidden_${role}`
const readHidden = (role) => { try { return localStorage.getItem(KEY(role)) === '1' } catch { return false } }
const writeHidden = (role, v) => { try { v ? localStorage.setItem(KEY(role), '1') : localStorage.removeItem(KEY(role)) } catch { /* private mode */ } }

// `?denied=<page>` is added by RequireOfficial when an officer opens a page that is not part of their job.
export function useDeniedNotice() {
  const [sp, setSp] = useSearchParams()
  const denied = sp.get('denied')
  const clear = () => { const n = new URLSearchParams(sp); n.delete('denied'); setSp(n, { replace: true }) }
  return { denied, clear }
}

export function DeniedNotice() {
  const t = useT()
  const { denied, clear } = useDeniedNotice()
  if (!denied) return null
  return (
    <div className="alert alert-warn" role="status" style={{ alignItems: 'center' }}>
      <AlertTriangle size={18} aria-hidden="true" />
      <div style={{ flex: 1 }}><strong>{t('That page is for another designation.')}</strong> <span className="small">{t('You were brought back to your own page.')}</span></div>
      <button type="button" className="btn btn-sm btn-ghost" onClick={clear} aria-label={t('Close')}><X size={16} aria-hidden="true" /></button>
    </div>
  )
}

export default function RoleCard({ dismissible = true }) {
  const { user, role, roleInfo: ri, isOfficial } = useApp()
  const t = useT()
  const [hidden, setHidden] = useState(() => readHidden(role))
  if (!isOfficial || !ri) return null
  const area = jurisdictionText(user, t)

  return (
    <div className="stack">
      <DeniedNotice />
      {hidden ? (
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-sm" onClick={() => { writeHidden(role, false); setHidden(false) }}>
            <CheckCircle2 size={16} aria-hidden="true" />{t('Show my job')}
          </button>
        </div>
      ) : (
        <section className="card rolecard" aria-label={t('Your job')}>
          <style>{`
            .rolecard { display: grid; gap: 12px; padding: 16px 18px; border-left: 4px solid var(--color-accent, #2563eb); }
            .rolecard-top { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; }
            .rolecard-who { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
            .rolecard-who h2 { font-size: 1.05rem; margin: 0; }
            .rolecard-area { display: inline-flex; gap: 6px; align-items: center; font-size: .85rem; color: #475569; }
            .rolecard-job { margin: 0; font-size: 1rem; color: #0f172a; }
            .rolecard-duties { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
            .rolecard-duties li { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px;
              background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d; font-size: .85rem; line-height: 1.3; }
            .rolecard-duties svg { color: #16a34a; flex: none; }
            .rolecard-note { display: flex; gap: 6px; align-items: center; font-size: .8rem; color: #64748b; margin: 0; }
            .rolecard-x { min-width: 44px; min-height: 44px; display: inline-grid; place-items: center; border: 0; background: transparent;
              border-radius: 10px; color: #64748b; cursor: pointer; flex: none; margin: -8px -8px 0 0; }
            .rolecard-x:hover { background: #f1f5f9; color: #0f172a; }
            @media (max-width: 560px) { .rolecard-duties li { width: 100%; border-radius: 12px; } }
          `}</style>
          <div className="rolecard-top">
            <div className="stack" style={{ gap: 6 }}>
              <div className="rolecard-who">
                <h2>{t(ri.label)}</h2>
                {area && <span className="rolecard-area"><MapPin size={14} aria-hidden="true" />{area}</span>}
              </div>
              <p className="rolecard-job"><span className="muted small">{t('Your job')}: </span>{t(ri.job)}</p>
            </div>
            {dismissible && (
              <button type="button" className="rolecard-x" aria-label={t('Hide this card')} title={t('Hide this card')}
                onClick={() => { writeHidden(role, true); setHidden(true) }}>
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="xs muted" style={{ fontWeight: 600 }}>{t('What you can do here')}</div>
            <ul className="rolecard-duties">
              {ri.duties.slice(0, 4).map((d) => <li key={d}><CheckCircle2 size={15} aria-hidden="true" />{t(d)}</li>)}
            </ul>
          </div>
          {role !== 'super_admin' && <p className="rolecard-note"><EyeOff size={14} aria-hidden="true" />{t('Other pages are hidden because they are not part of your job.')}</p>}
        </section>
      )}
    </div>
  )
}
