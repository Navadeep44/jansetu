import { useState } from 'react'
import {
  LayoutDashboard, Globe, FolderPlus, Calculator, DollarSign, Users,
  FileText, TrendingUp, CheckCircle2, AlertTriangle, Sparkles, UserPlus,
  Building, Check, X, Layers, ArrowRight, Eye, RefreshCw, BarChart3
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, Empty, Stat } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, ago, date, inr, pct } from '../../lib/format'
import OfficerShell from './OfficerShell'

export default function NationalAdminView() {
  const { user, t } = useApp()
  const [activeNav, setActiveNav] = useState('overview')
  const [fundModalProject, setFundModalProject] = useState(null)
  const [createStateOfficerOpen, setCreateStateOfficerOpen] = useState(false)
  const [stateDrilldown, setStateDrilldown] = useState(null)
  const [generatingBrief, setGeneratingBrief] = useState(false)
  const [briefResult, setBriefResult] = useState(null)

  // Budget Optimizer States
  const [optBudget, setOptBudget] = useState('50000000')
  const [optLoading, setOptLoading] = useState(false)
  const [optResults, setOptResults] = useState(null)

  // Load Dashboard Data
  const { data, loading, error, reload } = useAsync(() => api.officerDashboard(), [])
  // Load States Comparison
  const { data: statesData } = useAsync(() => api.officerStates(), [])
  // Load State Officers
  const { data: teamData, reload: reloadTeam } = useAsync(() => api.officerTeam(), [])
  // Load Budget Summary
  const { data: budgetData, reload: reloadBudget } = useAsync(() => api.budgetSummary(), [])
  // Load BRICS pipeline
  const { data: bricsData } = useAsync(() => api.brics(), [])

  const kpis = data?.kpis || {}
  const states = statesData?.states || []
  const projects = data?.projects || []
  const stateOfficers = teamData?.team || []
  const budget = budgetData?.summary || {}

  const stateApprovedProjects = projects.filter((p) => p.status === 'state_approved')

  const navItems = [
    { id: 'overview', label: 'National Overview', icon: LayoutDashboard },
    { id: 'states', label: 'States Leaderboard', icon: Globe, count: states.length },
    { id: 'pipeline', label: 'Project Pipeline & Funding', icon: FolderPlus, count: stateApprovedProjects.length },
    { id: 'optimizer', label: 'Budget Optimizer', icon: Calculator },
    { id: 'brics', label: 'BRICS / NDB Exchange', icon: BarChart3 },
    { id: 'budget', label: 'National Budget Roll-up', icon: DollarSign },
    { id: 'officers', label: 'State Commissioners', icon: Users, count: stateOfficers.length },
    { id: 'brief', label: 'Union Policy Brief', icon: FileText },
  ]

  const kpiCards = (
    <>
      <Stat label="All-India Grievances" value={kpis.total || 0} icon={Globe} tone="blue" />
      <Stat label="Resolved Pan-India" value={kpis.resolved || 0} icon={CheckCircle2} tone="green" />
      <Stat label="Overdue SLA" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
      <Stat label="Total Sanctioned" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} />
      <Stat label="Total Expenditure" value={inr(budget.total_spent_inr || 0)} icon={TrendingUp} tone="amber" />
      <Stat label="National Utilization" value={`${budget.utilization_pct || 0}%`} icon={CheckCircle2} tone="blue" />
    </>
  )

  const runBudgetOptimizer = async () => {
    setOptLoading(true)
    try {
      const res = await api.optimise('IN', Number(optBudget))
      setOptResults(res)
    } catch (e) {
      alert(`Optimizer Error: ${e.message}`)
    } finally {
      setOptLoading(false)
    }
  }

  const generateNationalBrief = async () => {
    setGeneratingBrief(true)
    try {
      const res = await api.brief({ country: 'IN' })
      setBriefResult(res)
    } catch (e) {
      alert(`Error: ${e.message}`)
    } finally {
      setGeneratingBrief(false)
    }
  }

  return (
    <OfficerShell
      roleTitle="National Planning Commission Director"
      jurisdictionText="All India (National Planner)"
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      badgeTone="blue"
      kpis={kpiCards}
    >
      <ErrorBox error={error} />
      {loading && <Loading height={200} />}

      {/* 1. NATIONAL OVERVIEW */}
      {!loading && activeNav === 'overview' && (
        <div>
          <div className="card mb">
            <h2>National Grievance Intelligence & Public Capital Deployment</h2>
            <p className="muted small">Real-time demand signals and SDG alignment across 28 States & 8 Union Territories</p>
          </div>

          <div className="grid g-3 mb">
            <Card title="States Redressal Benchmark">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                {states.map((st) => (
                  <div key={st.state} className="row-between">
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{st.state}</span>
                    <Badge tone={st.resolution_rate >= 80 ? 'green' : 'amber'}>
                      {st.total} cases · {st.resolution_rate}% resolved
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="SDG & Sector Allocations">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {['water', 'roads', 'electricity', 'health', 'sanitation', 'education'].map((s) => (
                  <div key={s} className="row-between">
                    <span style={{ fontSize: 13 }}>{s.toUpperCase()}</span>
                    <span className="mono bold small">{inr(50000000)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Capital Funding Pipeline">
              <div style={{ padding: '8px 0' }}>
                <div className="xs muted">State Proposals Ready to Fund</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)', marginTop: 4 }}>
                  {stateApprovedProjects.length} Projects
                </div>
                <div className="xs muted mt">
                  Sanctioned amounts immediately unlock district-level expenditure and project commencement.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. STATES LEADERBOARD */}
      {!loading && activeNav === 'states' && (
        <div>
          <div className="card mb">
            <h2>All-India States Redressal Leaderboard</h2>
            <p className="muted small">Comparative analytics of citizen satisfaction, SLA breaches, and capital fund absorption</p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>State Name</th>
                    <th>Total Complaints</th>
                    <th>Resolved</th>
                    <th>Pending</th>
                    <th>Overdue SLA</th>
                    <th>Dispute Rate</th>
                    <th>Resolution Rate</th>
                    <th style={{ textAlign: 'right' }}>Inspect</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((st) => (
                    <tr key={st.state}>
                      <td><strong>{st.state}</strong></td>
                      <td>{st.total}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{st.resolved}</td>
                      <td>{st.pending}</td>
                      <td>
                        {st.overdue > 0 ? <Badge tone="red">{st.overdue}</Badge> : <span className="muted xs">0</span>}
                      </td>
                      <td>{st.reopen_rate}%</td>
                      <td><Badge tone="green">{st.resolution_rate}%</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setStateDrilldown(st)}
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

      {/* 3. PROJECT PIPELINE & FUNDING */}
      {!loading && activeNav === 'pipeline' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>National Project Funding & Sanction Pipeline</h2>
                <p className="muted small">Grant capital funding sanctions for state-approved infrastructure projects</p>
              </div>
              <Badge tone="blue">{stateApprovedProjects.length} Awaiting Funding</Badge>
            </div>
          </div>

          {stateApprovedProjects.length === 0 ? (
            <Empty>No state-approved projects currently awaiting National Admin funding.</Empty>
          ) : (
            <div className="grid g-2">
              {stateApprovedProjects.map((p) => (
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
                      <Badge tone="amber">State Approved</Badge>
                    </div>
                  </div>

                  <div className="row-between mt">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setFundModalProject({ proj: p, isReject: true })}
                    >
                      Reject Proposal
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setFundModalProject({ proj: p, isReject: false })}
                    >
                      <DollarSign size={15} />
                      Fund & Sanction Budget
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. BUDGET OPTIMIZER */}
      {!loading && activeNav === 'optimizer' && (
        <div>
          <div className="card mb">
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2>Knapsack Public Budget Optimizer</h2>
                <p className="muted small">Algorithmic selection of optimal project portfolios maximizing citizen beneficiaries within ceiling</p>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <input
                  className="input"
                  style={{ width: 180 }}
                  type="number"
                  placeholder="Budget Ceiling (INR)"
                  value={optBudget}
                  onChange={(e) => setOptBudget(e.target.value)}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={runBudgetOptimizer}
                  disabled={optLoading}
                >
                  <Calculator size={15} />
                  {optLoading ? 'Optimizing...' : 'Run Optimizer'}
                </button>
              </div>
            </div>
          </div>

          {optResults ? (
            <div className="grid g-3">
              <Card title="Optimization Output Summary">
                <div className="grid g-2 mt">
                  <div>
                    <div className="xs muted">Selected Projects</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{optResults.selected?.length || 0}</div>
                  </div>
                  <div>
                    <div className="xs muted">Total Budget Utilized</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-primary)' }}>
                      {inr(optResults.total_cost || 0)}
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Selected Optimal Projects" className="g-2" style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(optResults.selected || []).map((p) => (
                    <div key={p.id} className="row-between" style={{ padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 6 }}>
                      <div>
                        <strong>{p.title}</strong>
                        <div className="xs muted">{p.sector} · {inr(p.cost_local || 0)}</div>
                      </div>
                      <Badge tone="green">Selected</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <Calculator size={40} className="muted mb" style={{ margin: '0 auto' }} />
              <h3>Knapsack Solver Ready</h3>
              <p className="muted small">Set your capital allocation limit and click Run Optimizer to solve the integer knapsack.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. BRICS / NDB PIPELINE */}
      {!loading && activeNav === 'brics' && (
        <div>
          <div className="card mb">
            <h2>BRICS & New Development Bank (NDB) Federated Pipeline</h2>
            <p className="muted small">Multi-lateral project benchmarking and federated development exchange (India · Brazil · South Africa)</p>
          </div>

          <div className="grid g-3">
            <Card title="BRICS Node Status">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div className="row-between">
                  <span>🇮🇳 India (JanSetu Node)</span>
                  <Badge tone="green">Active · Local</Badge>
                </div>
                <div className="row-between">
                  <span>🇧🇷 Brazil (FalaBR Node)</span>
                  <Badge tone="blue">Federated Synced</Badge>
                </div>
                <div className="row-between">
                  <span>🇿🇦 South Africa (GovChat Node)</span>
                  <Badge tone="purple">Federated Synced</Badge>
                </div>
              </div>
            </Card>

            <Card title="Multilateral Financing Eligibility" style={{ gridColumn: 'span 2' }}>
              <p className="muted small mb">
                Projects exceeding ₹10 Crore with high SDG impact scores (SDG 6: Clean Water, SDG 9: Infrastructure) qualify for New Development Bank concessional green financing.
              </p>
              <div className="alert alert-info">
                <CheckCircle2 size={16} />
                <span>All Indian public projects are anonymized according to BRICS Track 1 DPDP k-anonymity (k=5) privacy standards.</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 6. NATIONAL BUDGET */}
      {!loading && activeNav === 'budget' && (
        <div>
          <div className="grid g-4 mb">
            <Stat label="Total Sanctioned" value={inr(budget.total_sanctioned_inr || 0)} icon={DollarSign} tone="blue" />
            <Stat label="Total Spent" value={inr(budget.total_spent_inr || 0)} icon={TrendingUp} tone="amber" />
            <Stat label="Remaining Balance" value={inr(budget.total_remaining_inr || 0)} icon={DollarSign} tone="green" />
            <Stat label="Utilization %" value={`${budget.utilization_pct || 0}%`} icon={CheckCircle2} tone="blue" />
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

      {/* 7. STATE OFFICERS */}
      {!loading && activeNav === 'officers' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>State Grievance Commissioners</h2>
                <p className="muted small">Manage State Officer credentials and administrative access</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateStateOfficerOpen(true)}
              >
                <UserPlus size={15} />
                Create State Officer Account
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Commissioner Name</th>
                    <th>State Jurisdiction</th>
                    <th>Role</th>
                    <th>Total Cases</th>
                    <th>Resolved</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stateOfficers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.name}</div>
                        <div className="xs muted mono">@{o.username}</div>
                      </td>
                      <td><Badge tone="blue">{o.state || 'State'}</Badge></td>
                      <td>State Officer</td>
                      <td>{o.assigned_count || 0}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{o.resolved_count || 0}</td>
                      <td><Badge tone="green">Active</Badge></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            if (window.confirm(`Deactivate state officer ${o.username}?`)) {
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

      {/* 8. UNION BRIEF */}
      {!loading && activeNav === 'brief' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>National Planning & Union Ministry Brief</h2>
                <p className="muted small">Macro-level synthesis for Union Ministries, NITI Aayog, and BRICS track working groups</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={generateNationalBrief}
                disabled={generatingBrief}
              >
                <Sparkles size={15} />
                {generatingBrief ? 'Generating...' : 'Generate Union Brief'}
              </button>
            </div>
          </div>

          {briefResult ? (
            <div className="card" style={{ padding: 24, lineHeight: 1.6 }}>
              <h2>{briefResult.title || 'JanSetu National Planning Commission Policy Brief'}</h2>
              <div className="xs muted mb mt-xs">Union of India · NITI Aayog & Planning Ministry · {date(new Date())}</div>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
                {briefResult.summary || briefResult.markdown || JSON.stringify(briefResult, null, 2)}
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <FileText size={40} className="muted mb" style={{ margin: '0 auto' }} />
              <h3>No National Brief Generated Yet</h3>
              <p className="muted small">Click the button above to generate a comprehensive AI-synthesized policy brief.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: FUND / REJECT PROJECT */}
      {fundModalProject && (
        <NationalFundModal
          data={fundModalProject}
          onClose={() => setFundModalProject(null)}
          onFunded={() => {
            setFundModalProject(null)
            reload()
            reloadBudget()
          }}
        />
      )}

      {/* MODAL: CREATE STATE OFFICER */}
      {createStateOfficerOpen && (
        <CreateStateOfficerModal
          onClose={() => setCreateStateOfficerOpen(false)}
          onCreated={() => {
            setCreateStateOfficerOpen(false)
            reloadTeam()
          }}
        />
      )}
    </OfficerShell>
  )
}

function NationalFundModal({ data: { proj, isReject }, onClose, onFunded }) {
  const [sanctionedAmount, setSanctionedAmount] = useState((proj.cost_local || 2500000).toString())
  const [changeReason, setChangeReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAction = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isReject) {
        if (rejectReason.trim().length < 5) {
          setError(new Error('Please provide a mandatory rejection reason.'))
          setLoading(false)
          return
        }
        await api.rejectProject(proj.id, { reason: rejectReason.trim() })
      } else {
        const estCost = proj.cost_local || 0
        const sancAmt = Number(sanctionedAmount)
        if (sancAmt !== estCost && !changeReason.trim()) {
          setError(new Error('You changed the sanctioned amount from the estimated cost. A change reason is required.'))
          setLoading(false)
          return
        }
        await api.fundProject(proj.id, {
          sanctioned_amount_inr: sancAmt,
          change_reason: changeReason.trim() || undefined,
        })
      }
      onFunded()
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
          <h3>{isReject ? 'Reject Project Proposal' : 'Fund Project & Sanction Budget'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <p className="muted small mb">
          {proj.title} · Estimated: <strong>{inr(proj.cost_local || 0)}</strong>
        </p>

        {isReject ? (
          <div className="field mb">
            <label>Mandatory Rejection Reason</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Explain why national funding is declined for this project."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        ) : (
          <>
            <div className="field mb">
              <label>Sanctioned Amount (INR)</label>
              <input
                className="input"
                type="number"
                value={sanctionedAmount}
                onChange={(e) => setSanctionedAmount(e.target.value)}
              />
            </div>

            {Number(sanctionedAmount) !== (proj.cost_local || 0) && (
              <div className="field mb">
                <label>Mandatory Reason for Amount Change</label>
                <input
                  className="input"
                  placeholder="e.g. Adjusted according to Central PMGSY cost norms."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${isReject ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleAction}
            disabled={loading}
          >
            {loading ? 'Processing...' : isReject ? 'Confirm Rejection' : 'Sanction & Fund Project'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateStateOfficerModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('state123')
  const [stateName, setStateName] = useState('Maharashtra')
  const [title, setTitle] = useState('State Grievance Commissioner')
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
        state: stateName.trim(),
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
          <h3>Create State Officer Account</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Commissioner Full Name</label>
          <input className="input" placeholder="e.g. S. Deshmukh, IAS" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Username</label>
          <input className="input" placeholder="e.g. state_maharashtra" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field mb">
          <label>State Jurisdiction</label>
          <input className="input" value={stateName} onChange={(e) => setStateName(e.target.value)} />
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
