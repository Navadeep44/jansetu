// Super admin only: list officer accounts, create a new officer for one designation + area, switch an account off or on.
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, MapPin, Power, RotateCcw, Search, UserPlus, Users, X } from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import { useAsync } from '../../lib/useAsync'
import { STATES } from '../../lib/format'
import { DEPT_LABEL, ROLES, jurisdictionText, normRole } from '../../lib/roles'
import { Badge, Card, Empty, ErrorBox, Loading, PageHead, Stat } from '../../components/ui'

// Lowest to highest level.
const ORDER = ['field_officer', 'dept_officer', 'district_officer', 'state_officer', 'admin', 'super_admin']
const TONE = { field_officer: 'blue', dept_officer: 'violet', district_officer: 'green', state_officer: 'amber', admin: 'dark', super_admin: 'red' }
// Which area fields each designation needs.
const NEEDS = {
  field_officer: ['state', 'district', 'block', 'department'],
  dept_officer: ['state', 'district', 'department'],
  district_officer: ['state', 'district'],
  state_officer: ['state'],
  admin: [],
  super_admin: [],
}
const EMPTY = { role: 'field_officer', name: '', title: '', username: '', password: '', state: '', district: '', block: '', department: '' }

function RoleBadge({ role }) {
  const t = useT()
  const r = normRole(role)
  return <Badge tone={TONE[r] || ''}>{t(ROLES[r]?.label || role)}</Badge>
}

function ActiveBadge({ on }) {
  const t = useT()
  return <Badge tone={on ? 'green' : ''}>{t(on ? 'Active' : 'Switched off')}</Badge>
}

function CreateForm({ meta, onDone, onCancel }) {
  const t = useT()
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const need = NEEDS[f.role] || []
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const tree = meta?.states_and_districts || []
  const states = tree.length ? tree.map((s) => s.state) : STATES
  const districts = tree.find((s) => s.state === f.state)?.districts || []
  const blocksQ = useAsync(() => (need.includes('block') && f.district ? api.blocks(f.district, f.state) : Promise.resolve([])), [f.role, f.state, f.district])
  const blocks = (blocksQ.data || []).map((b) => b.name).filter(Boolean)
  const depts = meta?.departments?.map((d) => d.id) || Object.keys(DEPT_LABEL)

  const missing = [
    !f.name.trim() && 'name', !f.username.trim() && 'username', f.password.length < 6 && 'password',
    ...need.filter((k) => !f[k]),
  ].filter(Boolean)

  const submit = async (e) => {
    e.preventDefault()
    if (missing.length) return
    setBusy(true); setErr(null)
    const body = {
      role: f.role, name: f.name.trim(), username: f.username.trim(), password: f.password,
      title: f.title.trim() || ROLES[f.role].label, user_type: 'officer', country_code: 'IN',
      state: need.includes('state') ? f.state : null,
      district: need.includes('district') ? f.district : null,
      block: need.includes('block') ? f.block : null,
      department: need.includes('department') ? f.department : null,
    }
    try { const res = await api.post('/api/admin/users', body); onDone(res?.user || body) } catch (x) { setErr(x) } finally { setBusy(false) }
  }

  return (
    <Card title="New officer" sub="Pick the designation first. Only the needed fields are shown.">
      <form onSubmit={submit} className="stack-md">
        <div className="stack">
          <span className="label">{t('Designation')}</span>
          <div className="um-roles" role="radiogroup" aria-label={t('Designation')}>
            {ORDER.map((r) => (
              <label key={r} className={`um-role ${f.role === r ? 'on' : ''}`}>
                <input type="radio" name="role" value={r} checked={f.role === r}
                  onChange={() => setF((x) => ({ ...x, role: r }))} />
                <strong>{t(ROLES[r].label)}</strong>
                <span className="xs muted">{t(ROLES[r].job)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid g-2">
          <div className="field"><label htmlFor="um-name">{t('Full name')}</label><input id="um-name" className="input" value={f.name} onChange={set('name')} /></div>
          <div className="field"><label htmlFor="um-title">{t('Post title (optional)')}</label><input id="um-title" className="input" placeholder={t(ROLES[f.role].label)} value={f.title} onChange={set('title')} /></div>
          <div className="field"><label htmlFor="um-user">{t('Username')}</label><input id="um-user" className="input mono" autoComplete="off" value={f.username} onChange={(e) => setF((x) => ({ ...x, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, '') }))} /></div>
          <div className="field"><label htmlFor="um-pass">{t('Password')}</label><input id="um-pass" className="input" type="text" autoComplete="new-password" value={f.password} onChange={set('password')} />
            <span className="help">{t('At least 6 letters or numbers.')}</span></div>
        </div>
        {need.length > 0 && (
          <fieldset className="um-area">
            <legend><MapPin size={16} aria-hidden="true" />{t('Area of work')}</legend>
            <div className="grid g-2">
              {need.includes('state') && (
                <div className="field"><label htmlFor="um-state">{t('State')}</label>
                  <select id="um-state" className="select" value={f.state} onChange={(e) => setF((x) => ({ ...x, state: e.target.value, district: '', block: '' }))}>
                    <option value="">{t('Choose…')}</option>
                    {states.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                  </select></div>
              )}
              {need.includes('district') && (
                <div className="field"><label htmlFor="um-dist">{t('District')}</label>
                  <select id="um-dist" className="select" value={f.district} disabled={!f.state} onChange={(e) => setF((x) => ({ ...x, district: e.target.value, block: '' }))}>
                    <option value="">{t('Choose…')}</option>
                    {districts.map((d) => <option key={d} value={d}>{t(d)}</option>)}
                  </select></div>
              )}
              {need.includes('block') && (
                <div className="field"><label htmlFor="um-block">{t('Block')}</label>
                  <select id="um-block" className="select" value={f.block} disabled={!f.district} onChange={set('block')}>
                    <option value="">{t('Choose…')}</option>
                    {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select></div>
              )}
              {need.includes('department') && (
                <div className="field"><label htmlFor="um-dept">{t('Department')}</label>
                  <select id="um-dept" className="select" value={f.department} onChange={set('department')}>
                    <option value="">{t('Choose…')}</option>
                    {depts.map((d) => <option key={d} value={d}>{t(DEPT_LABEL[d] || d)}</option>)}
                  </select></div>
              )}
            </div>
          </fieldset>
        )}
        {need.length === 0 && <div className="alert alert-info"><MapPin size={18} aria-hidden="true" /><div className="small">{t('This designation works for all of India.')}</div></div>}
        <ErrorBox error={err} />
        <div className="row">
          <button className="btn btn-primary btn-lg" disabled={busy || missing.length > 0}><UserPlus size={18} aria-hidden="true" />{t(busy ? 'Creating…' : 'Create account')}</button>
          <button type="button" className="btn btn-lg" onClick={onCancel}>{t('Cancel')}</button>
        </div>
      </form>
    </Card>
  )
}

export default function UserManagement() {
  const { user: me } = useApp()
  const t = useT()
  const [role, setRole] = useState('all')
  const [state, setState] = useState('all')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actErr, setActErr] = useState(null)

  const meta = useAsync(() => api.get('/api/auth/roles-jurisdictions'), [])
  const stats = useAsync(() => api.get('/api/admin/stats'), [])
  const list = useAsync(() => api.get('/api/admin/users', { user_type: 'officer', role, state, search, limit: 200 }), [role, state, search])
  const items = useMemo(() => [...(list.data?.items || [])].sort((a, b) =>
    (b.is_active - a.is_active) || ORDER.indexOf(normRole(a.role)) - ORDER.indexOf(normRole(b.role)) || (a.name || '').localeCompare(b.name || '')), [list.data])
  const states = meta.data?.states_and_districts?.map((s) => s.state) || STATES

  useEffect(() => { const id = setTimeout(() => setSearch(q.trim()), 350); return () => clearTimeout(id) }, [q])

  const toggle = async (u) => {
    setBusyId(u.id); setActErr(null)
    try {
      await api.put(`/api/admin/users/${u.id}`, { is_active: !u.is_active })
      list.setData({ ...list.data, items: list.data.items.map((x) => (x.id === u.id ? { ...x, is_active: !u.is_active } : x)) })
      stats.reload()
    } catch (x) { setActErr(x) } finally { setBusyId(null) }
  }
  const locked = (u) => u.id === me?.id || u.username === 'superadmin'
  const toggleBtn = (u) => locked(u) ? <span className="xs muted">{t('Your account')}</span> : (
    <button type="button" className={`btn btn-sm ${u.is_active ? '' : 'btn-success'}`} disabled={busyId === u.id} onClick={() => toggle(u)}
      aria-label={t(u.is_active ? 'Switch off {name}' : 'Switch on {name}', { name: u.name })}>
      {u.is_active ? <Power size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}{t(u.is_active ? 'Switch off' : 'Switch on')}
    </button>
  )
  const area = (u) => jurisdictionText(u, t)

  return (
    <div className="stack-md">
      <style>{`
        .um-roles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .um-role { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 14px; cursor: pointer; background: #fff; min-height: 44px; }
        .um-role input { position: absolute; opacity: 0; pointer-events: none; }
        .um-role.on { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px #dbeafe; }
        .um-role:focus-within { outline: 3px solid #93c5fd; outline-offset: 2px; }
        .um-area { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 16px 16px; margin: 0; min-width: 0; }
        .um-area legend { display: inline-flex; gap: 6px; align-items: center; font-weight: 600; font-size: .9rem; padding: 0 6px; }
        .um-filters { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 12px; align-items: end; }
        .um-search { position: relative; }
        .um-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; }
        .um-search .input { padding-left: 38px; width: 100%; }
        .um-cards { display: none; }
        .um-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .um-off td { color: #94a3b8; }
        @media (max-width: 900px) { .um-roles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 720px) {
          .um-table { display: none; } .um-cards { display: grid; gap: 10px; }
          .um-filters { grid-template-columns: 1fr 1fr; } .um-filters .um-search { grid-column: 1 / -1; }
          .um-roles { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .um-role { padding: 10px 12px; } .um-role:not(.on) .xs { display: none; } .um-role.on { grid-column: 1 / -1; }
          .um-stats { gap: 8px; } .um-stats .card { padding: 10px 12px; } .um-stats .stat-value { font-size: 1.4rem; }
          .um-stats .stat-label { font-size: .75rem; line-height: 1.25; }
        }
        .um-card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; display: grid; gap: 8px; background: #fff; }
        .um-card.off { background: #f8fafc; }
      `}</style>
      <PageHead title="Officer accounts" eyebrow="Super admin" icon={Users}
        actions={!creating && <button className="btn btn-hero btn-lg" onClick={() => { setCreating(true); setDone(null) }}><UserPlus size={18} aria-hidden="true" />{t('New officer')}</button>}
        steps={['Filter by designation or state', 'Create an account for one area', 'Switch off an account when someone leaves']}>
        Each officer sees only the work and area of their designation.
      </PageHead>

      {stats.data && (
        <div className="um-stats">
          <Stat label="Active officers" value={stats.data.total_officers} icon={Users} tone="blue" />
          <Stat label="States covered" value={stats.data.states_covered} icon={MapPin} />
          <Stat label="Districts covered" value={stats.data.districts_covered} icon={MapPin} />
        </div>
      )}

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="alert alert-success" role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <div style={{ flex: 1 }}><strong>{t('Account created')}</strong>: {done.name} <span className="mono small">({done.username})</span>
              <div className="small">{t(ROLES[normRole(done.role)]?.label || done.role)} · {area(done)}</div></div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setDone(null)} aria-label={t('Close')}><X size={16} aria-hidden="true" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {creating && <CreateForm meta={meta.data} onCancel={() => setCreating(false)}
        onDone={(u) => { setCreating(false); setDone(u); list.reload(); stats.reload() }} />}

      <Card title="All officers" sub={list.data ? <>{t('{n} accounts', { n: list.data.total })}</> : undefined}>
        <div className="stack-md">
          <div className="um-filters">
            <div className="field"><label htmlFor="um-frole">{t('Designation')}</label>
              <select id="um-frole" className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">{t('All designations')}</option>
                {ORDER.map((r) => <option key={r} value={r}>{t(ROLES[r].label)}</option>)}
              </select></div>
            <div className="field"><label htmlFor="um-fstate">{t('State')}</label>
              <select id="um-fstate" className="select" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="all">{t('All states')}</option>
                {states.map((s) => <option key={s} value={s}>{t(s)}</option>)}
              </select></div>
            <div className="field um-search"><label htmlFor="um-q">{t('Search')}</label>
              <div style={{ position: 'relative' }}><Search size={16} aria-hidden="true" />
                <input id="um-q" className="input" placeholder={t('Name or username')} value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
          </div>
          <ErrorBox error={list.error || actErr} />
          {list.loading && !list.data ? <Loading /> : items.length === 0 ? <Empty>No officers match.</Empty> : (
            <>
              <div className="table-wrap um-table">
                <table className="table">
                  <thead><tr><th>{t('Officer')}</th><th>{t('Designation')}</th><th>{t('Area')}</th><th>{t('Status')}</th><th><span className="sr-only">{t('Action')}</span></th></tr></thead>
                  <tbody>
                    {items.map((u) => (
                      <tr key={u.id} className={u.is_active ? '' : 'um-off'}>
                        <td><strong>{u.name}</strong><div className="xs muted">{u.title}</div><div className="xs mono muted">{u.username}</div></td>
                        <td><RoleBadge role={u.role} /></td>
                        <td className="small">{area(u)}</td>
                        <td><ActiveBadge on={u.is_active} /></td>
                        <td style={{ textAlign: 'right' }}>{toggleBtn(u)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="um-cards">
                {items.map((u) => (
                  <div key={u.id} className={`um-card ${u.is_active ? '' : 'off'}`}>
                    <div className="row-between"><strong>{u.name}</strong><ActiveBadge on={u.is_active} /></div>
                    <div className="row" style={{ gap: 8 }}><RoleBadge role={u.role} /><span className="xs mono muted">{u.username}</span></div>
                    <div className="small row" style={{ gap: 6 }}><MapPin size={14} aria-hidden="true" />{area(u)}</div>
                    <div>{toggleBtn(u)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
