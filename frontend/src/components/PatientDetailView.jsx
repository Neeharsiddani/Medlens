import React, { useState, useEffect, useMemo } from 'react';
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
  Printer,
} from 'lucide-react';
import { getPatientById, deletePatient } from '../api/patients';
import { listPatientReports, getReportExtraction, getGlobalLabResults } from '../api/reports';
import ExtractionReviewModal from './ExtractionReviewModal';
import PatientSummaryCard from './PatientSummaryCard';
import PatientOverviewTab from './patient/PatientOverviewTab';
import PatientReportsTab from './patient/PatientReportsTab';
import PatientLabsTab from './patient/PatientLabsTab';
import PatientMedicationsTab from './patient/PatientMedicationsTab';
import PatientTimelineTab from './patient/PatientTimelineTab';

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

  // Memoized chronological audit timeline events
  const timelineEvents = useMemo(() => {
    if (!patient) return [];
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
    return events;
  }, [patient, reports, allLabs]);

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
      const [res, labData] = await Promise.all([
        listPatientReports(pid),
        getGlobalLabResults({ patient_id: pid, limit: 500 }).catch(() => ({ labs: [] })),
      ]);
      const repList = res.reports || [];
      setReports(repList);
      setAllLabs(
        (labData.labs || []).map((lab) => ({
          ...lab,
          reportFilename: lab.report_filename,
          reportDate: lab.report_date,
        }))
      );
    } catch (err) {
      setError(err.message || 'Failed to load patient reports.');
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
          <button
            id="print-summary-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => window.print()}
            title="Print or export patient summary using browser-native print"
          >
            <Printer size={15} /> Print / Export Summary
          </button>
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
        <PatientOverviewTab
          patient={patient}
          onSummaryUpdated={() => loadPatient()}
        />
      )}

      {/* TAB 2: REPORTS */}
      {activeTab === 'reports' && (
        <PatientReportsTab
          patient={patient}
          reports={reports}
          loadingReports={loadingReports}
          onOpenUpload={onOpenUpload}
          onReviewReport={setReviewReportId}
        />
      )}

      {/* TAB 3: LAB RESULTS */}
      {activeTab === 'labs' && (
        <PatientLabsTab
          patient={patient}
          allLabs={allLabs}
          loadingReports={loadingReports}
          onOpenUpload={onOpenUpload}
          onReviewReport={setReviewReportId}
        />
      )}

      {/* TAB 4: MEDICATIONS */}
      {activeTab === 'medications' && (
        <PatientMedicationsTab patient={patient} />
      )}

      {/* TAB 5: TIMELINE */}
      {activeTab === 'timeline' && (
        <PatientTimelineTab
          timelineEvents={timelineEvents}
          onReviewReport={setReviewReportId}
        />
      )}

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
