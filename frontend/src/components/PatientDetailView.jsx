import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileText,
  Activity,
  HeartPulse,
  AlertTriangle,
  Pill,
  Calendar,
  Clock,
  ShieldCheck,
  FileUp,
  ExternalLink,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { getPatientById, deletePatient } from '../api/patients';
import { listPatientReports, getReportExtraction } from '../api/reports';
import ExtractionReviewModal from './ExtractionReviewModal';
import PatientSummaryCard from './PatientSummaryCard';

export default function PatientDetailView({ patientId, onBack, onEdit, onOpenUpload, initialTab = 'overview' }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab); // 'overview' | 'reports' | 'labs' | 'medications' | 'timeline'
  const [deleting, setDeleting] = useState(false);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reviewReportId, setReviewReportId] = useState(null);
  const [allLabs, setAllLabs] = useState([]);

  const loadPatient = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientById(patientId);
      setPatient(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch patient chart.');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (pid) => {
    setLoadingReports(true);
    try {
      const res = await listPatientReports(pid);
      const repList = res.reports || [];
      setReports(repList);

      const labDetails = await Promise.all(
        repList.map(async (rep) => {
          try {
            const detail = await getReportExtraction(rep.id);
            return (detail.lab_results || []).map((lab) => ({
              ...lab,
              reportFilename: rep.original_filename,
              reportDate: rep.report_date,
            }));
          } catch {
            return [];
          }
        })
      );
      setAllLabs(labDetails.flat());
    } catch (err) {
      console.error('Failed to load patient reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatient();
      loadReports(patientId);
    }
  }, [patientId]);

  const handleDelete = async () => {
    if (!patient) return;
    if (!window.confirm(`Are you sure you want to permanently delete patient record ${patient.patient_identifier} (${patient.full_name})?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deletePatient(patient.id);
      onBack();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state-box" style={{ margin: '2rem 0' }}>
        <RefreshCw size={28} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.75rem' }} />
        <div className="empty-title">Loading Patient Chart...</div>
        <div className="empty-desc">Fetching clinical record #{patientId} from the database.</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="card" style={{ padding: '2rem', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <AlertCircle size={22} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Error Loading Patient Chart</h3>
        </div>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error || 'Patient record could not be found.'}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Top Navigation & Actions Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button id="back-to-directory-btn" className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> Back to Patients
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenUpload(patient)}>
            <FileUp size={15} /> Upload Report
          </button>
          <button id="edit-patient-btn" className="btn btn-secondary btn-sm" onClick={() => onEdit(patient)}>
            <Edit2 size={15} /> Edit Intake
          </button>
          <button
            id="delete-patient-btn"
            className="btn btn-danger btn-sm"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* 2. Patient Header Banner */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem',
              fontWeight: 700,
            }}
          >
            {patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {patient.full_name}
              </h2>
              <span className="mrn-badge" style={{ fontSize: '0.8rem', padding: '0.2rem 0.55rem' }}>
                {patient.patient_identifier}
              </span>
              <div className="provenance-tag" title="Baseline data entered by clinician or patient">
                <span className="provenance-dot"></span>
                Patient provided baseline
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span><strong>Age:</strong> {patient.age !== null ? `${patient.age} years` : 'Unrecorded'}</span>
              <span>•</span>
              <span><strong>Sex:</strong> {patient.sex ? patient.sex.toLowerCase() : 'Unrecorded'}</span>
              <span>•</span>
              <span><strong>DOB:</strong> {patient.date_of_birth || 'Not documented'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={13} />
            <span>Intake Created: {new Date(patient.created_at).toLocaleDateString()}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={13} />
            <span>Last Updated: {new Date(patient.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* 3. Clinical Chart Sub-Tabs */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem' }}>
        <button
          className={`nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Patient Overview
        </button>
        <button
          className={`nav-link-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Clinical Reports <span className="nav-tab-badge">{reports ? reports.length : 0}</span>
        </button>
        <button
          className={`nav-link-btn ${activeTab === 'labs' ? 'active' : ''}`}
          onClick={() => setActiveTab('labs')}
        >
          Lab Results <span className="nav-tab-badge">{allLabs ? allLabs.length : 0}</span>
        </button>
        <button
          className={`nav-link-btn ${activeTab === 'medications' ? 'active' : ''}`}
          onClick={() => setActiveTab('medications')}
        >
          Medications <span className="nav-tab-badge">{patient.medications ? patient.medications.length : 0}</span>
        </button>
        <button
          className={`nav-link-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Clinical Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {/* Presenting Symptoms */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                  <Activity size={17} color="#0284c7" />
                  <span>Presenting Complaints & Symptoms</span>
                </div>
                <span className="provenance-tag">
                  <span className="provenance-dot"></span> Patient reported
                </span>
              </div>

              {!patient.symptoms || patient.symptoms.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No complaints reported during intake.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {patient.symptoms.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.symptom}</strong>
                        {s.duration && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Duration: {s.duration}
                          </div>
                        )}
                      </div>
                      {s.severity && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor:
                              s.severity.toLowerCase() === 'severe'
                                ? '#fff1f2'
                                : s.severity.toLowerCase() === 'moderate'
                                ? '#fffbeb'
                                : '#f0fdf4',
                            color:
                              s.severity.toLowerCase() === 'severe'
                                ? '#e11d48'
                                : s.severity.toLowerCase() === 'moderate'
                                ? '#d97706'
                                : '#16a34a',
                            border: `1px solid ${
                              s.severity.toLowerCase() === 'severe'
                                ? '#fecdd3'
                                : s.severity.toLowerCase() === 'moderate'
                                ? '#fde68a'
                                : '#bbf7d0'
                            }`,
                          }}
                        >
                          {s.severity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medical Conditions */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                  <HeartPulse size={17} color="#0284c7" />
                  <span>Medical History & Conditions</span>
                </div>
                <span className="provenance-tag">
                  <span className="provenance-dot"></span> Patient reported
                </span>
              </div>

              {!patient.existing_conditions || patient.existing_conditions.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No past medical conditions documented.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {patient.existing_conditions.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.condition}</strong>
                        {c.diagnosed_year && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Diagnosed: {c.diagnosed_year}
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {c.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Known Allergies */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                  <AlertTriangle size={17} color="#d97706" />
                  <span>Allergies & Adverse Reactions</span>
                </div>
                <span className="provenance-tag">
                  <span className="provenance-dot"></span> Patient reported
                </span>
              </div>

              {!patient.allergies || patient.allergies.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No drug or environmental allergies documented.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {patient.allergies.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fde68a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#92400e' }}>{a.allergen}</strong>
                        {a.reaction && (
                          <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Reaction: {a.reaction}</div>
                        )}
                      </div>
                      {a.severity && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor: '#ffffff',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                          }}
                        >
                          {a.severity}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Medications */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
                  <Pill size={17} color="#0284c7" />
                  <span>Current Active Medications</span>
                </div>
                <span className="provenance-tag">
                  <span className="provenance-dot"></span> Patient reported
                </span>
              </div>

              {!patient.medications || patient.medications.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No current medications documented.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {patient.medications.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {m.dosage && <span>{m.dosage}</span>}
                        {m.frequency && <span>• {m.frequency}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clinical Notes Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Clinical Intake Notes</h4>
              <span className="provenance-tag">
                <span className="provenance-dot"></span> Patient reported
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {patient.other_information || 'No additional intake notes provided.'}
            </p>
          </div>

          {/* AI-Powered Patient-Friendly Summary (Phase 5) */}
          <PatientSummaryCard
            patientId={patient.id}
            patient={patient}
            onSummaryUpdated={() => loadPatient()}
          />
        </div>
      )}

      {/* TAB 2: REPORTS */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Clinical Documents & Reports</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Medical reports, laboratory panels, discharge summaries, and prescriptions for {patient.full_name}
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => onOpenUpload(patient)}>
              <FileUp size={15} /> Upload Report
            </button>
          </div>

          {loadingReports ? (
            <div className="empty-state-box" style={{ padding: '2rem' }}>
              <RefreshCw size={24} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading patient reports...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-icon-bubble">
                <FileText size={24} />
              </div>
              <div className="empty-title">No Medical Reports Ingested Yet</div>
              <div className="empty-desc">
                Upload a CBC panel, metabolic panel, discharge summary, or prescription to execute Phase 3 structured extraction.
              </div>
              <button className="btn btn-primary" onClick={() => onOpenUpload(patient)}>
                <FileUp size={16} /> Upload First Report
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {rep.report_type || 'OTHER'}
                      </span>
                      <span
                        className={`status-badge ${
                          rep.processing_status === 'REVIEW_REQUIRED'
                            ? 'warning'
                            : rep.processing_status === 'FAILED'
                            ? 'danger'
                            : 'info'
                        }`}
                        style={{ fontSize: '0.72rem' }}
                      >
                        {rep.processing_status === 'REVIEW_REQUIRED' ? 'Requires Review' : rep.processing_status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
                      {rep.original_filename}
                    </h4>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                      <div>Uploaded: {new Date(rep.uploaded_at).toLocaleDateString()}</div>
                      <div>Size: {(rep.file_size / 1024).toFixed(1)} KB ({rep.mime_type})</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Hash: {rep.document_hash.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                    {(() => {
                      if (rep.extraction_method === 'GEMINI_AI') {
                        return (
                          <span
                            className="provenance-tag"
                            style={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9', fontWeight: 600, fontSize: '0.72rem' }}
                            title={`Gemini AI · ${rep.extraction_model || 'gemini-2.5-flash'}`}
                          >
                            <span className="provenance-dot" style={{ backgroundColor: '#7c3aed' }}></span>
                            {`Gemini AI · ${rep.extraction_model || 'gemini-2.5-flash'}`}
                          </span>
                        );
                      }
                      if (rep.extraction_method === 'LOCAL_DETERMINISTIC') {
                        return (
                          <span
                            className="provenance-tag"
                            style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1', fontWeight: 600, fontSize: '0.72rem' }}
                            title="Deterministic Local Parser — Non-AI"
                          >
                            <span className="provenance-dot" style={{ backgroundColor: '#0284c7' }}></span>
                            Deterministic Local Parser · Non-AI
                          </span>
                        );
                      }
                      if (rep.extraction_method === 'NOT_AVAILABLE' || rep.processing_status === 'FAILED') {
                        return (
                          <span
                            className="provenance-tag"
                            style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c', fontWeight: 600, fontSize: '0.72rem' }}
                            title="AI Extraction Unavailable"
                          >
                            <span className="provenance-dot" style={{ backgroundColor: '#e11d48' }}></span>
                            AI Extraction Unavailable
                          </span>
                        );
                      }
                      return (
                        <span className="provenance-tag" style={{ fontSize: '0.72rem' }}>
                          <span className="provenance-dot"></span> REPORT_EXTRACTED
                        </span>
                      );
                    })()}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setReviewReportId(rep.id)}
                    >
                      Review Extraction
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LAB RESULTS */}
      {activeTab === 'labs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Structured Laboratory Results</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Extracted laboratory values with strictly preserved source ranges and provenance
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onOpenUpload(patient)}>
              <FileUp size={15} /> Upload Lab Report
            </button>
          </div>

          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={16} color="#0284c7" />
            <span>
              <strong>Phase 3 Scope:</strong> Laboratory results retain raw values and report-stated reference ranges. Low/Normal/High classification will be evaluated by the deterministic clinical reference engine in Phase 4.
            </span>
          </div>

          {loadingReports ? (
            <div className="empty-state-box" style={{ padding: '2rem' }}>
              <RefreshCw size={24} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading laboratory extractions...</div>
            </div>
          ) : allLabs.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-icon-bubble">
                <Activity size={24} />
              </div>
              <div className="empty-title">No Lab Results Extracted Yet</div>
              <div className="empty-desc">
                Upload a blood test, CBC panel, or metabolic report to extract structured laboratory data.
              </div>
              <button className="btn btn-primary" onClick={() => onOpenUpload(patient)}>
                <FileUp size={16} /> Upload Lab Report
              </button>
            </div>
          ) : (
            <div className="clinical-table-card">
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Reference Range</th>
                    <th>Range Status</th>
                    <th>Source Document</th>
                    <th>Provenance</th>
                    <th>Verification</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allLabs.map((lab) => {
                    const activeRangeStatus = lab.current_classification || lab.reference_range_status;
                    const rangeBadgeClass = 
                      activeRangeStatus === 'LOW' ? 'status-badge low' :
                      activeRangeStatus === 'NORMAL' ? 'status-badge normal' :
                      activeRangeStatus === 'HIGH' ? 'status-badge high' :
                      activeRangeStatus === 'NO_RANGE_AVAILABLE' ? 'status-badge no-range' :
                      activeRangeStatus ? 'status-badge undetermined' : '';

                    return (
                    <tr key={lab.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{lab.test_name}</strong>
                        {lab.observation && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {lab.observation}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {lab.verified_value || lab.value_raw}
                        </span>
                        {lab.verified_value && lab.verified_value !== lab.value_raw && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Raw: {lab.value_raw}
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
                            Not in report
                          </span>
                        )}
                      </td>
                      <td>
                        {activeRangeStatus ? (
                          <span className={rangeBadgeClass} style={{ fontSize: '0.72rem' }}>
                            {activeRangeStatus === 'NO_RANGE_AVAILABLE' ? 'NO RANGE' : activeRangeStatus}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {lab.reportFilename}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {lab.source_page ? `Page ${lab.source_page}` : 'Doc'}
                        </div>
                      </td>
                      <td>
                        {lab.provenance_tag === 'USER_VERIFIED' ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                            title={lab.original_provenance ? `Original source: ${lab.original_provenance}` : 'Verified by user'}
                          >
                            USER_VERIFIED
                          </span>
                        ) : (
                          <span className="provenance-tag" style={{ fontSize: '0.72rem' }}>
                            <span className="provenance-dot"></span> {lab.provenance_tag || 'REPORT_EXTRACTED'}
                          </span>
                        )}
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
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                          onClick={() => setReviewReportId(lab.report_id)}
                        >
                          Review in Report
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MEDICATIONS */}
      {activeTab === 'medications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Documented Active Medications</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Active pharmaceuticals documented during clinical intake with provenance tracking
              </p>
            </div>
          </div>

          {!patient.medications || patient.medications.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-icon-bubble">
                <Pill size={24} />
              </div>
              <div className="empty-title">No Active Medications Documented</div>
              <div className="empty-desc">
                Document active prescriptions during intake or extract them from physician discharge summaries.
              </div>
            </div>
          ) : (
            <div className="clinical-table-card">
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th>Medication Name</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Provenance Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patient.medications.map((med, i) => (
                    <tr key={i}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{med.name}</strong>
                      </td>
                      <td>{med.dosage || '—'}</td>
                      <td>{med.frequency || '—'}</td>
                      <td>
                        <span className="provenance-tag">
                          <span className="provenance-dot"></span> Patient reported
                        </span>
                      </td>
                      <td>
                        <span className="status-badge success">
                          <CheckCircle2 size={12} /> Active Baseline
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === 'timeline' && (() => {
        const events = [];

        // 1. Intake Event
        if (patient.created_at) {
          events.push({
            id: 'intake',
            date: new Date(patient.created_at),
            title: 'Baseline Clinical Intake Documented',
            type: 'INTAKE',
            badge: 'USER_PROVIDED',
            badgeStyle: { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' },
            desc: `Demographics, presenting complaints (${patient.symptoms?.length || 0} symptom${patient.symptoms?.length === 1 ? '' : 's'}), conditions, and active medications registered.`,
          });
        }

        // 2. Report Upload Events
        (reports || []).forEach((rep) => {
          events.push({
            id: `report-${rep.id}`,
            date: new Date(rep.uploaded_at),
            title: `Clinical Report Ingested: ${rep.original_filename}`,
            type: 'REPORT',
            badge: rep.extraction_method === 'GEMINI_AI'
              ? `Gemini AI · ${rep.extraction_model || 'gemini-2.5-flash'}`
              : rep.extraction_method === 'LOCAL_DETERMINISTIC'
              ? 'Deterministic Local Parser · Non-AI'
              : 'REPORT_EXTRACTED',
            badgeStyle: rep.extraction_method === 'GEMINI_AI'
              ? { backgroundColor: '#f5f3ff', color: '#6d28d9', borderColor: '#ddd6fe' }
              : rep.extraction_method === 'LOCAL_DETERMINISTIC'
              ? { backgroundColor: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }
              : { backgroundColor: '#f8fafc', color: '#475569', borderColor: '#e2e8f0' },
            desc: `Type: ${rep.report_type || 'OTHER'} • Size: ${(rep.file_size / 1024).toFixed(1)} KB • Status: ${rep.processing_status}`,
            reportId: rep.id,
          });
        });

        // 3. Verified Lab Events
        (allLabs || []).filter((l) => l.verification_status === 'VERIFIED' && l.verified_at).forEach((l) => {
          events.push({
            id: `verified-lab-${l.id}`,
            date: new Date(l.verified_at),
            title: `Lab Result Clinician Verified: ${l.test_name}`,
            type: 'VERIFICATION',
            badge: 'USER_VERIFIED',
            badgeStyle: { backgroundColor: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' },
            desc: `Verified Value: ${l.verified_value || l.value_raw} ${l.unit || ''} • Status: ${l.verified_classification || l.reference_range_status}`,
            reportId: l.report_id,
          });
        });

        // Sort newest first
        events.sort((a, b) => b.date - a.date);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Clinical Chronology & Encounters</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Auditable sequence of intake, document ingestions, and clinician verifications
              </p>
            </div>

            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {events.map((evt, idx) => (
                <div key={evt.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: evt.type === 'INTAKE' ? '#0284c7' : evt.type === 'VERIFICATION' ? '#16a34a' : '#7c3aed',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.2)',
                        marginTop: '2px',
                      }}
                    />
                    {idx < events.length - 1 && (
                      <div style={{ width: '2px', flex: 1, backgroundColor: '#e2e8f0', margin: '0.35rem 0' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: idx < events.length - 1 ? '1.25rem' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{evt.title}</strong>
                      <span
                        className="provenance-tag"
                        style={{ ...evt.badgeStyle, fontSize: '0.7rem', padding: '0.1rem 0.45rem', fontWeight: 600 }}
                      >
                        <span className="provenance-dot" style={{ backgroundColor: evt.badgeStyle.color }} />
                        {evt.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {evt.date.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      {evt.desc}
                    </div>
                    {evt.reportId && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => setReviewReportId(evt.reportId)}
                      >
                        Review Document Extraction
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Clinician Extraction Review Modal (Phase 3) */}
      {reviewReportId && (
        <ExtractionReviewModal
          reportId={reviewReportId}
          isOpen={!!reviewReportId}
          onClose={() => setReviewReportId(null)}
          onUpdate={() => {
            loadPatient();
            loadReports(patient.id);
          }}
        />
      )}
    </div>
  );
}
