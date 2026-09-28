import { useState, useEffect } from 'react'
import {
  Inbox, Users, CheckCircle2, FolderPlus, FileText, Clock, AlertTriangle,
  RefreshCw, ShieldAlert, ArrowRight, Eye, UserPlus, Send, X, AlertCircle,
  Building, Check, ChevronRight, Layers, Sparkles
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, Empty, Stat } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, ago, date, inr } from '../../lib/format'
import OfficerShell from './OfficerShell'

export default function DeptOfficerView() {
  const { user, t } = useApp()
  const [activeNav, setActiveNav] = useState('queue')
  const [queueTab, setQueueTab] = useState('unassigned') // unassigned | escalated | overdue | all
  const [assignModalReq, setAssignModalReq] = useState(null)
  const [proposeCluster, setProposeCluster] = useState(null)
  const [addOfficerOpen, setAddOfficerOpen] = useState(false)
  const [selectedProof, setSelectedProof] = useState(null)

  // Load Dashboard Data
  const { data, loading, error, reload } = useAsync(() => api.officerDashboard(), [])
  // Load Team Data
  const { data: teamData, reload: reloadTeam } = useAsync(() => api.officerTeam(), [])
  // Load Sector Clusters
  const { data: clusterData, reload: reloadClusters } = useAsync(() => api.clusters({ category: user?.department }), [user?.department])

  const kpis = data?.kpis || {}
  const allReqs = data?.queue || []
  const team = teamData?.team || []
  const proofReviewList = data?.proof_review_queue || []
  const proposals = data?.proposals || []
  const clusters = clusterData?.items || []

  // Filter queues
  const unassignedReqs = allReqs.filter((r) => !r.assigned_field_officer_id && r.status !== 'closed')
  const escalatedReqs = allReqs.filter((r) => r.escalated || r.status === 'escalated')
  const overdueReqs = allReqs.filter((r) => r.is_overdue && r.status !== 'closed')

  let currentQueue = allReqs
  if (queueTab === 'unassigned') currentQueue = unassignedReqs
  else if (queueTab === 'escalated') currentQueue = escalatedReqs
  else if (queueTab === 'overdue') currentQueue = overdueReqs

  const navItems = [
    { id: 'queue', label: 'Department Queue', icon: Inbox, count: unassignedReqs.length + escalatedReqs.length },
    { id: 'proofs', label: 'Proof Review', icon: CheckCircle2, count: proofReviewList.length },
    { id: 'team', label: 'Field Team', icon: Users, count: team.length },
    { id: 'clusters', label: 'Sector Clusters', icon: Layers, count: clusters.length },
    { id: 'proposals', label: 'Project Proposals', icon: FolderPlus, count: proposals.length },
  ]

  const jurisdictionStr = `${user?.department?.toUpperCase() || 'Department'}, ${user?.district || 'District'}`

  const kpiCards = (
    <>
      <Stat label="Total Complaints" value={kpis.total || 0} icon={Inbox} tone="blue" />
      <Stat label="Unassigned" value={unassignedReqs.length} icon={Clock} tone={unassignedReqs.length > 0 ? 'amber' : 'gray'} />
      <Stat label="Escalated Cases" value={escalatedReqs.length} icon={ShieldAlert} tone={escalatedReqs.length > 0 ? 'red' : 'gray'} />
      <Stat label="Overdue SLA" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
      <Stat label="Citizen Dispute Rate" value={`${kpis.reopen_rate || 0}%`} icon={RefreshCw} tone={kpis.reopen_rate > 10 ? 'red' : 'green'} />
      <Stat label="Avg Resolution Time" value={`${kpis.avg_resolution_hours || 0}h`} icon={Clock} />
    </>
  )

  return (
    <OfficerShell
      roleTitle="Department Officer"
      jurisdictionText={jurisdictionStr}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      badgeTone="purple"
      kpis={kpiCards}
    >
      <ErrorBox error={error} />
      {loading && <Loading height={200} />}

      {/* PAGE 1: DEPARTMENT QUEUE */}
      {!loading && activeNav === 'queue' && (
        <div>
          {/* Sub-Tabs */}
          <div className="card mb" style={{ padding: '12px 16px' }}>
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="row" style={{ gap: 8 }}>
                {[
                  { id: 'unassigned', label: `Unassigned (${unassignedReqs.length})` },
                  { id: 'escalated', label: `Escalated (${escalatedReqs.length})` },
                  { id: 'overdue', label: `Overdue SLA (${overdueReqs.length})` },
                  { id: 'all', label: `All In-Scope (${allReqs.length})` },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setQueueTab(st.id)}
                    className={`btn btn-sm ${queueTab === st.id ? 'btn-primary' : 'btn-outline'}`}
                    style={{ borderRadius: 20 }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Queue Table */}
          {currentQueue.length === 0 ? (
            <Empty>No grievances found in this queue tab.</Empty>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tracking ID</th>
                      <th>Location / Block</th>
                      <th>Grievance Summary</th>
                      <th>Severity</th>
                      <th>Assigned Field Officer</th>
                      <th>SLA Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQueue.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="mono bold small">{r.tracking_id}</span>
                          {r.escalated && <div className="xs badge badge-red mt-xs">ESCALATED</div>}
                        </td>
                        <td>
                          <div>{r.area || 'Adilabad'}</div>
                          <div className="xs muted">{r.block || 'Zone'}</div>
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{r.text || r.translated_text}</div>
                          {r.escalation_reason && (
                            <div className="xs muted mt-xs" style={{ color: 'var(--color-destructive)' }}>
                              Escalated: "{r.escalation_reason}"
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge tone={r.severity >= 4 ? 'red' : r.severity >= 3 ? 'amber' : 'blue'}>
                            Severity {r.severity}/5
                          </Badge>
                        </td>
                        <td>
                          {r.assigned_officer ? (
                            <div className="row" style={{ gap: 6 }}>
                              <Users size={14} className="muted" />
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{r.assigned_officer}</span>
                            </div>
                          ) : (
                            <span className="xs muted italic">Unassigned</span>
                          )}
                        </td>
                        <td>
                          {r.is_overdue ? (
                            <Badge tone="red"><AlertTriangle size={11} /> Overdue</Badge>
                          ) : (
                            <span className="xs mono">{r.sla_countdown || 'On Track'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setAssignModalReq(r)}
                            className="btn btn-primary btn-sm"
                          >
                            {r.assigned_officer ? 'Reassign' : 'Assign Officer'}
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

      {/* PAGE 2: PROOF REVIEW */}
      {!loading && activeNav === 'proofs' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>Resolution Proofs Review Queue</h2>
                <p className="muted small">Parallel supervisor verification of submitted field work</p>
              </div>
              <Badge tone="blue">{proofReviewList.length} Awaiting Verification</Badge>
            </div>
          </div>

          {proofReviewList.length === 0 ? (
            <Empty>No completed proofs awaiting review.</Empty>
          ) : (
            <div className="grid g-2">
              {proofReviewList.map((pr) => (
                <div key={pr.id} className="card" style={{ padding: 18 }}>
                  <div className="row-between mb">
                    <span className="mono bold small">{pr.tracking_id}</span>
                    <Badge tone="amber">Awaiting Review</Badge>
                  </div>

                  <p style={{ fontWeight: 600, fontSize: 14 }}>{pr.text || pr.translated_text}</p>

                  <div className="card mt mb" style={{ background: 'var(--color-bg)', padding: 12 }}>
                    <div className="xs muted bold mb-xs">OFFICER RESOLUTION NOTES</div>
                    <div style={{ fontSize: 13 }}>{pr.closure_note || 'Physical repair work completed on site.'}</div>
                    <div className="row-between xs muted mt">
                      <span>Submitted by: <strong>{pr.assigned_officer || 'Field Officer'}</strong></span>
                      <span>{ago(pr.resolved_at || pr.updated_at)}</span>
                    </div>
                  </div>

                  {pr.proof_url && (
                    <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', maxHeight: 180, border: '1px solid var(--color-border)' }}>
                      <img src={pr.proof_url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div className="row-between mt">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setSelectedProof({ req: pr, action: 'rework' })}
                    >
                      Send Back for Rework
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedProof({ req: pr, action: 'accept' })}
                    >
                      <CheckCircle2 size={15} />
                      Accept & Close
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PAGE 3: FIELD TEAM */}
      {!loading && activeNav === 'team' && (
        <div>
          <div className="card mb">
            <div className="row-between">
              <div>
                <h2>Subordinate Field Officers</h2>
                <p className="muted small">Manage workload, resolution speed, and ground officers in your department</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setAddOfficerOpen(true)}
              >
                <UserPlus size={15} />
                Create Field Officer Account
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Officer Name</th>
                    <th>Jurisdiction Block</th>
                    <th>Open Workload</th>
                    <th>Total Assigned</th>
                    <th>Resolved</th>
                    <th>Overdue</th>
                    <th>Dispute Rate</th>
                    <th>Avg Resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="xs muted mono">@{m.username}</div>
                      </td>
                      <td>
                        <Badge tone="gray">{m.block || 'Block'}</Badge>
                      </td>
                      <td>
                        <Badge tone={m.open_workload > 5 ? 'red' : m.open_workload > 2 ? 'amber' : 'green'}>
                          {m.open_workload || 0} active
                        </Badge>
                      </td>
                      <td>{m.assigned_count || 0}</td>
                      <td style={{ color: 'var(--color-primary)' }}>{m.resolved_count || 0}</td>
                      <td>
                        {m.overdue_count > 0 ? (
                          <Badge tone="red">{m.overdue_count}</Badge>
                        ) : (
                          <span className="muted xs">0</span>
                        )}
                      </td>
                      <td>{m.reopen_rate || 0}%</td>
                      <td>{m.avg_resolution_hours || 0} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAGE 4: SECTOR CLUSTERS */}
      {!loading && activeNav === 'clusters' && (
        <div>
          <div className="card mb">
            <h2>{user?.department?.toUpperCase() || 'Sector'} Demand Clusters</h2>
            <p className="muted small">High-density citizen complaint clusters ready for capital project proposals</p>
          </div>

          <div className="grid g-2">
            {clusters.map((c) => (
              <div key={c.id} className="card">
                <div className="row-between mb">
                  <Badge tone="purple">{c.category?.toUpperCase()}</Badge>
                  <span className="xs muted">{c.request_count || 0} complaints</span>
                </div>
                <h3 style={{ fontSize: 16 }}>{c.title || `Cluster #${c.id}`}</h3>
                <p className="muted small">{c.area?.name || 'Local District Area'}</p>

                <div className="grid g-2 mt mb" style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 6 }}>
                  <div>
                    <div className="xs muted">Beneficiaries</div>
                    <strong>{c.unique_households || 1} households</strong>
                  </div>
                  <div>
                    <div className="xs muted">Average Severity</div>
                    <strong>{c.severity_avg?.toFixed(1) || '3.5'} / 5</strong>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                  onClick={() => setProposeCluster(c)}
                >
                  <Sparkles size={15} />
                  Propose Capital Project
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAGE 5: PROPOSALS PIPELINE */}
      {!loading && activeNav === 'proposals' && (
        <div>
          <div className="card mb">
            <h2>Department Project Proposals</h2>
            <p className="muted small">Track stages from District Collector approval to National Funding</p>
          </div>

          {proposals.length === 0 ? (
            <Empty>No project proposals submitted yet. Go to Sector Clusters to propose projects.</Empty>
          ) : (
            <div className="grid g-2">
              {proposals.map((p) => (
                <div key={p.id} className="card">
                  <div className="row-between mb">
                    <span className="mono bold small">{p.code || `PRJ-${p.id}`}</span>
                    <Badge tone={p.status === 'completed' ? 'green' : p.status === 'funded' ? 'blue' : p.status.includes('rejected') ? 'red' : 'amber'}>
                      {p.status?.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <h3>{p.title}</h3>
                  <p className="muted small">{p.description}</p>

                  <div className="grid g-3 mt mb" style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 6 }}>
                    <div>
                      <div className="xs muted">Est. Cost</div>
                      <strong>{inr(p.cost_local || 0)}</strong>
                    </div>
                    <div>
                      <div className="xs muted">Sanctioned</div>
                      <strong>{inr(p.sanctioned_amount_inr || 0)}</strong>
                    </div>
                    <div>
                      <div className="xs muted">Spent</div>
                      <strong>{inr(p.spent_amount_inr || 0)}</strong>
                    </div>
                  </div>

                  {/* Stage Flow */}
                  <div className="xs muted mt">
                    Pipeline Flow: <strong>proposed → district → state → funded</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ASSIGN TO FIELD OFFICER */}
      {assignModalReq && (
        <AssignFieldOfficerModal
          complaint={assignModalReq}
          team={team}
          onClose={() => setAssignModalReq(null)}
          onAssigned={() => {
            setAssignModalReq(null)
            reload()
            reloadTeam()
          }}
        />
      )}

      {/* MODAL 2: PROPOSE PROJECT MODAL */}
      {proposeCluster && (
        <ProposeProjectModal
          cluster={proposeCluster}
          onClose={() => setProposeCluster(null)}
          onProposed={() => {
            setProposeCluster(null)
            reload()
          }}
        />
      )}

      {/* MODAL 3: ADD FIELD OFFICER MODAL */}
      {addOfficerOpen && (
        <CreateFieldOfficerModal
          onClose={() => setAddOfficerOpen(false)}
          onCreated={() => {
            setAddOfficerOpen(false)
            reloadTeam()
          }}
        />
      )}

      {/* MODAL 4: PROOF REVIEW DECISION MODAL */}
      {selectedProof && (
        <ProofReviewModal
          data={selectedProof}
          onClose={() => setSelectedProof(null)}
          onReviewed={() => {
            setSelectedProof(null)
            reload()
          }}
        />
      )}
    </OfficerShell>
  )
}

function AssignFieldOfficerModal({ complaint, team, onClose, onAssigned }) {
  const [selectedFoId, setSelectedFoId] = useState(team[0]?.id || '')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAssign = async () => {
    if (!selectedFoId) {
      setError(new Error('Please select a field officer.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.assignFieldOfficer(complaint.id, {
        field_officer_id: Number(selectedFoId),
        note: note.trim() || undefined,
      })
      onAssigned()
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
          <h3>Assign Field Officer</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Select Field Officer (Showing Current Open Workload)</label>
          <select
            className="select"
            value={selectedFoId}
            onChange={(e) => setSelectedFoId(e.target.value)}
          >
            {team.map((fo) => (
              <option key={fo.id} value={fo.id}>
                {fo.name} ({fo.block || 'Block'}) — {fo.open_workload || 0} active cases
              </option>
            ))}
          </select>
        </div>

        <div className="field mb">
          <label>Assignment Instructions (Optional)</label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Special instructions for site survey and priority SLA."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssign} disabled={loading}>
            {loading ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ProposeProjectModal({ cluster, onClose, onProposed }) {
  const [title, setTitle] = useState(`Redressal & Infrastructure for ${cluster.title || cluster.category}`)
  const [desc, setDesc] = useState(`Comprehensive solution resolving ${cluster.request_count || 1} citizen complaints across ${cluster.unique_households || 1} households.`)
  const [cost, setCost] = useState('2500000')
  const [scheme, setScheme] = useState('Mission Bhagiratha / Jal Jeevan Mission')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePropose = async () => {
    if (!title || !cost) return
    setLoading(true)
    setError(null)
    try {
      await api.proposeProject({
        cluster_id: cluster.id,
        title: title.trim(),
        description: desc.trim(),
        estimated_cost_inr: Number(cost),
        scheme: scheme.trim(),
      })
      onProposed()
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, borderRadius: 12 }}>
        <div className="row-between mb">
          <h3>Propose Capital Project from Cluster</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Project Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Estimated Cost (INR)</label>
          <input className="input" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Convergence Government Scheme</label>
          <input className="input" value={scheme} onChange={(e) => setScheme(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Project Description & Scope</label>
          <textarea className="textarea" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePropose} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit to District Collector'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateFieldOfficerModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('field123')
  const [title, setTitle] = useState('Field Redressal Officer')
  const [block, setBlock] = useState('Utnoor')
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
        block: block.trim(),
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
          <h3>Create Field Officer Account</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        <div className="field mb">
          <label>Officer Full Name</label>
          <input className="input" placeholder="e.g. S. Murali" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Username</label>
          <input className="input" placeholder="e.g. field_indervelly" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>

        <div className="field mb">
          <label>Jurisdiction Block / Ward</label>
          <input className="input" value={block} onChange={(e) => setBlock(e.target.value)} />
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

function ProofReviewModal({ data: { req, action }, onClose, onReviewed }) {
  const [reworkNote, setReworkNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleDecision = async () => {
    if (action === 'rework' && reworkNote.trim().length < 5) {
      setError(new Error('Please enter a mandatory note explaining what needs rework.'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.reviewProofDecision(req.id, {
        decision: action,
        note: reworkNote.trim() || undefined,
      })
      onReviewed()
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
          <h3>{action === 'accept' ? 'Accept & Confirm Resolution' : 'Request Rework from Field Officer'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <ErrorBox error={error} />

        {action === 'accept' ? (
          <p className="muted mb">
            Confirming this proof moves the complaint to <strong>Resolved (Pending Citizen Confirmation)</strong>. The citizen will be notified automatically.
          </p>
        ) : (
          <div className="field mb">
            <label>Mandatory Rework Note</label>
            <textarea
              className="textarea"
              rows={4}
              placeholder="Explain the defect or incomplete work (e.g. debris not cleared, asphalt thickness insufficient)."
              value={reworkNote}
              onChange={(e) => setReworkNote(e.target.value)}
            />
          </div>
        )}

        <div className="row-between mt">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${action === 'accept' ? 'btn-primary' : 'btn-danger'}`}
            onClick={handleDecision}
            disabled={loading}
          >
            {loading ? 'Processing...' : action === 'accept' ? 'Confirm & Accept' : 'Send Back for Rework'}
          </button>
        </div>
      </div>
    </div>
  )
}
