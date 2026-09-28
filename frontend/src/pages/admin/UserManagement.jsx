import { useEffect, useState } from 'react'
import {
  Building2, CheckCircle2, Filter, KeyRound, MapPin, Plus,
  Search, ShieldAlert, ShieldCheck, Trash2, UserCheck, UserPlus, Users, X
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, PageHead } from '../../components/ui'

const ROLE_BADGE_COLOR = {
  super_admin: 'badge-red',
  admin: 'badge-blue',
  state_officer: 'badge-amber',
  district_officer: 'badge-green',
  dept_officer: 'badge-violet',
  field_officer: 'badge-blue',
  citizen: 'badge-gray',
}

export default function UserManagement() {
  const { user: currentUser, isSuperAdmin, t } = useApp()
  const [roleFilter, setRoleFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  // Directory metadata
  const metaAsync = useAsync(() => api.rolesAndJurisdictions(), [])
  const statsAsync = useAsync(() => api.adminStats(), [])
  
  // Users list
  const [usersData, setUsersData] = useState({ total: 0, items: [] })
  const [loadingUsers, setLoadingUsers] = useState(false)

  const loadUsers = async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      const res = await api.adminUsers({
        role: roleFilter === 'all' ? undefined : roleFilter,
        state: stateFilter === 'all' ? undefined : stateFilter,
        search: search.trim() || undefined,
      })
      setUsersData(res || { total: 0, items: [] })
    } catch (err) {
      setError(err)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [roleFilter, stateFilter])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    loadUsers()
  }

  // Create Officer Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    title: '',
    role: 'district_officer',
    state: 'Telangana',
    district: 'Adilabad',
    department: 'water',
  })

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.createOfficer(formData)
      setMsg(res.message || 'Officer account created successfully.')
      setShowCreateModal(false)
      setFormData({
        username: '',
        password: '',
        name: '',
        title: '',
        role: 'district_officer',
        state: 'Telangana',
        district: 'Adilabad',
        department: 'water',
      })
      loadUsers()
      statsAsync.reload()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!editUser) return
    setSubmitting(true)
    setError(null)
    try {
      await api.updateOfficer(editUser.id, {
        name: editUser.name,
        title: editUser.title,
        role: editUser.role,
        state: editUser.state,
        district: editUser.district,
        department: editUser.department,
        is_active: editUser.is_active,
      })
      setMsg(`User ${editUser.username} updated successfully.`)
      setEditUser(null)
      loadUsers()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (id, username) => {
    if (!window.confirm(`Deactivate account for ${username}?`)) return
    try {
      await api.deleteOfficer(id)
      setMsg(`Officer ${username} deactivated.`)
      loadUsers()
      statsAsync.reload()
    } catch (err) {
      setError(err)
    }
  }

  const rolesMeta = metaAsync.data?.roles || []
  const statesTree = metaAsync.data?.states_and_districts || []
  const departments = metaAsync.data?.departments || []
  const selectedStateObj = statesTree.find(s => s.state === (editUser ? editUser.state : formData.state))
  const availableDistricts = selectedStateObj?.districts || []

  return (
    <div className="stack-md">
      <PageHead
        title={t('user_management_title', 'User & Officer Access Management')}
        actions={
          isSuperAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <UserPlus size={16} aria-hidden="true" /> {t('add_new_officer', 'Create Officer Account')}
            </button>
          )
        }
      >
        {t('user_management_sub', 'Hierarchical role-based access control (RBAC), administrative jurisdictions, and active officer accounts.')}
      </PageHead>

      <ErrorBox error={error} />
      {msg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} aria-hidden="true" />
          <div>{msg}</div>
        </div>
      )}

      {/* RBAC System Statistics */}
      {statsAsync.data && (
        <div className="grid g-4" aria-label="RBAC System Statistics">
          <div className="card stat tile-blue">
            <span className="stat-label"><Users size={16} /> Total Officers</span>
            <span className="stat-value">{statsAsync.data.total_officers}</span>
          </div>
          <div className="card stat tile-green">
            <span className="stat-label"><Building2 size={16} /> States Covered</span>
            <span className="stat-value">{statsAsync.data.states_covered}</span>
          </div>
          <div className="card stat tile-amber">
            <span className="stat-label"><MapPin size={16} /> Districts Covered</span>
            <span className="stat-value">{statsAsync.data.districts_covered}</span>
          </div>
          <div className="card stat tile-blue">
            <span className="stat-label"><ShieldCheck size={16} /> Proofs Verified</span>
            <span className="stat-value">{statsAsync.data.total_proofs_verified}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <form onSubmit={handleSearchSubmit} className="row" style={{ flex: 1, minWidth: 280 }}>
            <input
              className="input"
              placeholder="Search by name, username or designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn"><Search size={16} /> Search</button>
          </form>

          <div className="row" style={{ gap: 8 }}>
            <label className="row small">
              <span className="muted">Role:</span>
              <select className="select" style={{ width: 'auto', minHeight: 36 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                {rolesMeta.map((r) => (
                  <option key={r.role} value={r.role}>{r.label}</option>
                ))}
              </select>
            </label>

            <label className="row small">
              <span className="muted">State:</span>
              <select className="select" style={{ width: 'auto', minHeight: 36 }} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                <option value="all">All States</option>
                {statesTree.map((s) => (
                  <option key={s.state} value={s.state}>{s.state}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>

      {/* Officers and Users Table */}
      <Card title={`Registered Accounts (${usersData.total})`} sub="Role designations and territorial jurisdiction boundaries">
        {loadingUsers ? <Loading height={240} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Officer / User</th>
                  <th>Role Rank</th>
                  <th>Assigned Jurisdiction</th>
                  <th>Department / Sector</th>
                  <th>Status</th>
                  {isSuperAdmin && <th className="num">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(usersData.items || []).map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                    <td>
                      <div><strong>{u.name}</strong></div>
                      <div className="xs muted mono">{u.username} · {u.title || 'Official'}</div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE_COLOR[u.role] || 'badge-blue'}`}>
                        {u.role.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="small">
                      {u.role === 'super_admin' || u.role === 'admin' ? (
                        <span className="badge badge-dark">National (All States)</span>
                      ) : (
                        <span>
                          {u.state || 'All States'} {u.district ? `· ${u.district}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="small">
                      {u.department ? (
                        <span className="badge badge-violet">{u.department.toUpperCase()}</span>
                      ) : (
                        <span className="muted xs">All Departments</span>
                      )}
                    </td>
                    <td>
                      {u.is_active ? (
                        <span className="badge badge-green xs">Active</span>
                      ) : (
                        <span className="badge badge-red xs">Deactivated</span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="num">
                        <div className="row justify-end" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => setEditUser({ ...u })}
                            title="Edit Role or Jurisdiction"
                          >
                            Edit
                          </button>
                          {u.username !== 'superadmin' && u.is_active && (
                            <button
                              className="btn btn-sm btn-danger"
                              style={{ padding: '4px 8px' }}
                              onClick={() => handleDeactivate(u.id, u.username)}
                              title="Deactivate Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Officer Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Officer Account</h3>
              <button className="btn btn-sm" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body stack-md">
                <div className="grid g-2">
                  <div className="field">
                    <label>Full Name</label>
                    <input className="input" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Dr. Ramesh Chandra, IAS" />
                  </div>
                  <div className="field">
                    <label>Designation / Title</label>
                    <input className="input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. District Magistrate" />
                  </div>
                </div>

                <div className="grid g-2">
                  <div className="field">
                    <label>Username</label>
                    <input className="input mono" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="e.g. dm_warangal" />
                  </div>
                  <div className="field">
                    <label>Temporary Password</label>
                    <input className="input" type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" />
                  </div>
                </div>

                <div className="field">
                  <label>Role Rank</label>
                  <select className="select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    {rolesMeta.map((r) => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                  <span className="help">{rolesMeta.find(r => r.role === formData.role)?.description}</span>
                </div>

                {formData.role !== 'super_admin' && formData.role !== 'admin' && (
                  <div className="grid g-2">
                    <div className="field">
                      <label>State</label>
                      <select className="select" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })}>
                        {statesTree.map((s) => (
                          <option key={s.state} value={s.state}>{s.state}</option>
                        ))}
                      </select>
                    </div>

                    {['district_officer', 'field_officer'].includes(formData.role) && (
                      <div className="field">
                        <label>District Jurisdiction</label>
                        <select className="select" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })}>
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {['dept_officer', 'field_officer'].includes(formData.role) && (
                  <div className="field">
                    <label>Department / Ministry</label>
                    <select className="select" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>{dep.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Account…' : 'Create Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Officer Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal-dialog modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit Jurisdiction: {editUser.username}</h3>
              <button className="btn btn-sm" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-body stack-md">
                <div className="grid g-2">
                  <div className="field">
                    <label>Full Name</label>
                    <input className="input" value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Title</label>
                    <input className="input" value={editUser.title} onChange={(e) => setEditUser({ ...editUser, title: e.target.value })} />
                  </div>
                </div>

                <div className="field">
                  <label>Role</label>
                  <select className="select" value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                    {rolesMeta.map((r) => (
                      <option key={r.role} value={r.role}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {editUser.role !== 'super_admin' && editUser.role !== 'admin' && (
                  <div className="grid g-2">
                    <div className="field">
                      <label>State</label>
                      <select className="select" value={editUser.state || ''} onChange={(e) => setEditUser({ ...editUser, state: e.target.value })}>
                        {statesTree.map((s) => (
                          <option key={s.state} value={s.state}>{s.state}</option>
                        ))}
                      </select>
                    </div>

                    {['district_officer', 'field_officer'].includes(editUser.role) && (
                      <div className="field">
                        <label>District Jurisdiction</label>
                        <select className="select" value={editUser.district || ''} onChange={(e) => setEditUser({ ...editUser, district: e.target.value })}>
                          {availableDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {['dept_officer', 'field_officer'].includes(editUser.role) && (
                  <div className="field">
                    <label>Department</label>
                    <select className="select" value={editUser.department || ''} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })}>
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>{dep.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label className="row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={editUser.is_active} onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })} />
                    <span>Account Active</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
