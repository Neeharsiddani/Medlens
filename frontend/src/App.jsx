import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Users,
  Server,
  Database,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Layers,
  XCircle,
} from 'lucide-react';
import { checkBackendHealth } from './api/health';
import { API_BASE_URL } from './api/client';
import PatientDirectory from './components/PatientDirectory';
import PatientDetailView from './components/PatientDetailView';
import PatientFormModal from './components/PatientFormModal';

export default function App() {
  // Navigation & View State: 'directory' | 'detail' | 'health'
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // Health check state (Phase 1 foundation telemetry)
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setHealthError(err.message || 'Failed to connect to backend server');
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  // Directory / Detail Handlers
  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    setActiveTab('detail');
  };

  const handleBackToDirectory = () => {
    setSelectedPatientId(null);
    setActiveTab('directory');
  };

  const handleOpenAddModal = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (patient) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handlePatientSaved = () => {
    // If we're on detail view, force reload by toggling or keeping id
    if (activeTab === 'detail' && selectedPatientId) {
      setSelectedPatientId(selectedPatientId);
    }
  };

  return (
    <div className="app-container">
      {/* Clinical Workspace Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="brand-name" style={{ margin: 0, fontSize: '1.25rem' }}>
              MedLens
            </h1>
          </div>
          <span className="brand-badge" id="phase-badge">Phase 2: Patient Intake</span>
        </div>

        {/* View Switcher Tabs */}
        <nav className="nav-tabs">
          <button
            id="tab-directory"
            className={`nav-tab-btn ${activeTab === 'directory' || activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => {
              if (activeTab === 'detail') {
                setActiveTab('directory');
                setSelectedPatientId(null);
              } else {
                setActiveTab('directory');
              }
            }}
          >
            <Users size={16} />
            Patient Workspace
          </button>
          <button
            id="tab-health"
            className={`nav-tab-btn ${activeTab === 'health' ? 'active' : ''}`}
            onClick={() => setActiveTab('health')}
          >
            <Activity size={16} />
            System Health
          </button>
        </nav>

        {/* Status Pill & Ping */}
        <div className="nav-actions">
          <div className="nav-health-indicator" title={`Backend: ${API_BASE_URL}`}>
            {healthLoading ? (
              <span className="status-pill warning">
                <span className="status-dot"></span> Checking
              </span>
            ) : health?.status === 'ok' ? (
              <span className="status-pill success">
                <span className="status-dot"></span> Backend Active
              </span>
            ) : (
              <span className="status-pill error">
                <span className="status-dot"></span> Offline
              </span>
            )}
          </div>
          <button
            id="refresh-health-btn"
            className="btn btn-secondary btn-sm"
            onClick={fetchHealth}
            disabled={healthLoading}
          >
            <RefreshCw size={13} className={healthLoading ? 'animate-spin' : ''} />
            Ping
          </button>
        </div>
      </header>

      {/* Main Clinical View Body */}
      <main className="main-content">
        {activeTab === 'directory' && (
          <PatientDirectory
            onSelectPatient={handleSelectPatient}
            onAddPatient={handleOpenAddModal}
            onEditPatient={handleOpenEditModal}
          />
        )}

        {activeTab === 'detail' && selectedPatientId && (
          <PatientDetailView
            patientId={selectedPatientId}
            onBack={handleBackToDirectory}
            onEdit={handleOpenEditModal}
          />
        )}

        {activeTab === 'health' && (
          <div className="health-view-container">
            <section className="hero">
              <div className="hero-subtitle-badge">
                <ShieldCheck size={14} />
                Phase 1 Telemetry • Full-Stack Connectivity
              </div>
              <h2 className="hero-title">
                System <span>Integrity Telemetry</span>
              </h2>
              <p className="hero-desc">
                FastAPI, SQLAlchemy ORM, SQLite database, and React Vite operational telemetry.
              </p>
            </section>

            <div className="verification-grid">
              <div className="card" id="card-frontend">
                <div className="card-header">
                  <div className="card-title-group">
                    <div className="card-icon-wrap">
                      <Layers size={18} />
                    </div>
                    <div className="card-title">Frontend Shell</div>
                  </div>
                  <span className="status-pill success">
                    <span className="status-dot"></span> Active
                  </span>
                </div>
                <div className="card-detail-list">
                  <div className="detail-row">
                    <span className="detail-label">Framework</span>
                    <span className="detail-value">React 18 + Vite</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Target API</span>
                    <span className="detail-value">{API_BASE_URL}</span>
                  </div>
                </div>
              </div>

              <div className="card" id="card-backend">
                <div className="card-header">
                  <div className="card-title-group">
                    <div className="card-icon-wrap">
                      <Server size={18} />
                    </div>
                    <div className="card-title">FastAPI Backend</div>
                  </div>
                  {healthLoading ? (
                    <span className="status-pill warning">Checking...</span>
                  ) : health?.status === 'ok' ? (
                    <span className="status-pill success">Connected</span>
                  ) : (
                    <span className="status-pill error">Offline</span>
                  )}
                </div>
                <div className="card-detail-list">
                  <div className="detail-row">
                    <span className="detail-label">Endpoint</span>
                    <span className="detail-value">GET /health</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Version</span>
                    <span className="detail-value">{health?.version || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="card" id="card-database">
                <div className="card-header">
                  <div className="card-title-group">
                    <div className="card-icon-wrap">
                      <Database size={18} />
                    </div>
                    <div className="card-title">Database Layer</div>
                  </div>
                  {healthLoading ? (
                    <span className="status-pill warning">Checking...</span>
                  ) : health?.database === 'connected' ? (
                    <span className="status-pill success">Healthy</span>
                  ) : (
                    <span className="status-pill error">Disconnected</span>
                  )}
                </div>
                <div className="card-detail-list">
                  <div className="detail-row">
                    <span className="detail-label">Engine</span>
                    <span className="detail-value">SQLite + SQLAlchemy</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Migrations</span>
                    <span className="detail-value">Alembic (Phase 2 schema)</span>
                  </div>
                </div>
              </div>
            </div>

            <section className="terminal-card" style={{ marginTop: '1.5rem' }}>
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <div className="terminal-title">
                  Raw Health Telemetry Payload {lastChecked ? `(${lastChecked})` : ''}
                </div>
                <div style={{ width: '40px' }}></div>
              </div>
              <pre className="terminal-body">
                {JSON.stringify(health || { error: healthError }, null, 2)}
              </pre>
            </section>
          </div>
        )}

        {/* Strict Scope Disclaimer */}
        <section className="scope-banner" id="scope-banner" style={{ marginTop: '2rem' }}>
          <div className="scope-banner-title">
            <Cpu size={16} />
            Phase 2 Scope Boundary Enforcement
          </div>
          <div className="scope-banner-text">
            MedLens is currently running in <strong>Phase 2: Patient Information Intake</strong>. Google Gemini API, clinical report OCR/PDF ingestion, laboratory reference-range engines, provenance visualization graphs, drug interaction engines, and AI clinical summaries are strictly disabled and belong to subsequent phases.
          </div>
        </section>
      </main>

      {/* Patient Intake Create / Edit Modal */}
      <PatientFormModal
        isOpen={isModalOpen}
        patient={editingPatient}
        onClose={() => setIsModalOpen(false)}
        onSaved={handlePatientSaved}
      />

      {/* Footer */}
      <footer className="footer">
        <div>MedLens © 2026 • Clinical Information Intelligence System</div>
        <div>Phase 2: Patient Information Intake (USER_PROVIDED Records)</div>
      </footer>
    </div>
  );
}
