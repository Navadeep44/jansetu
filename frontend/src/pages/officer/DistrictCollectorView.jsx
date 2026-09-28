import { useState } from 'react'
import {
  LayoutDashboard, Building, MapPin, CheckCircle2, DollarSign, Users,
  FileText, AlertTriangle, ShieldAlert, ArrowRight, RefreshCw, Clock,
  Eye, Check, X, Sparkles, UserPlus, AlertCircle, TrendingUp, CheckSquare
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, Empty, Stat } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, ago, date, inr, pct } from '../../lib/format'
import OfficerShell from './OfficerShell'

export default function DistrictCollectorView() {
  const { user, t } = useApp()
  const [activeNav, setActiveNav] = useState('overview')
  const [reassignModalReq, setReassignModalReq] = useState(null)
  const [approveModalProject, setApproveModalProject] = useState(null)
  const [expenditureModalProject, setExpenditureModalProject] = useState(null)
  const [createDeptOfficerOpen, setCreateDeptOfficerOpen] = useState(false)
  const [deptDrilldown, setDeptDrilldown] = useState(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [briefResult, setBriefResult] = useState(null)

  // Load Dashboard Data
  const { data, loading, error, reload } = useAsync(() => api.officerDashboard(), [])
  // Load Departments Comparison
  const { data: deptData } = useAsync(() => api.officerDepartments(), [])
  // Load Subordinate Officers
  const { data: teamData, reload: reloadTeam } = useAsync(() => api.officerTeam(), [])
  // Load Scoped Budget
  const { data: budgetData, reload: reloadBudget } = useAsync(() => api.budgetSummary(), [])

  const kpis = data?.kpis || {}
  const overdueEscalated = data?.overdue_and_escalated || []
  const departments = deptData?.departments || []
  const projects = data?.projects || []
  const subordinateOfficers = teamData?.team || []
  const budget = budgetData?.summary || {}

  // Filter projects pending district approval
  const pendingApprovals = projects.filter((p) => p.status === 'proposed')
  const fundedProjects = projects.filter((p) => p.status === 'funded' || p.status === 'in_execution' || p.status === 'completed')

  const navItems = [
    { id: 'overview', label: 'District Overview', icon: LayoutDashboard },
    { id: 'departments', label: 'Departments', icon: Building, count: departments.length },
    { id: 'approvals', label: 'Project Approvals', icon: CheckSquare, count: pendingApprovals.length },
    { id: 'budget', label: 'Budget & Expenditure', icon: DollarSign },
    { id: 'officers', label: 'Department Officers', icon: Users, count: subordinateOfficers.length },
    { id: 'brief', label: 'District Brief', icon: FileText },
  ]

  const jurisdictionStr = `${user?.district || 'Adilabad'}, ${user?.state || 'Telangana'}`

  const kpiCards = (
    <>
      <Stat label="District Complaints" value={kpis.total || 0} icon={LayoutDashboard} tone="blue" />
      <Stat label="Overdue SLA" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
      <Stat label="Escalated to DM" value={kpis.escalated || 0} icon={ShieldAlert} tone={kpis.escalated > 0 ? 'amber' : 'gray'} />
      <Stat label="Resolution Rate" value={`${pct(kpis.resolution_rate || 0)}`} icon={CheckCircle2} tone="green" />
      <Stat label="Citizen Dispute Rate" value={`${kpis.reopen_rate || 0}%`} icon={RefreshCw} tone={kpis.reopen_rate > 10 ? 'red' : 'green'} />
      <Stat label="Sanctioned Budget" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} />
    </>
  )

  const generateDistrictBrief = async () => {
    setGeneratingBrief(true)
    try {
      const res = await api.brief({ district: user?.district, state: user?.state })
      setBriefResult(res)
    } catch (e) {
      alert(`Error generating brief: ${e.message}`)
    } finally {
      setGeneratingBrief(false)
    }
  }

  return (
    <OfficerShell
      roleTitle="District Collector & Magistrate"
      jurisdictionText={jurisdictionStr}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      badgeTone="amber"
      kpis={kpiCards}
    >
      <ErrorBox error={error} />
      {loading && <Loading height={200} />}

      {/* 1. DISTRICT OVERVIEW */}
      {!loading && activeNav === 'overview' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>Critical Watchlist: Overdue & Escalated Cases</h2>
                <p className="muted small">Complaints requiring immediate administrative intervention or cross-department coordination</p>
              </div>
              <Badge tone="red">{overdueEscalated.length} Cases Requiring Action</Badge>
            </div>
          </div>

          {overdueEscalated.length === 0 ? (
            <Empty>No overdue SLA breaches or escalated cases in the district.</Empty>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Department</th>
                      <th>Location / Block</th>
                      <th>Grievance Summary</th>
                      <th>Issue Flag</th>
                      <th>Assigned Officer</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueEscalated.map((r) => (
                      <tr key={r.id}>
                        <td><span className="mono bold small">{r.tracking_id}</span></td>
                        <td><Badge tone="blue">{r.category?.toUpperCase()}</Badge></td>
                        <td>{r.area || 'Adilabad'}</td>
                        <td style={{ maxWidth: 260 }}>
                          <div style={{ fontWeight: 500 }}>{r.text || r.translated_text}</div>
                          {r.escalation_reason && (
                            <div className="xs muted mt-xs" style={{ color: 'var(--color-destructive)' }}>
                              Escalated: "{r.escalation_reason}"
                            </div>
                          )}
                        </td>
                        <td>
                          {r.is_overdue && <Badge tone="red"><AlertTriangle size={11} /> OVERDUE</Badge>}
                          {r.escalated && <Badge tone="amber"><ShieldAlert size={11} /> ESCALATED</Badge>}
                        </td>
                        <td>{r.assigned_officer || <span className="muted xs italic">Unassigned</span>}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setReassignModalReq(r)}
                          >
                            Reassign Dept
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. DEPARTMENTS COMPARISON */}
      {!loading && activeNav === 'departments' && (
        <div>
          <div className="card mb">
            <h2>Department Performance & Accountability</h2>
            <p className="muted small">District-wide comparison of redressal velocity, SLA adherence, and dispute rates</p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total Complaints</th>
                    <th>Resolved</th>
                    <th>Pending</th>
                    <th>Overdue SLA</th>
                    <th>Reopen / Dispute</th>
                    <th>Avg Resolution</th>
                    <th style={{ textAlign: 'right' }}>Drill-down</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.department}>
                      <td>
                        <strong>{d.department_label || d.department?.toUpperCase()}</strong>
                      </td>
                      <td>{d.total}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{d.resolved}</td>
                      <td>{d.pending}</td>
                      <td>
                        {d.overdue > 0 ? (
                          <Badge tone="red">{d.overdue}</Badge>
                        ) : (
                          <span className="muted xs">0</span>
                        )}
                      </td>
                      <td>{d.reopen_rate}%</td>
                      <td>{d.avg_resolution_hours}h</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDeptDrilldown(d)}
                        >
                          <Eye size={15} />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROJECT APPROVALS */}
      {!loading && activeNav === 'approvals' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>Department Project Proposals Awaiting District Sanction</h2>
                <p className="muted small">Review cluster demand evidence, estimated budget, and approve for State forwarding</p>
              </div>
              <Badge tone="blue">{pendingApprovals.length} Pending Approval</Badge>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <Empty>No department proposals currently awaiting District Collector approval.</Empty>
          ) : (
            <div className="grid g-2">
              {pendingApprovals.map((p) => (
                <div key={p.id} className="card">
                  <div className="row-between mb">
                    <Badge tone="purple">{p.sector?.toUpperCase()}</Badge>
                    <span className="mono bold small">{p.code || `PRJ-${p.id}`}</span>
                  </div>
                  <h3>{p.title}</h3>
                  <p className="muted small">{p.description}</p>

                  <div className="grid g-3 mt mb" style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 8 }}>
                    <div>
                      <div className="xs muted">Est. Cost</div>
                      <strong>{inr(p.cost_local || 0)}</strong>
                    </div>
                    <div>
                      <div className="xs muted">Beneficiaries</div>
                      <strong>{p.beneficiaries || 0} HH</strong>
                    </div>
                    <div>
                      <div className="xs muted">Need-Gap Score</div>
                      <strong>{p.score?.toFixed(1) || '75.0'} / 100</strong>
                    </div>
                  </div>

                  <div className="row-between mt">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setApproveModalProject({ proj: p, decision: 'reject' })}
                    >
                      Reject Proposal
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setApproveModalProject({ proj: p, decision: 'approve' })}
                    >
                      <CheckCircle2 size={15} />
                      Approve & Forward to State
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. BUDGET & EXPENDITURE */}
      {!loading && activeNav === 'budget' && (
        <div>
          {/* Budget Summary Card */}
          <div className="grid g-4 mb">
            <Stat label="Total Sanctioned" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} tone="blue" />
            <Stat label="Total Spent" value={inr(budget.total_spent_inr || 0)} icon={TrendingUp} tone="amber" />
            <Stat label="Remaining Balance" value={inr(budget.total_remaining_inr || 0)} icon={DollarSign} tone="green" />
            <Stat label="Budget Utilization" value={`${budget.utilization_pct || 0}%`} icon={CheckCircle2} tone={budget.utilization_pct > 90 ? 'red' : 'blue'} />
          </div>

          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>Funded Projects & Expenditure Tracking</h2>
                <p className="muted small">Append-only financial audit records against state & national budget allocations</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project Code & Title</th>
                    <th>Sector</th>
                    <th>Sanctioned</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Utilization</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fundedProjects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div className="xs muted mono">{p.code || `PRJ-${p.id}`}</div>
                      </td>
                      <td><Badge tone="gray">{p.sector}</Badge></td>
                      <td style={{ fontWeight: 600 }}>{inr(p.sanctioned_amount_inr || 0)}</td>
                      <td style={{ color: '#d97706' }}>{inr(p.spent_amount_inr || 0)}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{inr(p.remaining_amount_inr || 0)}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          <span>{p.utilization_pct || 0}%</span>
                          {p.utilization_pct >= 90 && <Badge tone="red">90%+</Badge>}
                        </div>
                      </td>
                      <td>
                        <Badge tone={p.status === 'completed' ? 'green' : 'blue'}>
                          {p.status?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          {p.status !== 'completed' && (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setExpenditureModalProject(p)}
                              >
                                + Record Expense
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={async () => {
                                  if (window.confirm(`Mark ${p.title} as completed on ground?`)) {
                                    await api.completeProject(p.id, { note: 'Work verified complete by District Collector' })
                                    reload()
                                    reloadBudget()
                                  }
                                }}
                              >
                                Complete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. OFFICERS MANAGEMENT */}
      {!loading && activeNav === 'officers' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>District Department Officers</h2>
                <p className="muted small">Create and manage department officer accounts in {user?.district || 'Adilabad'}</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateDeptOfficerOpen(true)}
              >
                <UserPlus size={15} />
                Create Department Officer Account
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Assigned Cases</th>
                    <th>Resolved</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subordinateOfficers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div className="xs muted mono">@{o.username}</div>
                      </td>
                      <td><Badge tone="purple">{o.department?.toUpperCase()}</Badge></td>
                      <td>{o.role?.replace(/_/g, ' ')}</td>
                      <td>{o.assigned_count || 0}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{o.resolved_count || 0}</td>
                      <td><Badge tone="green">Active</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            if (window.confirm(`Deactivate officer account ${o.username}?`)) {
                              await api.deactivateSubordinateOfficer(o.id)
                              reloadTeam()
                            }
                          }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. DISTRICT BRIEF */}
      {!loading && activeNav === 'brief' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>District Policy & Executive Redressal Brief</h2>
                <p className="muted small">Automated one-click briefing paper for District Administration meetings</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={generateDistrictBrief}
                disabled={generatingBrief}
              >
                <Sparkles size={15} />
                {generatingBrief ? 'Synthesizing...' : 'Generate District Brief'}
              </button>
            </div>
          </div>

          {briefResult ? (
            <div className="card" style={{ padding: 24, lineHeight: 1.6 }}>
              <h2>{briefResult.title || `JanSetu Executive Brief · ${user?.district}`}</h2>
              <div className="xs muted mb mt-xs">Generated for District Magistrate & Collector · {date(new Date())}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
                {briefResult.summary || briefResult.markdown || JSON.stringify(briefResult, null, 2)}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <FileText size={40} className="muted mb" style={{ margin: '0 auto' }} />
              <h3>No Brief Generated Yet</h3>
              <p className="muted small">Click the button above to generate a comprehensive AI-synthesized policy brief.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REASSIGN DEPARTMENT */}
      {reassignModalReq && (
        <ReassignDepartmentModal
          complaint={reassignModalReq}
          onClose={() => setReassignModalReq(null)}
          onReassigned={() => {
            setReassignModalReq(null)
            reload()
          }}
        />
      )}

      {/* MODAL: APPROVE / REJECT PROJECT */}
      {approveModalProject && (
        <ProjectApprovalModal
          data={approveModalProject}
          onClose={() => setApproveModalProject(null)}
          onDecided={() => {
            setApproveModalProject(null)
            reload()
          }}
        />
      )}

      {/* MODAL: RECORD EXPENDITURE */}
      {expenditureModalProject && (
        <RecordExpenditureModal
          project={expenditureModalProject}
          onClose={() => setExpenditureModalProject(null)}
          onRecorded={() => {
            setExpenditureModalProject(null)
            reload()
            reloadBudget()
          }}
        />
      )}

      {/* MODAL: CREATE DEPT OFFICER */}
      {createDeptOfficerOpen && (
        <CreateDeptOfficerModal
          onClose={() => setCreateDeptOfficerOpen(false)}
          onCreated={() => {
            setCreateDeptOfficerOpen(false)
            reloadTeam()
          }}
        />
      )}
    </OfficerShell>
  )
}

function ReassignDepartmentModal({ complaint, onClose, onReassigned }) {
  const [newDept, setNewDept] = useState('roads')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleReassign = async () => {
    if (note.trim().length < 5) {
      setError(new Error('Please provide a mandatory note explaining the department reassignment.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.reassignDepartment(complaint.id, {
        new_department: newDept,
        note: note.trim(),
      })
      onReassigned()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 12 }}>
        <div className="row-between mb">
          <h3>Reassign Complaint Department</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Target Department</label>
          <select className="select" value={newDept} onChange={(e) => setNewDept(e.target.value)}>
            {['water', 'roads', 'electricity', 'health', 'sanitation', 'education'].map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="field mb">
          <label>Mandatory Reason Note</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Explain why this grievance falls under the new department's jurisdiction."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleReassign} disabled={loading}>
            {loading ? 'Reassigning...' : 'Confirm Reassignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProjectApprovalModal({ data: { proj, decision }, onClose, onDecided }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAction = async () => {
    if (decision === 'reject' && reason.trim().length < 5) {
      setError(new Error('Please enter a mandatory rejection reason.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (decision === 'approve') {
        await api.approveProject(proj.id, { note: reason.trim() || 'Approved at District level' })
      } else {
        await api.rejectProject(proj.id, { reason: reason.trim() })
      }
      onDecided()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 500, borderRadius: 12 }}>
        <div className="row-between mb">
          <h3>{decision === 'approve' ? 'Approve Project (Forward to State)' : 'Reject Project Proposal'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <p className="muted small mb">
          {proj.title} · Est: <strong>{inr(proj.cost_local || 0)}</strong>
        </p>

        <div className="field mb">
          <label>{decision === 'approve' ? 'Approval Note (Optional)' : 'Mandatory Rejection Reason'}</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder={decision === 'approve' ? 'e.g. Verified convergence with District PMGSY budget.' : 'e.g. Insufficient beneficiary density or duplicate proposal.'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${decision === 'approve' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? 'Processing...' : decision === 'approve' ? 'Approve & Forward' : 'Reject Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecordExpenditureModal({ project, onClose, onRecorded }) {
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0])
  const [billRef, setBillRef] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRecord = async () => {
    if (!amount || !desc) {
      setError(new Error('Please fill in amount and description.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.recordExpenditure(project.id, {
        amount_inr: Number(amount),
        description: desc.trim(),
        spent_on: dateStr,
        bill_reference: billRef.trim() || undefined,
      })
      onRecorded()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 12 }}>
        <div className="row-between mb">
          <h3>Record Project Expenditure</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="row-between mb xs muted" style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 6 }}>
          <span>Sanctioned: <strong>{inr(project.sanctioned_amount_inr || 0)}</strong></span>
          <span>Remaining: <strong style={{ color: 'green' }}>{inr(project.remaining_amount_inr || 0)}</strong></span>
        </div>

        <div className="field mb">
          <label>Expenditure Amount (INR)</label>
          <input className="input" type="number" placeholder="e.g. 450000" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Description of Work / Milestone</label>
          <input className="input" placeholder="e.g. Payment for Phase 1 pipeline procurement" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        <div className="grid g-2 mb">
          <div className="field">
            <label>Date Spent</label>
            <input className="input" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>
          <div className="field">
            <label>Bill / Voucher Reference</label>
            <input className="input" placeholder="e.g. MB/2026/V-89" value={billRef} onChange={(e) => setBillRef(e.target.value)} />
          </div>
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRecord} disabled={loading}>
            {loading ? 'Recording...' : 'Record Expenditure'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateDeptOfficerModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('dept123')
  const [dept, setDept] = useState('water')
  const [title, setTitle] = useState('Superintending Engineer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    if (!name || !username) {
      setError(new Error('Please fill in officer name and username.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.createSubordinateOfficer({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password: password.trim(),
        title: title.trim(),
        department: dept,
      })
      onCreated()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, borderRadius: 12 }}>
        <div className="row-between mb">
          <h3>Create Department Officer Account</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Officer Full Name</label>
          <input className="input" placeholder="e.g. Er. K. Srinivas" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Username</label>
          <input className="input" placeholder="e.g. dept_health_ad" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Department Sector</label>
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
            {['water', 'roads', 'electricity', 'health', 'sanitation', 'education'].map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="field mb">
          <label>Designation Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}
