import React, { useState, useEffect, useCallback } from 'react';
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
      const data = await getPatients({ limit: 10 });
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

  // Handlers
  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
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

            <div className="clinician-chip" title="Clinician: General Practice">
              <div className="clinician-avatar">Dr</div>
              <span style={{ fontWeight: 500 }}>Dr. Clinician</span>
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
          />
        )}

        {currentView === 'patients' && (
          <PatientDirectory
            onSelectPatient={handleSelectPatient}
            onAddPatient={handleOpenAddPatient}
            onEditPatient={handleOpenEditPatient}
          />
        )}

        {currentView === 'detail' && selectedPatientId && (
          <PatientDetailView
            patientId={selectedPatientId}
            onBack={handleBackToDirectory}
            onEdit={handleOpenEditPatient}
            onOpenUpload={handleOpenUpload}
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
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Active Medications Directory</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Cross-patient medication reconciliation with audit provenance
              </p>
            </div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Medication reconciliation allows clinicians to compare user-reported intake prescriptions with extracted discharge orders from medical reports. Open an individual patient chart to view their reconciled medication profile.
              </p>
            </div>
          </div>
        )}

        {currentView === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Clinical Encounter Timeline</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Chronological timeline of laboratory reports, physician notes, and patient intake
              </p>
            </div>
            <div className="empty-state-box">
              <div className="empty-icon-bubble">
                <Clock size={24} />
              </div>
              <div className="empty-title">Select a Patient to Inspect Timeline</div>
              <div className="empty-desc">
                Open any patient from the Patient Directory to view their chronological clinical timeline.
              </div>
              <button className="btn btn-secondary" onClick={() => setCurrentView('patients')}>
                Open Patient Directory
              </button>
            </div>
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
      />

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
