import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  Users,
  FileText,
  Clock,
  Layers,
  Search,
  UserPlus,
  FileUp,
  ShieldCheck,
  Server,
  Database,
  RefreshCw,
  X,
  Pill,
  ArrowRight,
} from 'lucide-react';
import { checkBackendHealth } from './api/health';
import { getPatients } from './api/patients';
import { API_BASE_URL } from './api/client';
import DashboardOverview from './components/DashboardOverview';
import PatientDirectory from './components/PatientDirectory';
import PatientDetailView from './components/PatientDetailView';
import PatientFormModal from './components/PatientFormModal';
import UploadReportModal from './components/UploadReportModal';
import ReportsView from './components/views/ReportsView';
import LabResultsView from './components/views/LabResultsView';
import ExtractionReviewModal from './components/ExtractionReviewModal';

export default function App() {
  // Navigation: 'overview' | 'patients' | 'reports' | 'labs' | 'medications' | 'timeline' | 'detail'
  const [currentView, setCurrentView] = useState('overview');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientInitialTab, setPatientInitialTab] = useState('overview');

  // Data state
  const [patients, setPatients] = useState([]);
  const [totalPatients, setTotalPatients] = useState(0);

  // Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPreselectedPatient, setUploadPreselectedPatient] = useState(null);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [globalReviewReportId, setGlobalReviewReportId] = useState(null);

  // Health state (demoted to footer status indicator)
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Global search
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadPatientList = useCallback(async () => {
    try {
      const data = await getPatients({ limit: 100 });
      setPatients(data.items || []);
      setTotalPatients(data.total || 0);
    } catch {
      // Handled silently
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    loadPatientList();
  }, [fetchHealth, loadPatientList]);

  // Memoized aggregated medications list across all registered patients
  const allMeds = useMemo(() => {
    return (patients || []).flatMap((p) =>
      (p.medications || []).map((m) => ({
        ...m,
        patientId: p.id,
        patientName: p.full_name,
        mrn: p.patient_identifier,
      }))
    );
  }, [patients]);

  // Handlers
  const handleSelectPatient = (id, tab = 'overview') => {
    setSelectedPatientId(id);
    setPatientInitialTab(tab);
    setCurrentView('detail');
  };

  const handleBackToDirectory = () => {
    setSelectedPatientId(null);
    setCurrentView('patients');
  };

  const handleOpenAddPatient = () => {
    setEditingPatient(null);
    setIsPatientModalOpen(true);
  };

  const handleOpenEditPatient = (patient) => {
    setEditingPatient(patient);
    setIsPatientModalOpen(true);
  };

  const handleOpenUpload = (patient = null) => {
    setUploadPreselectedPatient(patient);
    setIsUploadModalOpen(true);
  };

  const handlePatientSaved = () => {
    loadPatientList();
  };

  return (
    <div className="app-container">
      {/* 1. Primary Clinical Navbar */}
      <header className="clinical-navbar">
        <div className="navbar-top-row">
          {/* Brand */}
          <div
            className="brand-section"
            onClick={() => {
              setCurrentView('overview');
              setSelectedPatientId(null);
            }}
          >
            <div className="brand-cross-icon">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div className="brand-titles">
              <span className="brand-title">MedLens</span>
              <span className="brand-subtitle">Clinical Information Intelligence</span>
            </div>
          </div>

          {/* Global Search */}
          <div className="header-search-wrap">
            <Search size={16} className="header-search-icon" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Search patients, MRN, complaints, or reports..."
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                if (currentView !== 'patients') {
                  setCurrentView('patients');
                }
              }}
              onFocus={() => {
                if (currentView !== 'patients') {
                  setCurrentView('patients');
                }
              }}
            />
            <span className="search-shortcut-hint">Ctrl K</span>
          </div>

          {/* Header Actions */}
          <div className="header-actions">
            <button
              id="header-add-patient-btn"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddPatient}
            >
              <UserPlus size={15} />
              Add Patient
            </button>

            <div className="clinician-chip" title="Clinical Workspace">
              <div className="clinician-avatar">CW</div>
              <span style={{ fontWeight: 500 }}>Clinical Workspace</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Row */}
        <div className="navbar-sub-row">
          <div className="navbar-nav-container">
            <button
              className={`nav-link-btn ${currentView === 'overview' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('overview');
                setSelectedPatientId(null);
              }}
            >
              Overview
            </button>

            <button
              id="tab-nav-patients"
              className={`nav-link-btn ${currentView === 'patients' || currentView === 'detail' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('patients');
                setSelectedPatientId(null);
              }}
            >
              <Users size={15} />
              Patients <span className="nav-tab-badge">{totalPatients}</span>
            </button>

            <button
              id="tab-nav-reports"
              className={`nav-link-btn ${currentView === 'reports' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('reports');
                setSelectedPatientId(null);
              }}
            >
              <FileText size={15} />
              Clinical Reports
            </button>

            <button
              id="tab-nav-labs"
              className={`nav-link-btn ${currentView === 'labs' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('labs');
                setSelectedPatientId(null);
              }}
            >
              <Activity size={15} />
              Lab Results
            </button>

            <button
              id="tab-nav-medications"
              className={`nav-link-btn ${currentView === 'medications' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('medications');
                setSelectedPatientId(null);
              }}
            >
              <Pill size={15} />
              Medications
            </button>

            <button
              id="tab-nav-timeline"
              className={`nav-link-btn ${currentView === 'timeline' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('timeline');
                setSelectedPatientId(null);
              }}
            >
              <Clock size={15} />
              Timeline
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Clinical View */}
      <main className="main-content">
        {currentView === 'overview' && (
          <DashboardOverview
            patients={patients}
            totalPatients={totalPatients}
            onOpenUpload={() => handleOpenUpload(null)}
            onOpenAddPatient={handleOpenAddPatient}
            onSelectPatient={handleSelectPatient}
            onViewDirectory={() => setCurrentView('patients')}
            onOpenReviewReport={(repId) => setGlobalReviewReportId(repId)}
            onViewReports={() => setCurrentView('reports')}
          />
        )}

        {currentView === 'patients' && (
          <PatientDirectory
            onSelectPatient={handleSelectPatient}
            onAddPatient={handleOpenAddPatient}
            onEditPatient={handleOpenEditPatient}
            globalSearchTerm={globalSearchTerm}
            onGlobalSearchChange={setGlobalSearchTerm}
          />
        )}

        {currentView === 'detail' && selectedPatientId && (
          <PatientDetailView
            patientId={selectedPatientId}
            onBack={handleBackToDirectory}
            onEdit={handleOpenEditPatient}
            onOpenUpload={handleOpenUpload}
            initialTab={patientInitialTab}
          />
        )}

        {currentView === 'reports' && (
          <ReportsView onOpenUpload={handleOpenUpload} patients={patients} />
        )}

        {currentView === 'labs' && (
          <LabResultsView patients={patients} />
        )}

        {currentView === 'medications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Active Medications Directory</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                    Active pharmaceuticals and intake prescriptions across registered patients
                  </p>
                </div>
              </div>

              {allMeds.length === 0 ? (
                <div className="empty-state-box">
                  <div className="empty-icon-bubble">
                    <Pill size={24} />
                  </div>
                  <div className="empty-title">No Active Medications Documented</div>
                  <div className="empty-desc">
                    Patients in the registry currently have no active medications documented during clinical intake.
                  </div>
                  <button className="btn btn-secondary" onClick={() => setCurrentView('patients')}>
                    Open Patient Directory
                  </button>
                </div>
              ) : (
                <div className="clinical-table-card">
                  <table className="clinical-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>MRN</th>
                        <th>Medication Name</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Provenance</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMeds.map((med, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{med.patientName}</strong>
                          </td>
                          <td>
                            <span className="mrn-badge">{med.mrn}</span>
                          </td>
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
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSelectPatient(med.patientId)}
                            >
                              Open Chart
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        )}

        {currentView === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Clinical Encounter Timeline</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Chronological timeline of registered intakes, laboratory reports, and clinician verifications
              </p>
            </div>

            {(!patients || patients.length === 0) ? (
              <div className="empty-state-box">
                <div className="empty-icon-bubble">
                  <Clock size={24} />
                </div>
                <div className="empty-title">No Patient Encounters Yet</div>
                <div className="empty-desc">
                  Register a patient intake to establish a chronological clinical timeline.
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddPatient}>
                  <UserPlus size={14} /> Add Patient Intake
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Select a Patient Record</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Select any active patient from the registry below to inspect their full chronological timeline:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {patients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p.id, 'timeline')}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{p.full_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          MRN: {p.patient_identifier} • Registered: {new Date(p.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <ArrowRight size={14} color="#0284c7" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Demoted System Health & Architecture Footer */}
      <footer className="system-footer">
        <div className="system-footer-content">
          <div>
            <strong>MedLens</strong> • AI-Powered Clinical Information Intelligence • Healthcare SaaS Architecture
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Developer Telemetry Trigger */}
            <div
              className="system-status-indicator"
              onClick={() => setIsTelemetryModalOpen(true)}
              title="Click to view full-stack system telemetry"
            >
              <span
                className={`status-dot ${health?.status === 'ok' ? '' : healthLoading ? 'checking' : 'offline'}`}
              ></span>
              <span>
                {healthLoading
                  ? 'Checking backend...'
                  : health?.status === 'ok'
                  ? 'Backend: Online • DB: Connected'
                  : 'Backend: Offline'}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. Modals */}
      <PatientFormModal
        isOpen={isPatientModalOpen}
        patient={editingPatient}
        onClose={() => setIsPatientModalOpen(false)}
        onSaved={handlePatientSaved}
      />

      <UploadReportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        patients={patients}
        preselectedPatient={uploadPreselectedPatient}
        onSuccess={(createdReport) => {
          if (createdReport && createdReport.id) {
            setGlobalReviewReportId(createdReport.id);
          }
          loadPatientList();
        }}
      />

      {/* Global Extraction Review Modal */}
      {globalReviewReportId && (
        <ExtractionReviewModal
          reportId={globalReviewReportId}
          isOpen={!!globalReviewReportId}
          onClose={() => setGlobalReviewReportId(null)}
          onUpdate={() => {
            loadPatientList();
          }}
        />
      )}

      {/* Developer Telemetry Dialog (Demoted from primary view) */}
      {isTelemetryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTelemetryModalOpen(false)}>
          <div className="modal-dialog" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Server size={18} color="#0284c7" />
                <div>
                  <h3 className="modal-title">System Infrastructure Status</h3>
                  <p className="modal-subtitle">Phase 1 & Phase 2 Full-Stack Verification</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsTelemetryModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Backend Service</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    FastAPI (Uvicorn)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
                    {health?.status === 'ok' ? '● Connected' : '○ Offline'}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Database Engine</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    SQLite + SQLAlchemy
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.2rem' }}>
                    {health?.database === 'connected' ? '● Schema at Head' : '○ Disconnected'}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Raw Telemetry Payload (GET /health)
                </label>
                <pre
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={fetchHealth}>
                <RefreshCw size={13} className={healthLoading ? 'animate-spin' : ''} />
                Ping API
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsTelemetryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
