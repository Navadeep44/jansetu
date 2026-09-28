import { useState } from 'react'
import {
  LayoutDashboard, MapPin, CheckSquare, DollarSign, Users, FileText,
  TrendingUp, CheckCircle2, AlertTriangle, RefreshCw, Eye, Sparkles,
  UserPlus, X, Layers, Building, Clock
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, Empty, Stat } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, ago, date, inr, pct } from '../../lib/format'
import OfficerShell from './OfficerShell'

export default function StateOfficerView() {
  const { user, t } = useApp()
  const [activeNav, setActiveNav] = useState('overview')
  const [approveModalProject, setApproveModalProject] = useState(null)
  const [createDistrictOfficerOpen, setCreateDistrictOfficerOpen] = useState(false)
  const [districtDrilldown, setDistrictDrilldown] = useState(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [briefResult, setBriefResult] = useState(null)

  // Load Dashboard Data
  const { data, loading, error, reload } = useAsync(() => api.officerDashboard(), [])
  // Load Districts Comparison
  const { data: distData } = useAsync(() => api.officerDistricts(), [])
  // Load Subordinate Officers
  const { data: teamData, reload: reloadTeam } = useAsync(() => api.officerTeam(), [])
  // Load Budget Summary
  const { data: budgetData } = useAsync(() => api.budgetSummary(), [])

  const kpis = data?.kpis || {}
  const districts = distData?.districts || []
  const projects = data?.projects || []
  const districtOfficers = teamData?.team || []
  const budget = budgetData?.summary || {}

  const pendingApprovals = projects.filter((p) => p.status === 'district_approved')

  const navItems = [
    { id: 'overview', label: 'State Overview', icon: LayoutDashboard },
    { id: 'districts', label: 'Districts Leaderboard', icon: MapPin, count: districts.length },
    { id: 'approvals', label: 'Project Approvals', icon: CheckSquare, count: pendingApprovals.length },
    { id: 'budget', label: 'State Budget Tracking', icon: DollarSign },
    { id: 'officers', label: 'District Collectors / DMs', icon: Users, count: districtOfficers.length },
    { id: 'brief', label: 'State Policy Brief', icon: FileText },
  ]

  const jurisdictionStr = `${user?.state || 'Telangana'} State`

  const kpiCards = (
    <>
      <Stat label="State Complaints" value={kpis.total || 0} icon={LayoutDashboard} tone="blue" />
      <Stat label="Resolved Complaints" value={kpis.resolved || 0} icon={CheckCircle2} tone="green" />
      <Stat label="Overdue SLA" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
      <Stat label="Dispute Rate" value={`${kpis.reopen_rate || 0}%`} icon={RefreshCw} tone={kpis.reopen_rate > 10 ? 'red' : 'green'} />
      <Stat label="Total Sanctioned" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} />
      <Stat label="State Utilization" value={`${budget.utilization_pct || 0}%`} icon={TrendingUp} tone="blue" />
    </>
  )

  const generateStateBrief = async () => {
    setGeneratingBrief(true)
    try {
      const res = await api.brief({ state: user?.state })
      setBriefResult(res)
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setGeneratingBrief(false)
    }
  }

  return (
    <OfficerShell
      roleTitle="State Grievance Commissioner"
      jurisdictionText={jurisdictionStr}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      badgeTone="blue"
      kpis={kpiCards}
    >
      <ErrorBox error={error} />
      {loading && <Loading height={200} />}

      {/* 1. STATE OVERVIEW */}
      {!loading && activeNav === 'overview' && (
        <div>
          <div className="card mb">
            <h2>State Grievance Redressal & Infrastructure Index</h2>
            <p className="muted small">Comprehensive roll-up across all districts and departments in {user?.state || 'the State'}</p>
          </div>

          <div className="grid g-3 mb">
            <Card title="Sector-Wise Redressal Breakdown">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {['water', 'roads', 'electricity', 'health', 'sanitation'].map((s) => (
                  <div key={s} className="row-between">
                    <div className="row" style={{ gap: 6 }}>
                      <Building size={15} className="muted" />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.toUpperCase()}</span>
                    </div>
                    <Badge tone="gray">Normal SLA</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="District Performance Benchmark">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {districts.slice(0, 4).map((d) => (
                  <div key={d.district} className="row-between">
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{d.district}</span>
                    <Badge tone={d.reopen_rate < 5 ? 'green' : 'amber'}>
                      {d.resolution_rate || 90}% resolved · {d.reopen_rate}% reopen
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="State Capital Pipeline">
              <div style={{ padding: '8px 0' }}>
                <div className="xs muted">Pending State Sanctions</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                  {pendingApprovals.length} Projects
                </div>
                <div className="xs muted mt">
                  Ready to be reviewed and forwarded to the National Planning Commission for fund allocation.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. DISTRICTS LEADERBOARD */}
      {!loading && activeNav === 'districts' && (
        <div>
          <div className="card mb">
            <h2>State Districts Leaderboard & Performance Comparison</h2>
            <p className="muted small">Benchmarking citizen satisfaction, SLA adherence, and grievance resolution times</p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>Total Grievances</th>
                    <th>Resolved</th>
                    <th>Pending</th>
                    <th>Overdue SLA</th>
                    <th>Dispute Rate</th>
                    <th>Avg Resolution</th>
                    <th style={{ textAlign: 'right' }}>Drill-down</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map((d) => (
                    <tr key={d.district}>
                      <td><strong>{d.district}</strong></td>
                      <td>{d.total}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{d.resolved}</td>
                      <td>{d.pending}</td>
                      <td>
                        {d.overdue > 0 ? <Badge tone="red">{d.overdue}</Badge> : <span className="muted xs">0</span>}
                      </td>
                      <td>{d.reopen_rate}%</td>
                      <td>{d.avg_resolution_hours}h</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDistrictDrilldown(d)}
                        >
                          <Eye size={15} />
                          Overview
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
                <h2>District-Approved Projects Awaiting State Clearance</h2>
                <p className="muted small">Forward sanctioned infrastructure proposals to National Admin for funding</p>
              </div>
              <Badge tone="blue">{pendingApprovals.length} Awaiting Clearance</Badge>
            </div>
          </div>

          {pendingApprovals.length === 0 ? (
            <Empty>No projects awaiting State Officer approval.</Empty>
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
                      <div className="xs muted">Stage</div>
                      <Badge tone="amber">District Approved</Badge>
                    </div>
                  </div>

                  <div className="row-between mt">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setApproveModalProject({ proj: p, decision: 'reject' })}
                    >
                      Reject
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setApproveModalProject({ proj: p, decision: 'approve' })}
                    >
                      <CheckCircle2 size={15} />
                      Approve & Forward to National
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. STATE BUDGET */}
      {!loading && activeNav === 'budget' && (
        <div>
          <div className="grid g-4 mb">
            <Stat label="State Sanctioned" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} tone="blue" />
            <Stat label="Total Expenditure" value={inr(budget.total_spent_inr || 0)} icon={TrendingUp} tone="amber" />
            <Stat label="Remaining Funds" value={inr(budget.total_remaining_inr || 0)} icon={DollarSign} tone="green" />
            <Stat label="State Utilization" value={`${budget.utilization_pct || 0}%`} icon={CheckCircle2} tone="blue" />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Sector</th>
                    <th>Sanctioned Amount</th>
                    <th>Expenditure</th>
                    <th>Remaining</th>
                    <th>Utilization</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.title}</div>
                        <div className="xs muted mono">{p.code || `PRJ-${p.id}`}</div>
                      </td>
                      <td><Badge tone="gray">{p.sector}</Badge></td>
                      <td style={{ fontWeight: 600 }}>{inr(p.sanctioned_amount_inr || 0)}</td>
                      <td style={{ color: '#d97706' }}>{inr(p.spent_amount_inr || 0)}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{inr(p.remaining_amount_inr || 0)}</td>
                      <td>{p.utilization_pct || 0}%</td>
                      <td>
                        <Badge tone={p.status === 'completed' ? 'green' : p.status === 'funded' ? 'blue' : 'amber'}>
                          {p.status?.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. DISTRICT OFFICERS */}
      {!loading && activeNav === 'officers' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>District Collectors & District Magistrates</h2>
                <p className="muted small">Create and manage District Collector accounts in {user?.state || 'the State'}</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateDistrictOfficerOpen(true)}
              >
                <UserPlus size={15} />
                Create District Collector Account
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Collector Name</th>
                    <th>District Jurisdiction</th>
                    <th>Role</th>
                    <th>Total Cases</th>
                    <th>Resolved</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {districtOfficers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div className="xs muted mono">@{o.username}</div>
                      </td>
                      <td><Badge tone="blue">{o.district || 'District'}</Badge></td>
                      <td>District Magistrate / Collector</td>
                      <td>{o.assigned_count || 0}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{o.resolved_count || 0}</td>
                      <td><Badge tone="green">Active</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            if (window.confirm(`Deactivate district officer ${o.username}?`)) {
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

      {/* 6. STATE BRIEF */}
      {!loading && activeNav === 'brief' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>State Executive Policy Brief (For Chief Minister & Cabinet)</h2>
                <p className="muted small">Synthesized macro-level demand signals, cross-district bottlenecks, and capital budget priorities</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={generateStateBrief}
                disabled={generatingBrief}
              >
                <Sparkles size={15} />
                {generatingBrief ? 'Generating...' : 'Generate State Brief'}
              </button>
            </div>
          </div>

          {briefResult ? (
            <div className="card" style={{ padding: 24, lineHeight: 1.6 }}>
              <h2>{briefResult.title || `JanSetu State Policy Brief · ${user?.state}`}</h2>
              <div className="xs muted mb mt-xs">Chief Minister & State Cabinet Secretariat · {date(new Date())}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
                {briefResult.summary || briefResult.markdown || JSON.stringify(briefResult, null, 2)}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <FileText size={40} className="muted mb" style={{ margin: '0 auto' }} />
              <h3>No State Brief Generated Yet</h3>
              <p className="muted small">Click the button above to generate a comprehensive AI-synthesized state policy brief.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: STATE PROJECT APPROVAL */}
      {approveModalProject && (
        <StateProjectApprovalModal
          data={approveModalProject}
          onClose={() => setApproveModalProject(null)}
          onDecided={() => {
            setApproveModalProject(null)
            reload()
          }}
        />
      )}

      {/* MODAL: CREATE DISTRICT OFFICER */}
      {createDistrictOfficerOpen && (
        <CreateDistrictOfficerModal
          stateName={user?.state || 'Telangana'}
          onClose={() => setCreateDistrictOfficerOpen(false)}
          onCreated={() => {
            setCreateDistrictOfficerOpen(false)
            reloadTeam()
          }}
        />
      )}
    </OfficerShell>
  )
}

function StateProjectApprovalModal({ data: { proj, decision }, onClose, onDecided }) {
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
        await api.approveProject(proj.id, { note: reason.trim() || 'Approved by State Officer for National funding' })
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
          <h3>{decision === 'approve' ? 'State Approval (Forward to National Admin)' : 'Reject Project Proposal'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <p className="muted small mb">
          {proj.title} · Est: <strong>{inr(proj.cost_local || 0)}</strong>
        </p>

        <div className="field mb">
          <label>{decision === 'approve' ? 'State Approval Note (Optional)' : 'Mandatory Rejection Reason'}</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder={decision === 'approve' ? 'e.g. State Planning Board clearance granted.' : 'e.g. Fails state master planning criteria.'}
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
            {loading ? 'Processing...' : decision === 'approve' ? 'Approve for Funding' : 'Reject Proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateDistrictOfficerModal({ stateName, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('district123')
  const [district, setDistrict] = useState('Nizamabad')
  const [title, setTitle] = useState('District Collector & Magistrate')
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
        district: district.trim(),
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
          <h3>Create District Collector Account</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Collector Name (IAS)</label>
          <input className="input" placeholder="e.g. Rajesh Patil, IAS" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Username</label>
          <input className="input" placeholder="e.g. collector_nizamabad" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field mb">
          <label>District Jurisdiction ({stateName})</label>
          <input className="input" value={district} onChange={(e) => setDistrict(e.target.value)} />
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
