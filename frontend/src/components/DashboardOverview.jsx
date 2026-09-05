import React, { useState, useEffect } from 'react';
import {
  FileUp,
  UserPlus,
  Users,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Eye,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { listPatientReports } from '../api/reports';

export default function DashboardOverview({
  patients,
  totalPatients,
  onOpenUpload,
  onOpenAddPatient,
  onSelectPatient,
  onViewDirectory,
  onOpenReviewReport,
  onViewReports,
}) {
  const recentPatients = patients ? patients.slice(0, 6) : [];
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadReportsFeed = async () => {
      if (!patients || patients.length === 0) return;
      setLoadingReports(true);
      try {
        const accumulator = [];
        for (const p of patients.slice(0, 8)) {
          try {
            const res = await listPatientReports(p.id);
            if (res.reports && res.reports.length > 0) {
              res.reports.forEach((rep) => {
                accumulator.push({
                  ...rep,
                  patientName: p.full_name,
                  mrn: p.patient_identifier,
                });
              });
            }
          } catch (err) {
            console.error('Failed to load reports for patient:', p.id, err);
          }
        }
        // Sort newest uploaded first
        accumulator.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
        if (isMounted) {
          setRecentReports(accumulator);
        }
      } finally {
        if (isMounted) {
          setLoadingReports(false);
        }
      }
    };

    loadReportsFeed();
    return () => {
      isMounted = false;
    };
  }, [patients]);

  const pendingReviewCount = recentReports.filter(
    (r) => r.processing_status === 'REVIEW_REQUIRED'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Clinical Welcome Hero Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
          border: '1px solid #bae6fd',
          borderRadius: '16px',
          padding: '2rem 2.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.75rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ maxWidth: '820px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0284c7',
              backgroundColor: '#ffffff',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              border: '1px solid #bae6fd',
              marginBottom: '0.75rem',
            }}
          >
            <ShieldCheck size={14} />
            Clinical Information Intelligence Workspace
          </div>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              marginBottom: '0.45rem',
            }}
          >
            Good morning, Clinician
          </h2>
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '0 0 1rem 0',
            }}
          >
            Review and organize patient intake, multi-page laboratory reports, and structured clinical extractions into unified, auditable medical records with deterministic provenance.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#0369a1' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} />
              <strong>{totalPatients}</strong> Active Patient Cohort
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <FileText size={14} />
              <strong>{recentReports.length}</strong> Processed Reports
            </span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sparkles size={14} />
              Phase 4 Reference Range & Phase 5 AI Summary Active
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            id="dashboard-upload-btn"
            className="btn btn-primary"
            onClick={onOpenUpload}
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem' }}
          >
            <FileUp size={16} />
            Upload Medical Report
          </button>
          <button
            id="dashboard-add-patient-btn"
            className="btn btn-secondary"
            onClick={onOpenAddPatient}
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem' }}
          >
            <UserPlus size={16} />
            Add Patient
          </button>
          <button
            className="btn btn-secondary"
            onClick={onViewDirectory}
            style={{ padding: '0.6rem 1.15rem', fontSize: '0.88rem' }}
          >
            <FolderOpen size={16} />
            Patient Directory
          </button>
        </div>
      </div>

      {/* 2. Balanced 4-Metric Clinical Operations Grid */}
      <div className="dashboard-metrics-grid">
        {/* Metric 1: Active Patients */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Patients
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {totalPatients}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#f0f9ff',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.76rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} />
            Database verified clinical intake records
          </div>
        </div>

        {/* Metric 2: Clinical Documents */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Ingested Documents
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {recentReports.length}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} color="#0d9488" />
            PDF & image OCR reports processed
          </div>
        </div>

        {/* Metric 3: Pending Reviews */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Reviews
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 700, color: pendingReviewCount > 0 ? '#d97706' : 'var(--text-primary)', marginTop: '0.2rem' }}>
                {pendingReviewCount}
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: pendingReviewCount > 0 ? '#fffbeb' : '#f8fafc',
                color: pendingReviewCount > 0 ? '#d97706' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.76rem', color: pendingReviewCount > 0 ? '#b45309' : 'var(--text-muted)' }}>
            {pendingReviewCount > 0 ? `${pendingReviewCount} report(s) require clinician review` : 'All extractions reviewed'}
          </div>
        </div>

        {/* Metric 4: Clinical Intelligence */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Intelligence Status
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#4338ca', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                Engines Online
              </div>
            </div>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#eef2ff',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.76rem', color: '#6366f1' }}>
            Range Engine & Patient Summary Active
          </div>
        </div>
      </div>

      {/* 3. Dense Two-Column Clinical Workspace */}
      <div className="dashboard-workspace-grid">
        {/* Left Column: Recent Patients */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Recent Patient Records</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Patients registered or updated in the clinical registry with structured intake
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onViewDirectory} style={{ fontSize: '0.78rem' }}>
              View All Patients <ArrowRight size={13} />
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <div className="empty-state-box" style={{ padding: '2.5rem 1rem' }}>
              <Users size={28} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No patient records registered yet</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Create your first patient intake to begin organizing records and medical reports.
              </div>
              <button className="btn btn-primary btn-sm" onClick={onOpenAddPatient}>
                <UserPlus size={14} /> Add First Patient
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.15rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    flexWrap: 'wrap',
                    gap: '0.85rem',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface-active)';
                    e.currentTarget.style.borderColor = 'var(--primary-border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {/* Patient Identifier & Demographics */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexShrink: 0,
                      }}
                    >
                      {patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                          {patient.full_name}
                        </span>
                        <span className="mrn-badge" style={{ fontSize: '0.74rem' }}>{patient.patient_identifier}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {patient.age !== null ? `${patient.age} yrs` : 'Age unrecorded'} • {patient.sex ? patient.sex.toLowerCase() : 'Unrecorded sex'}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Complaints & Conditions Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', flex: 1, minWidth: '180px' }}>
                    {patient.symptoms && patient.symptoms.length > 0 ? (
                      patient.symptoms.slice(0, 2).map((s, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.5rem',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {s.symptom}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No complaints</span>
                    )}

                    {patient.existing_conditions && patient.existing_conditions.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.5rem',
                          backgroundColor: '#f0fdfa',
                          color: '#0f766e',
                          borderRadius: '4px',
                          border: '1px solid #ccfbf1',
                        }}
                      >
                        {patient.existing_conditions.length} condition{patient.existing_conditions.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient(patient.id);
                      }}
                    >
                      Open Chart <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Clinical Documents & Extractions Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Recent Reports Card */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={17} color="#0284c7" />
                <h3 style={{ fontSize: '1.02rem', fontWeight: 600, margin: 0 }}>Recent Clinical Documents</h3>
              </div>
              {onViewReports && (
                <button className="btn btn-subtle btn-sm" onClick={onViewReports} style={{ fontSize: '0.78rem' }}>
                  Archive <ArrowRight size={13} />
                </button>
              )}
            </div>

            {loadingReports ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <RefreshCw size={18} className="animate-spin text-primary" style={{ margin: '0 auto 0.4rem', color: '#0284c7' }} />
                Loading recent documents...
              </div>
            ) : recentReports.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <FileText size={22} color="var(--text-muted)" style={{ margin: '0 auto 0.4rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  No medical reports uploaded yet
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Upload a CBC panel, metabolic report, or discharge summary.
                </div>
                <button className="btn btn-secondary btn-sm" onClick={onOpenUpload} style={{ marginTop: '0.85rem', fontSize: '0.78rem' }}>
                  <FileUp size={13} /> Upload First Report
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentReports.slice(0, 4).map((rep) => (
                  <div
                    key={rep.id}
                    style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px',
                          }}
                          title={rep.original_filename}
                        >
                          {rep.original_filename}
                        </span>
                        <span
                          className={`status-badge ${
                            rep.processing_status === 'REVIEW_REQUIRED'
                              ? 'warning'
                              : rep.processing_status === 'FAILED'
                              ? 'danger'
                              : 'success'
                          }`}
                          style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}
                        >
                          {rep.processing_status === 'REVIEW_REQUIRED' ? 'Needs Review' : rep.processing_status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {rep.patientName} • {new Date(rep.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>

                    {onOpenReviewReport && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem', flexShrink: 0 }}
                        onClick={() => onOpenReviewReport(rep.id)}
                      >
                        <Eye size={12} /> Review
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinical Architecture & Provenance Guarantees Card */}
          <div
            className="card"
            style={{
              padding: '1.35rem',
              backgroundColor: '#f0fdfa',
              border: '1px solid #99f6e4',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f766e', fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={18} />
              <span>Audited Clinical Provenance Guarantees</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#115e59', lineHeight: 1.55 }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                MedLens guarantees deterministic reference-range classifications:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li style={{ marginBottom: '0.25rem' }}>
                  <strong>Phase 4 Deterministic Engine:</strong> LOW, NORMAL, and HIGH classifications are calculated strictly against intervals printed on the report.
                </li>
                <li>
                  <strong>Phase 5 AI Patient Summaries:</strong> Bound to structured records; never diagnoses diseases or prescribes treatments.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
