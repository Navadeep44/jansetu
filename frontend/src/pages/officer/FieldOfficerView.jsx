import { useState, useEffect, useRef } from 'react'
import {
  Inbox, Clock, AlertTriangle, CheckCircle2, Camera, Upload, MapPin,
  Flame, RefreshCw, AlertCircle, FileText, ArrowRight, ShieldAlert,
  ChevronRight, Phone, Eye, Check, X, Navigation
} from 'lucide-react'
import { api } from '../../api/client'
import { useApp } from '../../context/AppContext'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, ErrorBox, Loading, Empty, Stat } from '../../components/ui'
import { CHANNEL_LABEL, LANG_NAMES, SECTORS, ago, date } from '../../lib/format'
import OfficerShell from './OfficerShell'

export default function FieldOfficerView() {
  const { user, t } = useApp()
  const [activeNav, setActiveNav] = useState('inbox')
  const [statusFilter, setStatusFilter] = useState('all')
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [selectedReq, setSelectedReq] = useState(null)

  // Load Dashboard Data
  const { data, loading, error, reload } = useAsync(() => api.officerDashboard(), [])

  const complaints = data?.inbox || []
  const kpis = data?.kpis || {}

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (onlyOverdue && !c.is_overdue) return false
    if (statusFilter === 'all') return true
    if (statusFilter === 'new') return c.status === 'assigned' || c.status === 'received'
    if (statusFilter === 'in_progress') return c.status === 'in_progress'
    if (statusFilter === 'rework') return c.status === 'assigned' && Boolean(c.rework_note)
    if (statusFilter === 'reopened') return c.status === 'reopened' || c.reopen_flag
    return true
  })

  // Sort: Overdue & shortest SLA due time first, then highest urgency
  const sortedComplaints = [...filtered].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1
    if (!a.is_overdue && b.is_overdue) return 1
    if (a.sla_due_at && b.sla_due_at) return new Date(a.sla_due_at) - new Date(b.sla_due_at)
    return (b.severity || 0) - (a.severity || 0)
  })

  const navItems = [
    { id: 'inbox', label: 'My Inbox', icon: Inbox, count: complaints.filter(c => c.status !== 'closed' && c.status !== 'resolved_pending_verification').length },
    { id: 'performance', label: 'My Performance', icon: Clock },
  ]

  const jurisdictionStr = `${user?.block || 'Block'}, ${user?.district || 'District'}`

  const kpiCards = (
    <>
      <Stat label="Assigned Tasks" value={kpis.assigned || 0} icon={Inbox} tone="blue" />
      <Stat label="Pending / In-Prog" value={kpis.pending || 0} icon={Clock} tone="amber" />
      <Stat label="Overdue SLA" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
      <Stat label="Resolved" value={kpis.resolved || 0} icon={CheckCircle2} tone="green" />
      <Stat label="Reopened Cases" value={kpis.reopened || 0} icon={RefreshCw} tone={kpis.reopened > 0 ? 'purple' : 'gray'} />
      <Stat label="Avg Resolution" value={`${kpis.avg_resolution_hours || 0} hrs`} icon={Clock} />
    </>
  )

  return (
    <OfficerShell
      roleTitle="Field Redressal Officer"
      jurisdictionText={jurisdictionStr}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={setActiveNav}
      badgeTone="green"
      kpis={kpiCards}
    >
      <ErrorBox error={error} />
      {loading && <Loading height={200} />}

      {!loading && activeNav === 'inbox' && (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* Action & Filter Bar (Mobile-Optimized) */}
          <div
            className="card mb"
            style={{
              padding: '14px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Filter Tabs */}
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'new', label: 'New' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'rework', label: 'Rework Required' },
                { id: 'reopened', label: 'Disputed / Reopened' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`btn btn-sm ${statusFilter === f.id ? 'btn-primary' : 'btn-outline'}`}
                  style={{ borderRadius: 20, minHeight: 36 }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Overdue Toggle */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                color: onlyOverdue ? 'var(--color-destructive)' : 'var(--color-text)',
              }}
            >
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => setOnlyOverdue(e.target.checked)}
                style={{ accentColor: 'var(--color-destructive)' }}
              />
              <AlertTriangle size={15} />
              Show Overdue Only ({complaints.filter(c => c.is_overdue).length})
            </label>
          </div>

          {/* Complaints List */}
          {sortedComplaints.length === 0 ? (
            <Empty>No assigned complaints in this queue.</Empty>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sortedComplaints.map((c) => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  onSelect={() => setSelectedReq(c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {!loading && activeNav === 'performance' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Card title="My Ground Redressal Performance" sub="Real-time verified metrics for your assigned jurisdiction">
            <div className="grid g-3 mt mb">
              <Stat label="Total Assigned" value={kpis.assigned || 0} icon={Inbox} tone="blue" />
              <Stat label="Resolved Successfully" value={kpis.resolved || 0} icon={CheckCircle2} tone="green" />
              <Stat label="Active Work in Progress" value={kpis.pending || 0} icon={Clock} tone="amber" />
              <Stat label="Overdue SLA Breaches" value={kpis.overdue || 0} icon={AlertTriangle} tone={kpis.overdue > 0 ? 'red' : 'green'} />
              <Stat label="Citizen Dispute Rate" value={`${kpis.reopen_rate || 0}%`} icon={RefreshCw} tone={kpis.reopen_rate > 10 ? 'red' : 'green'} />
              <Stat label="Average Turnaround" value={`${kpis.avg_resolution_hours || 0} hrs`} icon={Clock} />
            </div>

            <div className="alert alert-info mt">
              <CheckCircle2 size={16} />
              <span>
                Resolving complaints with geotagged on-site photo proofs ensures instant citizen verification and maintains high departmental service scores.
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Modal / Sheet for Complaint Detail & Actions */}
      {selectedReq && (
        <ComplaintDetailModal
          complaint={selectedReq}
          onClose={() => setSelectedReq(null)}
          onUpdated={() => {
            setSelectedReq(null)
            reload()
          }}
        />
      )}
    </OfficerShell>
  )
}

function ComplaintCard({ complaint: c, onSelect }) {
  const isOverdue = c.is_overdue
  const isReopened = c.status === 'reopened' || c.reopen_flag
  const isRework = Boolean(c.rework_note)
  const isResolved = c.status === 'closed' || c.status === 'resolved_pending_verification'

  return (
    <div
      onClick={onSelect}
      className={`card ${isOverdue ? 'highlight' : ''}`}
      style={{
        padding: '16px',
        cursor: 'pointer',
        borderColor: isOverdue ? 'var(--color-destructive)' : isReopened ? '#a855f7' : isRework ? '#f59e0b' : undefined,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div className="row-between">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="mono small bold" style={{ color: 'var(--color-primary)' }}>{c.tracking_id}</span>
          {isOverdue && <Badge tone="red"><AlertTriangle size={11} /> OVERDUE SLA</Badge>}
          {isReopened && <Badge tone="purple"><RefreshCw size={11} /> CITIZEN DISPUTED</Badge>}
          {isRework && <Badge tone="amber"><AlertCircle size={11} /> REWORK REQUESTED</Badge>}
          <Badge tone={isResolved ? 'green' : 'blue'}>{c.status?.replace(/_/g, ' ').toUpperCase()}</Badge>
        </div>
        <span className="xs muted">{ago(c.created_at)}</span>
      </div>

      <p style={{ margin: '8px 0', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>
        {c.text || c.translated_text}
      </p>

      {/* Rework / Dispute Alert Notes */}
      {c.rework_note && (
        <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 10px', borderRadius: 6, fontSize: 12, color: '#92400e', marginBottom: 8 }}>
          <strong>Supervisor Note:</strong> {c.rework_note}
        </div>
      )}
      {c.dispute_reason && (
        <div style={{ background: '#faf5ff', border: '1px solid #f3e8ff', padding: '6px 10px', borderRadius: 6, fontSize: 12, color: '#6b21a8', marginBottom: 8 }}>
          <strong>Citizen Dispute:</strong> "{c.dispute_reason}"
        </div>
      )}

      <div className="row-between xs muted" style={{ marginTop: 6, borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
        <div className="row" style={{ gap: 12 }}>
          <span>📍 {c.area || 'Ward'}</span>
          <span>⚡ Severity {c.severity}/5</span>
          {c.sla_countdown && <span style={{ color: isOverdue ? 'var(--color-destructive)' : undefined }}>⏳ {c.sla_countdown}</span>}
        </div>
        <div className="row" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          <span>Inspect & Act</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  )
}

function ComplaintDetailModal({ complaint, onClose, onUpdated }) {
  const { t } = useApp()
  const [tab, setTab] = useState('details')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [escalateReason, setEscalateReason] = useState('')
  const [loadingAction, setLoadingAction] = useState(false)
  const [error, setError] = useState(null)

  // Proof submission states
  const [proofNote, setProofNote] = useState('')
  const [proofPhotos, setProofPhotos] = useState([])
  const [geoLat, setGeoLat] = useState(null)
  const [geoLng, setGeoLng] = useState(null)
  const [geoWarning, setGeoWarning] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef(null)

  // Capture device GPS
  const captureGPS = () => {
    if (!navigator.geolocation) {
      setError(new Error('Geolocation is not supported on this device.'))
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setGeoLat(lat)
        setGeoLng(lng)
        setGettingLocation(false)

        // Calculate distance from complaint location if available
        if (complaint.lat && complaint.lng) {
          const dKm = calcDistanceKm(lat, lng, complaint.lat, complaint.lng)
          if (dKm > 0.5) {
            setGeoWarning(`Warning: Your GPS is ${(dKm * 1000).toFixed(0)}m away from the complaint site.`)
          } else {
            setGeoWarning(null)
          }
        }
      },
      (err) => {
        setGettingLocation(false)
        setError(new Error(`Unable to fetch GPS location: ${err.message}`))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Handle Photo Uploads
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setProofPhotos((prev) => [...prev, { name: file.name, url: ev.target.result }])
      }
      reader.readAsDataURL(file)
    })
    if (!geoLat) captureGPS()
  }

  // Action 1: Update Status with plain-language note
  const handleUpdateStatus = async () => {
    if (!note.trim()) {
      setError(new Error('Please provide a short plain-language update note.'))
      return
    }
    setLoadingAction(true)
    setError(null)
    try {
      if (status === 'in_progress') {
        await api.markInProgress(complaint.id, {
          note: note.trim(),
          officer_name: 'Field Officer',
        })
      }
      onUpdated()
    } catch (e) {
      setError(e)
    } finally {
      setLoadingAction(false)
    }
  }

  // Action 2: Submit Proof of Resolution
  const handleSubmitProof = async () => {
    if (!proofNote.trim()) {
      setError(new Error('Please provide resolution notes explaining the completed work.'))
      return
    }
    if (proofPhotos.length === 0) {
      setError(new Error('At least one geotagged resolution photo proof is required.'))
      return
    }
    setLoadingAction(true)
    setError(null)
    try {
      await api.resolveWithProof(complaint.id, {
        closure_note: proofNote.trim(),
        proof_files: proofPhotos.map((p) => p.url),
        lat: geoLat || complaint.lat || 19.34,
        lng: geoLng || complaint.lng || 78.52,
        officer_name: 'Field Officer',
      })
      onUpdated()
    } catch (e) {
      setError(e)
    } finally {
      setLoadingAction(false)
    }
  }

  // Action 3: "Cannot Resolve" Escalation
  const handleEscalate = async () => {
    if (escalateReason.trim().length < 5) {
      setError(new Error('Please provide a detailed reason why this cannot be resolved on ground.'))
      return
    }
    setLoadingAction(true)
    setError(null)
    try {
      await api.escalateComplaint(complaint.id, {
        reason: escalateReason.trim(),
      })
      onUpdated()
    } catch (e) {
      setError(e)
    } finally {
      setLoadingAction(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 12,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-surface)',
          }}
        >
          <div>
            <div className="row" style={{ gap: 8 }}>
              <strong style={{ fontSize: 16 }}>{complaint.tracking_id}</strong>
              <Badge tone={complaint.is_overdue ? 'red' : 'blue'}>
                {complaint.status?.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="xs muted mt-xs">
              📍 {complaint.area || 'Local Area'} · SLA Due: {complaint.sla_countdown || 'On Track'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Action Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-subtle)' }}>
          {[
            { id: 'details', label: 'Details & Timeline' },
            { id: 'update', label: 'Update Status' },
            { id: 'proof', label: '📸 Submit Proof' },
            { id: 'escalate', label: '⚠️ Cannot Resolve' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(null) }}
              style={{
                flex: 1,
                padding: '12px 6px',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--color-primary)' : 'none',
                background: tab === t.id ? 'var(--color-surface)' : 'transparent',
                fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <ErrorBox error={error} />

          {/* TAB 1: DETAILS & TIMELINE */}
          {tab === 'details' && (
            <div>
              <div className="field mb">
                <label className="muted xs">Grievance Description</label>
                <div style={{ fontSize: 15, fontWeight: 500, padding: 10, background: 'var(--color-bg)', borderRadius: 6 }}>
                  {complaint.original_text || complaint.text}
                </div>
                {complaint.translated_text && complaint.translated_text !== complaint.original_text && (
                  <div className="xs muted mt-xs">Translated: {complaint.translated_text}</div>
                )}
              </div>

              {/* Data Privacy: Masked phone, NO citizen name */}
              <div className="grid g-2 mb">
                <div className="field">
                  <label className="muted xs">Citizen Contact (Privacy Protected)</label>
                  <div className="row mono" style={{ gap: 6 }}>
                    <Phone size={14} className="muted" />
                    <strong>{complaint.citizen_phone_masked || '•••• 5667'}</strong>
                  </div>
                </div>
                <div className="field">
                  <label className="muted xs">Location Coordinates</label>
                  <div className="row mono" style={{ gap: 6 }}>
                    <MapPin size={14} className="muted" />
                    <span>{complaint.lat?.toFixed(4) || '19.3400'}° N, {complaint.lng?.toFixed(4) || '78.5200'}° E</span>
                  </div>
                </div>
              </div>

              {/* Rework or Dispute Callouts */}
              {complaint.rework_note && (
                <div className="alert alert-warning mb">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Supervisor Rework Note:</strong>
                    <div>{complaint.rework_note}</div>
                  </div>
                </div>
              )}
              {complaint.dispute_reason && (
                <div className="alert alert-danger mb">
                  <RefreshCw size={16} />
                  <div>
                    <strong>Citizen Dispute Feedback:</strong>
                    <div>"{complaint.dispute_reason}"</div>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div className="mt">
                <label className="muted xs bold">Progress Timeline</label>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(complaint.history || []).map((h, i) => (
                    <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 5 }} />
                      <div style={{ flex: 1 }}>
                        <div className="bold">{h.stage_label || h.status}</div>
                        <div className="xs muted">{h.actor_role} · {h.created_at ? ago(h.created_at) : 'recently'}</div>
                        {h.note && <div className="xs" style={{ marginTop: 2 }}>{h.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPDATE STATUS */}
          {tab === 'update' && (
            <div>
              <div className="field mb">
                <label>Status</label>
                <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="in_progress">Work In Progress / Site Inspected</option>
                </select>
              </div>

              <div className="field mb">
                <label>Plain-Language Progress Note (Citizen-visible)</label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="e.g. Field inspection completed. Repair crew and asphalt paver deployed on site."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 44 }}
                disabled={loadingAction || !note.trim()}
                onClick={handleUpdateStatus}
              >
                {loadingAction ? 'Updating...' : 'Post Progress Update'}
              </button>
            </div>
          )}

          {/* TAB 3: SUBMIT PROOF OF RESOLUTION */}
          {tab === 'proof' && (
            <div>
              <div className="alert alert-info mb">
                <Camera size={16} />
                <span>
                  Mandatory proof requirement: Upload before & after on-ground photos with GPS verification.
                </span>
              </div>

              {/* Geotag GPS Bar */}
              <div
                style={{
                  padding: '10px 14px',
                  background: 'var(--color-bg)',
                  borderRadius: 8,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div className="row" style={{ gap: 8, fontSize: 13 }}>
                  <Navigation size={16} color={geoLat ? 'green' : 'var(--color-muted)'} />
                  <span>
                    {geoLat ? `GPS Tagged: ${geoLat.toFixed(4)}° N, ${geoLng.toFixed(4)}° E` : 'GPS Coordinates not captured'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={gettingLocation}
                  className="btn btn-outline btn-sm"
                >
                  {gettingLocation ? 'Fetching...' : 'Capture GPS'}
                </button>
              </div>

              {geoWarning && (
                <div className="alert alert-warning mb" style={{ fontSize: 12 }}>
                  <AlertTriangle size={15} />
                  <span>{geoWarning}</span>
                </div>
              )}

              {/* Photos Upload */}
              <div className="field mb">
                <label>Resolution Photos (Before & After)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-outline"
                  style={{ width: '100%', minHeight: 44, borderStyle: 'dashed' }}
                >
                  <Camera size={18} />
                  <span>Capture Photo / Upload Proof Images</span>
                </button>

                {/* Previews */}
                {proofPhotos.length > 0 && (
                  <div className="row mt" style={{ gap: 10, flexWrap: 'wrap' }}>
                    {proofPhotos.map((p, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 90, height: 90, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <img src={p.url} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setProofPhotos(proofPhotos.filter((_, i) => i !== idx))}
                          style={{
                            position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)',
                            color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution Note */}
              <div className="field mb">
                <label>Resolution Details & Action Taken</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Explain the physical repair/work completed (e.g. replaced 40m cracked pipeline and tested water pressure)."
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 44 }}
                disabled={loadingAction || proofPhotos.length === 0 || !proofNote.trim()}
                onClick={handleSubmitProof}
              >
                {loadingAction ? 'Submitting Proof...' : 'Submit Resolution Proof'}
              </button>
            </div>
          )}

          {/* TAB 4: ESCALATE CANNOT RESOLVE */}
          {tab === 'escalate' && (
            <div>
              <div className="alert alert-danger mb">
                <ShieldAlert size={16} />
                <span>
                  Use this action only if the problem requires higher-level sanction, major budget approval, or cross-department intervention.
                </span>
              </div>

              <div className="field mb">
                <label>Mandatory Escalation Reason</label>
                <textarea
                  className="textarea"
                  rows={4}
                  placeholder="Explain why this cannot be redressed with field-level resources (e.g. requires complete road reconstruction or cross-department clearance)."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                />
              </div>

              <button
                className="btn btn-danger"
                style={{ width: '100%', minHeight: 44 }}
                disabled={loadingAction || escalateReason.trim().length < 5}
                onClick={handleEscalate}
              >
                {loadingAction ? 'Escalating...' : 'Confirm Escalation to Supervisor'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
