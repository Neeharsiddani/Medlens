import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Code,
  Layers,
  Cpu,
} from 'lucide-react';
import { checkBackendHealth } from './api/health';
import { API_BASE_URL } from './api/client';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to connect to backend server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="app-container">
      {/* Top Navigation */}
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
          <span className="brand-badge" id="phase-badge">Phase 1: Foundation</span>
        </div>

        <div className="nav-actions">
          <button
            id="refresh-health-btn"
            className="btn btn-secondary"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Pinging API...' : 'Ping Backend'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Hero Banner */}
        <section className="hero">
          <div className="hero-subtitle-badge">
            <ShieldCheck size={14} />
            Deterministic Foundation • Stack Integrity Verification
          </div>
          <h2 className="hero-title">
            AI-Powered Clinical <span>Information Intelligence</span>
          </h2>
          <p className="hero-desc">
            MedLens synthesizes and audits clinical reports, medications, and laboratory data with complete audit provenance.
          </p>
        </section>

        {/* Verification Status Cards */}
        <div className="verification-grid">
          {/* Card 1: Frontend Client */}
          <div className="card" id="card-frontend">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrap">
                  <Layers size={18} />
                </div>
                <div className="card-title">Frontend Shell</div>
              </div>
              <span className="status-pill success" id="frontend-status-pill">
                <span className="status-dot"></span>
                Active
              </span>
            </div>
            <div className="card-detail-list">
              <div className="detail-row">
                <span className="detail-label">Framework</span>
                <span className="detail-value">React 18 + Vite</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Styling</span>
                <span className="detail-value">Vanilla CSS Design System</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Target API</span>
                <span className="detail-value">{API_BASE_URL}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Backend API */}
          <div className="card" id="card-backend">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrap">
                  <Server size={18} />
                </div>
                <div className="card-title">FastAPI Backend</div>
              </div>
              {loading ? (
                <span className="status-pill warning" id="backend-status-pill">
                  <span className="status-dot"></span>
                  Checking...
                </span>
              ) : health?.status === 'ok' ? (
                <span className="status-pill success" id="backend-status-pill">
                  <span className="status-dot"></span>
                  Connected
                </span>
              ) : (
                <span className="status-pill error" id="backend-status-pill">
                  <span className="status-dot"></span>
                  Offline
                </span>
              )}
            </div>
            <div className="card-detail-list">
              <div className="detail-row">
                <span className="detail-label">Endpoint</span>
                <span className="detail-value">GET /health</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Latency</span>
                <span className="detail-value">
                  {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : '—'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Service Version</span>
                <span className="detail-value">{health?.version || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Database & Migrations */}
          <div className="card" id="card-database">
            <div className="card-header">
              <div className="card-title-group">
                <div className="card-icon-wrap">
                  <Database size={18} />
                </div>
                <div className="card-title">Database Layer</div>
              </div>
              {loading ? (
                <span className="status-pill warning" id="db-status-pill">
                  <span className="status-dot"></span>
                  Checking...
                </span>
              ) : health?.database === 'connected' ? (
                <span className="status-pill success" id="db-status-pill">
                  <span className="status-dot"></span>
                  Healthy
                </span>
              ) : (
                <span className="status-pill error" id="db-status-pill">
                  <span className="status-dot"></span>
                  Disconnected
                </span>
              )}
            </div>
            <div className="card-detail-list">
              <div className="detail-row">
                <span className="detail-label">Engine</span>
                <span className="detail-value">SQLite + SQLAlchemy</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Migrations</span>
                <span className="detail-value">Alembic (Up to date)</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Validation</span>
                <span className="detail-value">Pydantic v2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div className="card" style={{ borderColor: 'var(--status-error)', background: 'var(--status-error-bg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--status-error)' }}>
              <XCircle size={20} />
              <div>
                <strong>Backend Connection Error:</strong> {error}
                <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  Ensure the FastAPI backend is running on <code>http://localhost:8000</code>.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Payload Inspector */}
        <section className="terminal-card">
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="terminal-dot dot-red"></span>
              <span className="terminal-dot dot-yellow"></span>
              <span className="terminal-dot dot-green"></span>
            </div>
            <div className="terminal-title">
              FastAPI Response Inspector — GET /health {lastChecked ? `(Last synced: ${lastChecked})` : ''}
            </div>
            <div style={{ width: '40px' }}></div>
          </div>
          <pre className="terminal-body" id="raw-payload-viewer">
            {loading && !health
              ? '// Awaiting handshake with backend...'
              : JSON.stringify(health || { error }, null, 2)}
          </pre>
        </section>

        {/* Strict Scope Boundary Disclaimer */}
        <section className="scope-banner" id="scope-banner">
          <div className="scope-banner-title">
            <Cpu size={16} />
            Phase 1 Foundation Scope Boundary
          </div>
          <div className="scope-banner-text">
            This deployment implements strictly <strong>Phase 1: Foundation</strong>. AI extraction, Gemini Vision, PDF parsing, reference-range classification engines, provenance mapping, and clinical summaries are intentionally disabled and scheduled for subsequent phases.
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>MedLens © 2026 • AI-Powered Clinical Information Intelligence</div>
        <div>FastAPI • SQLAlchemy • Alembic • React • Vite</div>
      </footer>
    </div>
  );
}
