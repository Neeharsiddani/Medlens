import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  User,
  Activity,
  HeartPulse,
  AlertTriangle,
  Pill,
  FileText,
  Calendar,
  Clock,
  Info,
} from 'lucide-react';
import { getPatientById, deletePatient } from '../api/patients';

export default function PatientDetailView({ patientId, onBack, onEdit }) {
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPatient = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientById(patientId);
      setPatient(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch patient record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatient();
    }
  }, [patientId]);

  const handleDelete = async () => {
    if (!patient) return;
    if (!window.confirm(`Are you sure you want to permanently delete patient ${patient.patient_identifier} (${patient.full_name})?`)) {
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
      <div className="detail-loading-state">
        <RefreshCw size={28} className="animate-spin text-primary" />
        <span>Loading clinical chart for patient #{patientId}...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="card error-card">
        <div className="error-card-content">
          <AlertCircle size={24} />
          <div>
            <h3>Error Loading Patient Record</h3>
            <p>{error || 'Patient not found.'}</p>
            <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '0.75rem' }}>
              <ArrowLeft size={16} /> Back to Directory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-detail-container">
      {/* Detail Top Navigation Toolbar */}
      <div className="detail-toolbar">
        <button id="back-to-directory-btn" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Directory
        </button>

        <div className="detail-toolbar-actions">
          <button
            id="edit-patient-btn"
            className="btn btn-secondary"
            onClick={() => onEdit(patient)}
          >
            <Edit2 size={16} /> Edit Intake Record
          </button>
          <button
            id="delete-patient-btn"
            className="btn btn-danger"
            disabled={deleting}
            onClick={handleDelete}
          >
            <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete Record'}
          </button>
        </div>
      </div>

      {/* Patient Header Identity Card */}
      <div className="card patient-header-card">
        <div className="patient-header-main">
          <div className="patient-avatar-box">
            <User size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2 className="patient-chart-title">{patient.full_name}</h2>
              <span className="mrn-badge-large">{patient.patient_identifier}</span>
              <span className="provenance-pill">
                <ShieldCheck size={14} />
                {patient.provenance_tag || 'USER_PROVIDED'}
              </span>
            </div>
            <div className="patient-meta-row">
              <span>
                <strong>Age:</strong> {patient.age !== null ? `${patient.age} yrs` : 'Not recorded'}
              </span>
              <span>•</span>
              <span>
                <strong>DOB:</strong> {patient.date_of_birth || 'Not recorded'}
              </span>
              <span>•</span>
              <span>
                <strong>Sex:</strong>{' '}
                <span className={`sex-pill sex-${(patient.sex || 'unknown').toLowerCase()}`}>
                  {patient.sex || 'UNKNOWN'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="patient-header-timestamps">
          <div className="timestamp-item">
            <Calendar size={14} />
            <span>Intake Created: {new Date(patient.created_at).toLocaleDateString()}</span>
          </div>
          <div className="timestamp-item">
            <Clock size={14} />
            <span>Last Updated: {new Date(patient.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Provenance Notice Banner */}
      <div className="scope-banner" style={{ margin: '1.25rem 0' }}>
        <div className="scope-banner-title">
          <ShieldCheck size={16} />
          Clinical Provenance: USER_PROVIDED Baseline
        </div>
        <div className="scope-banner-text">
          All records displayed below were supplied during user intake and are designated as <code>USER_PROVIDED</code>. No clinical reports, OCR extraction, or laboratory classification engines have been executed on this patient record.
        </div>
      </div>

      {/* Structured Sections Grid */}
      <div className="clinical-sections-grid">
        {/* 1. PRESENTATION: Symptoms */}
        <div className="card section-card" id="section-presentation">
          <div className="section-card-header">
            <div className="section-title">
              <Activity size={18} />
              <span>Presenting Complaints & Symptoms</span>
            </div>
            <span className="provenance-pill small">USER_PROVIDED</span>
          </div>
          <div className="section-card-body">
            {!patient.symptoms || patient.symptoms.length === 0 ? (
              <p className="text-muted">No presenting symptoms recorded.</p>
            ) : (
              <div className="structured-items-list">
                {patient.symptoms.map((item, idx) => (
                  <div key={idx} className="item-detail-card">
                    <div className="item-main">
                      <strong className="item-name">{item.symptom}</strong>
                      {item.duration && (
                        <span className="item-meta">Duration: {item.duration}</span>
                      )}
                    </div>
                    {item.severity && (
                      <span className={`item-badge badge-${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. MEDICAL HISTORY: Conditions */}
        <div className="card section-card" id="section-history">
          <div className="section-card-header">
            <div className="section-title">
              <HeartPulse size={18} />
              <span>Medical History & Conditions</span>
            </div>
            <span className="provenance-pill small">USER_PROVIDED</span>
          </div>
          <div className="section-card-body">
            {!patient.existing_conditions || patient.existing_conditions.length === 0 ? (
              <p className="text-muted">No existing medical conditions recorded.</p>
            ) : (
              <div className="structured-items-list">
                {patient.existing_conditions.map((item, idx) => (
                  <div key={idx} className="item-detail-card">
                    <div className="item-main">
                      <strong className="item-name">{item.condition}</strong>
                      {item.diagnosed_year && (
                        <span className="item-meta">Diagnosed: {item.diagnosed_year}</span>
                      )}
                      {item.notes && <p className="item-notes">{item.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. ALLERGIES */}
        <div className="card section-card" id="section-allergies">
          <div className="section-card-header">
            <div className="section-title">
              <AlertTriangle size={18} />
              <span>Known Allergies & Adverse Reactions</span>
            </div>
            <span className="provenance-pill small">USER_PROVIDED</span>
          </div>
          <div className="section-card-body">
            {!patient.allergies || patient.allergies.length === 0 ? (
              <p className="text-muted">No known drug or environmental allergies recorded.</p>
            ) : (
              <div className="structured-items-list">
                {patient.allergies.map((item, idx) => (
                  <div key={idx} className="item-detail-card allergy-card">
                    <div className="item-main">
                      <strong className="item-name">{item.allergen}</strong>
                      {item.reaction && (
                        <span className="item-meta">Reaction: {item.reaction}</span>
                      )}
                    </div>
                    {item.severity && (
                      <span className={`item-badge badge-${item.severity.toLowerCase()}`}>
                        {item.severity}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. CURRENT MEDICATIONS */}
        <div className="card section-card" id="section-medications">
          <div className="section-card-header">
            <div className="section-title">
              <Pill size={18} />
              <span>Active Current Medications</span>
            </div>
            <span className="provenance-pill small">USER_PROVIDED</span>
          </div>
          <div className="section-card-body">
            {!patient.medications || patient.medications.length === 0 ? (
              <p className="text-muted">No current medications recorded.</p>
            ) : (
              <div className="structured-items-list">
                {patient.medications.map((item, idx) => (
                  <div key={idx} className="item-detail-card med-card">
                    <div className="item-main">
                      <strong className="item-name">{item.name}</strong>
                      <div className="med-meta-group">
                        {item.dosage && <span className="med-dosage">Dosage: {item.dosage}</span>}
                        {item.frequency && (
                          <span className="med-freq">Frequency: {item.frequency}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. OTHER INFORMATION */}
      <div className="card section-card" style={{ marginTop: '1.25rem' }} id="section-other-info">
        <div className="section-card-header">
          <div className="section-title">
            <FileText size={18} />
            <span>Other Relevant Clinical Information</span>
          </div>
          <span className="provenance-pill small">USER_PROVIDED</span>
        </div>
        <div className="section-card-body">
          {patient.other_information ? (
            <p className="clinical-notes-text">{patient.other_information}</p>
          ) : (
            <p className="text-muted">No additional intake notes provided.</p>
          )}
        </div>
      </div>
    </div>
  );
}
