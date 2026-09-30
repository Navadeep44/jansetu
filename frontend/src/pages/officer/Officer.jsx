// /officer — one route, a different work screen per designation.
// field_officer → My tasks · dept_officer → Department queue · district_officer / super_admin → Checks.
import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useT } from '../../i18n'
import FieldTasks from '../../components/officer/FieldTasks'
import DeptQueue from '../../components/officer/DeptQueue'
import ChecksInbox from '../../components/officer/ChecksInbox'

export default function Officer() {
  const { role, roleInfo } = useApp()
  const t = useT()
  if (role === 'field_officer') return <FieldTasks />
  if (role === 'dept_officer') return <DeptQueue />
  if (role === 'district_officer' || role === 'super_admin') return <ChecksInbox />
  return (
    <div className="card stack" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
      <ShieldAlert size={32} aria-hidden="true" style={{ margin: '0 auto', color: 'var(--color-accent)' }} />
      <h1 style={{ fontSize: '1.3rem', margin: 0 }}>{t('This page is not part of your job.')}</h1>
      <p className="small muted" style={{ margin: 0 }}>{t('Your work is on your own home page.')}</p>
      <div><Link to={roleInfo?.home || '/'} className="btn btn-primary btn-lg">{t('Go to my home page')}</Link></div>
    </div>
  )
}
