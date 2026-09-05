import React from 'react';
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
} from 'lucide-react';

export default function DashboardOverview({
  patients,
  totalPatients,
  onOpenUpload,
  onOpenAddPatient,
  onSelectPatient,
  onViewDirectory,
}) {
  const recentPatients = patients ? patients.slice(0, 4) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Clinical Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
          border: '1px solid #bae6fd',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ maxWidth: '640px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0284c7',
              backgroundColor: '#ffffff',
              padding: '0.2rem 0.65rem',
              borderRadius: '20px',
              border: '1px solid #bae6fd',
              marginBottom: '0.75rem',
            }}
          >
            <ShieldCheck size={14} />
            Clinical Information Workspace
          </div>
          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}
          >
            Good morning, Clinician
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            Review and organize patient information, clinical reports, and laboratory intake into unified, auditable records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            id="dashboard-upload-btn"
            className="btn btn-primary btn-lg"
            onClick={onOpenUpload}
          >
            <FileUp size={18} />
            Upload Medical Report
          </button>
          <button
            id="dashboard-add-patient-btn"
            className="btn btn-secondary btn-lg"
            onClick={onOpenAddPatient}
          >
            <UserPlus size={18} />
            Add Patient
          </button>
        </div>
      </div>

      {/* 2. Clinical Workflow Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Patient Records
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                {totalPatients}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
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
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <CheckCircle2 size={13} />
            All records verified & persisted in database
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Clinical Documents
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                0
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
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
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Phase 3 Document Pipeline Ready
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Review
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                0
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            No clinical items currently flagged
          </div>
        </div>
      </div>

      {/* 3. Recent Patients & Quick Actions Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Recent Patients */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Recent Patients</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Patients recently registered or updated in the clinical registry
              </p>
            </div>
            <button className="btn btn-subtle btn-sm" onClick={onViewDirectory}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {recentPatients.length === 0 ? (
            <div className="empty-state-box" style={{ padding: '2rem 1rem' }}>
              <Users size={28} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>No patient records yet</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Register your first patient intake to begin organizing their records.
              </div>
              <button className="btn btn-primary btn-sm" onClick={onOpenAddPatient}>
                <UserPlus size={14} /> Add Patient
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      {patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {patient.full_name}
                        </span>
                        <span className="mrn-badge">{patient.patient_identifier}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {patient.age !== null ? `${patient.age} yrs` : 'Age unrecorded'} • {patient.sex || 'Unknown sex'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="chips-cloud" style={{ maxWidth: '240px' }}>
                      {patient.symptoms && patient.symptoms.length > 0 ? (
                        patient.symptoms.slice(0, 2).map((s, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.1rem 0.45rem',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              borderRadius: '4px',
                            }}
                          >
                            {s.symptom}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No symptoms</span>
                      )}
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => onSelectPatient(patient.id)}>
                      Open Chart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Workspace Info Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Activity size={18} color="#0284c7" />
              <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Clinical Information Workflow</h4>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: '0.5rem' }}>
                MedLens operates on a four-stage clinical synthesis model:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>1</span>
                  <span><strong>Collect:</strong> User intake & document uploads</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>2</span>
                  <span><strong>Understand:</strong> Clinical extraction with provenance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>3</span>
                  <span><strong>Organize:</strong> Labs, medications & conditions</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>4</span>
                  <span><strong>Review:</strong> Verified patient record synthesis</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem' }}>
              <ShieldCheck size={18} />
              Deterministic Provenance Guarantee
            </div>
            <p style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '0.4rem', lineHeight: 1.5 }}>
              All current patient intake records are strictly stamped with <code>USER_PROVIDED</code> provenance semantics to prevent confusion with future report-extracted data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
