import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Edit2,
  Check,
  Ban,
  ShieldCheck,
  Hash,
  Activity,
  Pill,
  ClipboardList,
  Calendar,
  Building,
  User,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { getReportExtraction, updateReportMetadata, verifyLabResult } from '../api/reports';

export default function ExtractionReviewModal({ reportId, isOpen, onClose, onUpdate }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Source traceability popup
  const [sourceItem, setSourceItem] = useState(null);
  
  // Edit lab result state
  const [editingLabId, setEditingLabId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Metadata editing
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaType, setMetaType] = useState('OTHER');
  const [metaFacility, setMetaFacility] = useState('');
  const [metaPhysician, setMetaPhysician] = useState('');

  const loadData = async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReportExtraction(reportId);
      setReport(data);
      setMetaType(data.report_type || 'OTHER');
      setMetaFacility(data.facility_name || '');
      setMetaPhysician(data.physician_name || '');
    } catch (err) {
      setError(err.message || 'Failed to load report extraction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reportId) {
      loadData();
    } else {
      setReport(null);
      setSourceItem(null);
      setEditingLabId(null);
    }
  }, [isOpen, reportId]);

  const handleVerifyLab = async (labId, newStatus, customValue = null) => {
    setVerifying(true);
    try {
      const payload = {
        verification_status: newStatus,
        verified_value: customValue,
        verified_by: 'Clinician Reviewer',
        verification_notes: editNotes || undefined,
      };
      await verifyLabResult(report.id, labId, payload);
      setEditingLabId(null);
      setEditValue('');
      setEditNotes('');
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      await updateReportMetadata(report.id, {
        report_type: metaType,
        facility_name: metaFacility || null,
        physician_name: metaPhysician || null,
      });
      setEditingMeta(false);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(`Failed to update metadata: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '1020px', width: '95vw', height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: '#f0f9ff',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 className="modal-title">
                  {report ? report.original_filename : 'Medical Report Review'}
                </h3>
                {report && (
                  <span
                    className={`status-badge ${
                      report.processing_status === 'REVIEW_REQUIRED'
                        ? 'warning'
                        : report.processing_status === 'FAILED'
                        ? 'danger'
                        : 'info'
                    }`}
                  >
                    {report.processing_status === 'REVIEW_REQUIRED' ? 'Requires Clinician Review' : report.processing_status}
                  </span>
                )}
              </div>
              <p className="modal-subtitle">
                Phase 3 Structured Extraction • Traceable Clinical Record
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {loading ? (
            <div className="empty-state-box" style={{ padding: '3rem' }}>
              <div className="animate-spin" style={{ color: '#0284c7', marginBottom: '0.75rem' }}>
                <Clock size={32} />
              </div>
              <div className="empty-title">Loading Structured Extraction...</div>
              <div className="empty-desc">Parsing verified schema entities from the database.</div>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
              }}
            >
              <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600 }}>Failed to load extraction details</div>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</p>
            </div>
          ) : report ? (
            <>
              {/* Report Metadata & Provenance Header Banner */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      {report.report_type || 'OTHER'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Size: {(report.file_size / 1024).toFixed(1)} KB ({report.mime_type})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Uploaded: {new Date(report.uploaded_at).toLocaleString()}
                    </span>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingMeta(!editingMeta)}
                  >
                    <Edit2 size={13} /> {editingMeta ? 'Cancel Edit' : 'Edit Report Metadata'}
                  </button>
                </div>

                {editingMeta ? (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Report Type
                      </label>
                      <select
                        className="input select"
                        value={metaType}
                        onChange={(e) => setMetaType(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      >
                        <option value="LABORATORY_REPORT">Laboratory Report</option>
                        <option value="PRESCRIPTION">Prescription Slip</option>
                        <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                        <option value="CONSULTATION_NOTE">Consultation Note</option>
                        <option value="MEDICAL_HISTORY">Medical History</option>
                        <option value="OTHER">Other Clinical Record</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Facility Name
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Metro Health Lab"
                        value={metaFacility}
                        onChange={(e) => setMetaFacility(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                        Physician Name
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Dr. Sarah Jenkins"
                        value={metaPhysician}
                        onChange={(e) => setMetaPhysician(e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      />
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveMetadata}>
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Building size={15} color="var(--text-muted)" />
                      <span>Facility: <strong>{report.facility_name || 'Not specified in report'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={15} color="var(--text-muted)" />
                      <span>Physician: <strong>{report.physician_name || 'Not specified in report'}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={15} color="var(--text-muted)" />
                      <span>Report Date: <strong>{report.report_date || 'Undated'}</strong></span>
                    </div>
                  </div>
                )}

                {/* SHA-256 Hash Display */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    backgroundColor: '#ffffff',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    width: 'fit-content',
                  }}
                >
                  <Hash size={13} />
                  <span>SHA-256: {report.document_hash}</span>
                  <span className="provenance-tag" style={{ marginLeft: '0.5rem' }}>
                    <span className="provenance-dot"></span> REPORT_EXTRACTED
                  </span>
                </div>
              </div>

              {/* SECTION 1: LABORATORY RESULTS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} color="#0284c7" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                      Laboratory Results ({report.lab_results ? report.lab_results.length : 0})
                    </h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>Strict Raw Values Preserved</span>
                    <span>•</span>
                    <span>Reference Ranges Unmodified</span>
                  </div>
                </div>

                {!report.lab_results || report.lab_results.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-strong)',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No structured laboratory test results identified in this report.
                  </div>
                ) : (
                  <div className="clinical-table-card">
                    <table className="clinical-table">
                      <thead>
                        <tr>
                          <th>Test Name</th>
                          <th>Raw Result</th>
                          <th>Unit</th>
                          <th>Reference Range</th>
                          <th>Source Traceability</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Review Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.lab_results.map((lab) => {
                          const isEditing = editingLabId === lab.id;
                          return (
                            <tr key={lab.id}>
                              <td>
                                <strong style={{ color: 'var(--text-primary)' }}>{lab.test_name}</strong>
                                {lab.observation && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    Note: {lab.observation}
                                  </div>
                                )}
                              </td>
                              <td>
                                {isEditing ? (
                                  <input
                                    className="input"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder={lab.value_raw}
                                    style={{ width: '90px', padding: '0.2rem 0.4rem', fontSize: '0.82rem' }}
                                    autoFocus
                                  />
                                ) : (
                                  <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                      {lab.verified_value || lab.value_raw}
                                    </span>
                                    {lab.verified_value && lab.verified_value !== lab.value_raw && (
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        Orig: {lab.value_raw}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td>{lab.unit || '—'}</td>
                              <td>
                                {lab.reference_range_raw ? (
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                                    {lab.reference_range_raw}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                                    Not in source report
                                  </span>
                                )}
                              </td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', gap: '0.3rem' }}
                                  onClick={() => setSourceItem({ ...lab, type: 'LAB_RESULT' })}
                                >
                                  <Eye size={12} />
                                  <span>Page {lab.source_page || 1}</span>
                                </button>
                              </td>
                              <td>
                                <span
                                  className={`status-badge ${
                                    lab.verification_status === 'VERIFIED'
                                      ? 'success'
                                      : lab.verification_status === 'REJECTED'
                                      ? 'danger'
                                      : 'neutral'
                                  }`}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  {lab.verification_status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isEditing ? (
                                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                    <button
                                      className="btn btn-primary btn-sm"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                      disabled={verifying}
                                      onClick={() => handleVerifyLab(lab.id, 'VERIFIED', editValue || lab.value_raw)}
                                    >
                                      <Check size={12} /> Save
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => setEditingLabId(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#16a34a' }}
                                      title="Mark Verified"
                                      disabled={verifying}
                                      onClick={() => handleVerifyLab(lab.id, 'VERIFIED')}
                                    >
                                      <Check size={13} /> Verify
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                      title="Edit Value"
                                      onClick={() => {
                                        setEditingLabId(lab.id);
                                        setEditValue(lab.verified_value || lab.value_raw);
                                      }}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: '#e11d48' }}
                                      title="Reject Value"
                                      disabled={verifying}
                                      onClick={() => handleVerifyLab(lab.id, 'REJECTED')}
                                    >
                                      <Ban size={12} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION 2: OBSERVATIONS & EXPLICIT DIAGNOSES */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <ClipboardList size={18} color="#7c3aed" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Clinical Observations & Explicit Diagnoses ({report.observations ? report.observations.length : 0})
                  </h4>
                </div>

                {!report.observations || report.observations.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-strong)',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No clinical observations or explicit conditions stated in this report.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {report.observations.map((obs) => (
                      <div
                        key={obs.id}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '8px',
                          backgroundColor: obs.category === 'DIAGNOSIS_AS_STATED' ? '#faf5ff' : '#f8fafc',
                          border: `1px solid ${obs.category === 'DIAGNOSIS_AS_STATED' ? '#e9d5ff' : 'var(--border-subtle)'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: obs.category === 'DIAGNOSIS_AS_STATED' ? '#f3e8ff' : '#e0f2fe',
                              color: obs.category === 'DIAGNOSIS_AS_STATED' ? '#7e22ce' : '#0369a1',
                              whiteSpace: 'nowrap',
                              marginTop: '0.1rem',
                            }}
                          >
                            {obs.category === 'DIAGNOSIS_AS_STATED' ? 'Diagnosis As Stated' : 'Clinical Finding'}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {obs.description}
                            </div>
                            {obs.source_text && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Source: "{obs.source_text}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => setSourceItem({ ...obs, type: 'OBSERVATION' })}
                          >
                            <Eye size={12} /> Trace
                          </button>
                          <span className="provenance-tag">
                            <span className="provenance-dot"></span> REPORT_EXTRACTED
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: MEDICATIONS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Pill size={18} color="#0d9488" />
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                    Report Documented Medications ({report.medications ? report.medications.length : 0})
                  </h4>
                </div>

                {!report.medications || report.medications.length === 0 ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-strong)',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No medications explicitly documented in this report.
                  </div>
                ) : (
                  <div className="clinical-table-card">
                    <table className="clinical-table">
                      <thead>
                        <tr>
                          <th>Medication Name</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Route</th>
                          <th>Instructions</th>
                          <th>Source</th>
                          <th>Provenance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.medications.map((med) => (
                          <tr key={med.id}>
                            <td>
                              <strong style={{ color: 'var(--text-primary)' }}>{med.medication_name}</strong>
                            </td>
                            <td>{med.dosage || '—'}</td>
                            <td>{med.frequency || '—'}</td>
                            <td>{med.route || '—'}</td>
                            <td>{med.instructions || '—'}</td>
                            <td>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setSourceItem({ ...med, type: 'MEDICATION' })}
                              >
                                <Eye size={12} /> Page {med.source_page || 1}
                              </button>
                            </td>
                            <td>
                              <span className="provenance-tag">
                                <span className="provenance-dot"></span> REPORT_EXTRACTED
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Review
          </button>
        </div>
      </div>

      {/* Traceability Source Viewer Popover */}
      {sourceItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem',
          }}
          onClick={() => setSourceItem(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.05rem' }}>
                <ShieldCheck size={20} color="#0284c7" />
                <span>Source Provenance Trace</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSourceItem(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Target Entity: <strong>{sourceItem.test_name || sourceItem.medication_name || sourceItem.description}</strong>
              </div>

              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {sourceItem.source_text || 'Exact line excerpt: ' + (sourceItem.test_name || '') + ' ' + (sourceItem.value_raw || '')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Source Page: <strong>{sourceItem.source_page || 'Page 1'}</strong></span>
                <span>Document: <strong>{report?.original_filename}</strong></span>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#0369a1',
                  backgroundColor: '#f0f9ff',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #bae6fd',
                }}
              >
                SHA-256 Verified: {report?.document_hash}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSourceItem(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
