import { useState } from 'react'
import {
  Camera, CheckCircle2, FileText, Image as ImageIcon, MapPin,
  ShieldCheck, ShieldAlert, Star, X, XCircle, ZoomIn, AlertCircle
} from 'lucide-react'
import { Badge } from '../ui'
import { date } from '../../lib/format'

export function ProofViewer({ proofs = [], onConfirm, onDispute, isPendingVerification, closureNote, closureFlag }) {
  const [selectedProof, setSelectedProof] = useState(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  // Verification state
  const [rating, setRating] = useState(5)
  const [confirmComment, setConfirmComment] = useState('')
  const [submittingConfirm, setSubmittingConfirm] = useState(false)

  // Dispute state
  const [disputeReason, setDisputeReason] = useState('')
  const [disputePhoto, setDisputePhoto] = useState(null)
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [disputeError, setDisputeError] = useState(null)

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setDisputePhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmSubmit = async () => {
    setSubmittingConfirm(true)
    try {
      await onConfirm({ rating, comment: confirmComment })
      setShowConfirmModal(false)
    } finally {
      setSubmittingConfirm(false)
    }
  }

  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim()) {
      setDisputeError('Please describe what remains unfixed.')
      return
    }
    setSubmittingDispute(true)
    setDisputeError(null)
    try {
      await onDispute({ reason: disputeReason.trim(), photo: disputePhoto })
      setShowDisputeModal(false)
    } catch (err) {
      setDisputeError(err.message || 'Failed to submit dispute.')
    } finally {
      setSubmittingDispute(false)
    }
  }

  return (
    <div className="proof-viewer-wrapper stack">
      {/* Officer Action Taken & Proof Section */}
      <div className="card" style={{ borderLeft: '4px solid var(--color-accent)' }}>
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <span className="icon-tile tone-blue" style={{ width: 36, height: 36 }}>
              <ShieldCheck size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0 }}>Proof of Resolution</h3>
              <div className="xs muted">Uploaded by Field Officer for permanent audit verification</div>
            </div>
          </div>
          {proofs.length > 0 && <Badge tone="green">{proofs.length} Verified {proofs.length === 1 ? 'Proof' : 'Proofs'}</Badge>}
        </div>

        {closureNote && (
          <div className="mt" style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <div className="xs muted font-semibold uppercase" style={{ letterSpacing: '0.05em' }}>Action Taken Report (ATR)</div>
            <div className="small mt-xs" style={{ color: 'var(--color-foreground)', fontWeight: 500 }}>{closureNote}</div>
          </div>
        )}

        {closureFlag === 'formulaic_closure' && (
          <div className="alert alert-warn mt">
            <ShieldAlert size={18} />
            <div className="small">
              <strong>Quality Check:</strong> JanSetu AI flagged this report as formulaic (lacking specific engineering or site details). Your confirmation is required to verify actual ground resolution.
            </div>
          </div>
        )}

        {/* Proof Cards Gallery */}
        {proofs && proofs.length > 0 ? (
          <div className="proof-gallery mt">
            {proofs.map((p, i) => {
              const isPdf = p.mime_type === 'application/pdf' || p.file_type === 'document'
              return (
                <div key={p.id || i} className="proof-card" onClick={() => setSelectedProof(p)}>
                  <div className="proof-thumb-wrap">
                    {isPdf ? (
                      <div className="stack" style={{ alignItems: 'center', color: 'var(--color-primary)' }}>
                        <FileText size={48} />
                        <span className="xs font-semibold">{p.file_name || 'Document.pdf'}</span>
                      </div>
                    ) : (
                      <img src={p.file_url} alt={p.file_name} className="proof-thumb" />
                    )}
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ZoomIn size={12} /> View Proof
                    </div>
                  </div>
                  <div className="proof-meta">
                    <span className="proof-title">{p.file_name}</span>
                    <div className="row" style={{ gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                      {p.lat && p.lng && (
                        <span className="proof-tag geo">
                          <MapPin size={11} /> {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                        </span>
                      )}
                      {p.uploaded_at && <span className="proof-tag">{date(p.uploaded_at)}</span>}
                      {p.is_suspicious && <span className="proof-tag suspicious">Flagged for Audit</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="small muted mt">No proof files uploaded yet.</p>
        )}

        {/* Citizen Confirmation / Dispute Call to Action */}
        {isPendingVerification && (
          <div className="highlight mt" style={{ padding: 16, borderRadius: 8, border: '2px solid var(--color-accent)' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
              Did the department resolve your grievance satisfactorily?
            </h4>
            <p className="small muted" style={{ margin: '4px 0 12px' }}>
              Please inspect the proof above. Confirming will close your case. If the issue is not fixed, dispute it to reopen the investigation immediately.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <button className="btn btn-success" onClick={() => setShowConfirmModal(true)}>
                <CheckCircle2 size={18} /> Yes, this is fixed
              </button>
              <button className="btn btn-danger" onClick={() => setShowDisputeModal(true)}>
                <XCircle size={18} /> No, not fixed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox / Proof Detail Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={() => setSelectedProof(null)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="row" style={{ gap: 8 }}>
                <ImageIcon size={20} />
                <h3 style={{ margin: 0 }}>{selectedProof.file_name}</h3>
              </div>
              <button className="btn btn-sm" onClick={() => setSelectedProof(null)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ maxHeight: 400, overflow: 'hidden', display: 'flex', justifyContent: 'center', background: '#0f172a', borderRadius: 6 }}>
                {selectedProof.mime_type === 'application/pdf' ? (
                  <div className="stack" style={{ padding: 40, alignItems: 'center', color: '#fff' }}>
                    <FileText size={64} />
                    <p className="small mt">PDF Resolution Report</p>
                  </div>
                ) : (
                  <img
                    src={selectedProof.file_url}
                    alt={selectedProof.file_name}
                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                  />
                )}
              </div>
              <div className="grid g-2 mt">
                <div>
                  <div className="xs muted uppercase">Officer & Department</div>
                  <div className="small font-semibold">{selectedProof.officer_name || 'Assigned Officer'}</div>
                  <div className="small muted">{selectedProof.department || 'Public Works Department'}</div>
                </div>
                <div>
                  <div className="xs muted uppercase">Uploaded At</div>
                  <div className="small font-semibold">{date(selectedProof.uploaded_at)}</div>
                  <div className="xs muted">Size: {((selectedProof.file_size || 0) / 1024).toFixed(1)} KB</div>
                </div>
                {selectedProof.lat && selectedProof.lng && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div className="xs muted uppercase">On-Site Geotag Coordinates (EXIF Verified)</div>
                    <div className="small font-semibold row" style={{ gap: 6, marginTop: 2 }}>
                      <MapPin size={16} color="var(--color-success)" />
                      {selectedProof.lat.toFixed(5)}, {selectedProof.lng.toFixed(5)}
                    </div>
                  </div>
                )}
                {selectedProof.sha256_hash && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div className="xs muted uppercase">Immutable SHA-256 Checksum</div>
                    <div className="xs mono muted" style={{ wordBreak: 'break-all', background: '#f1f5f9', padding: 6, borderRadius: 4 }}>
                      {selectedProof.sha256_hash}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedProof(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Resolution Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="row" style={{ gap: 8 }}>
                <CheckCircle2 size={20} color="var(--color-success)" />
                <h3 style={{ margin: 0 }}>Confirm Resolution</h3>
              </div>
              <button className="btn btn-sm" onClick={() => setShowConfirmModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="small">
                Thank you for verifying! Your confirmation will mark this grievance as <strong>Closed & Confirmed</strong>.
              </p>
              <div className="field">
                <label>How satisfied are you with the resolution?</label>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${rating >= star ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      <Star size={24} fill={rating >= star ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                  <span className="small muted font-semibold" style={{ marginLeft: 8 }}>
                    {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Satisfactory' : rating === 2 ? 'Needs Improvement' : 'Poor'}
                  </span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="confirm-comment">Feedback / Comment (Optional)</label>
                <textarea
                  id="confirm-comment"
                  className="textarea"
                  rows={3}
                  value={confirmComment}
                  onChange={(e) => setConfirmComment(e.target.value)}
                  placeholder="e.g. Work was completed quickly and handpump is functional now. Thank you."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowConfirmModal(false)} disabled={submittingConfirm}>Cancel</button>
              <button className="btn btn-success" onClick={handleConfirmSubmit} disabled={submittingConfirm}>
                {submittingConfirm ? 'Submitting...' : 'Confirm & Close Grievance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {showDisputeModal && (
        <div className="modal-overlay" onClick={() => setShowDisputeModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="row" style={{ gap: 8 }}>
                <XCircle size={20} color="var(--color-destructive)" />
                <h3 style={{ margin: 0 }}>Dispute Resolution</h3>
              </div>
              <button className="btn btn-sm" onClick={() => setShowDisputeModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warn">
                <AlertCircle size={18} />
                <div className="small">
                  Disputing will <strong>reopen this grievance</strong> and automatically escalate it to the department supervisor for on-site re-inspection.
                </div>
              </div>
              {disputeError && <div className="alert alert-danger small">{disputeError}</div>}
              <div className="field">
                <label htmlFor="dispute-reason">What is still unresolved? <span style={{ color: 'red' }}>*</span></label>
                <textarea
                  id="dispute-reason"
                  className="textarea"
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe why the work is incomplete or unsatisfactory (e.g. Water is muddy / repair was not done on our street)..."
                  required
                />
              </div>
              <div className="field">
                <label>Attach Photo of Unresolved Defect (Optional)</label>
                <div className="row" style={{ gap: 8 }}>
                  <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
                    <Camera size={16} /> Upload Photo
                    <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} />
                  </label>
                  {disputePhoto && <span className="xs text-success">✓ Photo attached</span>}
                </div>
                {disputePhoto && (
                  <div className="mt-xs" style={{ width: 100, height: 75, overflow: 'hidden', borderRadius: 4 }}>
                    <img src={disputePhoto} alt="Dispute proof preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowDisputeModal(false)} disabled={submittingDispute}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDisputeSubmit} disabled={submittingDispute || !disputeReason.trim()}>
                {submittingDispute ? 'Reopening...' : 'Reopen Grievance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
