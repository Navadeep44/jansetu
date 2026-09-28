import { CheckCircle2, Clock, UserCheck, Wrench, FileCheck2, AlertTriangle, Building2, User } from 'lucide-react'
import { Badge } from '../ui'
import { date, ago } from '../../lib/format'

const STAGES = [
  { id: 'received', num: 1, label: 'Received', icon: Clock },
  { id: 'assigned', num: 2, label: 'Assigned to Officer', icon: UserCheck },
  { id: 'in_progress', num: 3, label: 'Work In Progress', icon: Wrench },
  { id: 'resolved', num: 4, label: 'Resolved (Pending Check)', icon: FileCheck2 },
  { id: 'closed', num: 5, label: 'Closed (Confirmed)', icon: CheckCircle2 },
]

export function TimelineStepper({ status, history = [] }) {
  const isReopened = status === 'reopened'
  const isClosed = status === 'closed' || status === 'closed_verified'
  const isResolved = status === 'resolved_pending_verification' || isClosed
  const isInProgress = status === 'in_progress' || isResolved
  const isAssigned = status === 'assigned' || isInProgress

  const getStageStatus = (stageNum) => {
    if (isReopened && stageNum === 5) return 'reopened'
    if (stageNum === 1) return 'completed'
    if (stageNum === 2) return isAssigned ? (status === 'assigned' ? 'active' : 'completed') : ''
    if (stageNum === 3) return isInProgress ? (status === 'in_progress' ? 'active' : 'completed') : ''
    if (stageNum === 4) return isResolved ? (status === 'resolved_pending_verification' ? 'active' : 'completed') : ''
    if (stageNum === 5) return isClosed ? 'completed' : (isReopened ? 'reopened' : '')
    return ''
  }

  return (
    <div className="timeline-stepper-container">
      <ul className="progress-stepper" aria-label="Grievance Progress Stages">
        {STAGES.map((s) => {
          const st = getStageStatus(s.num)
          const Icon = s.icon
          return (
            <li key={s.id} className={`step-item ${st}`}>
              <div className="step-circle" title={`${s.num}. ${s.label}`}>
                {st === 'completed' ? <CheckCircle2 size={18} /> : st === 'reopened' ? <AlertTriangle size={18} /> : s.num}
              </div>
              <div className="step-title">{s.num === 5 && isReopened ? 'Reopened (Disputed)' : s.label}</div>
              <div className="step-sub">
                {st === 'completed' ? 'Completed' : st === 'active' ? 'Current stage' : st === 'reopened' ? 'Action required' : 'Pending'}
              </div>
            </li>
          )
        })}
      </ul>

      {history && history.length > 0 && (
        <div className="stack mt" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Step-by-Step Activity Log</h4>
          <ol className="timeline" style={{ paddingLeft: 20 }}>
            {history.map((h, i) => (
              <li key={h.id || i} style={{ marginBottom: 12 }}>
                <div className="row-between">
                  <strong>{h.stage_label || h.status}</strong>
                  <span className="xs muted mono">{date(h.created_at)} ({ago(h.created_at)})</span>
                </div>
                {(h.actor_name || h.department) && (
                  <div className="row xs muted mt-xs" style={{ gap: 8, margin: '2px 0 4px' }}>
                    {h.actor_name && <span className="row" style={{ gap: 4 }}><User size={13} />{h.actor_name}</span>}
                    {h.department && <span className="row" style={{ gap: 4 }}><Building2 size={13} /><Badge tone="blue">{h.department}</Badge></span>}
                  </div>
                )}
                <div className="small" style={{ color: 'var(--color-foreground)' }}>{h.note}</div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
