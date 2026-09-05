import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  Filter,
} from 'lucide-react';
import { getPatients, deletePatient } from '../api/patients';

export default function PatientDirectory({ onSelectPatient, onAddPatient, onEditPatient }) {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sexFilter, setSexFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const loadPatients = useCallback(async (searchQuery = '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatients({ search: searchQuery });
      setPatients(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load patient records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPatients(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, loadPatients]);

  const handleDelete = async (e, patient) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete patient record ${patient.patient_identifier} (${patient.full_name})?`)) {
      return;
    }

    setDeletingId(patient.id);
    try {
      await deletePatient(patient.id);
      loadPatients(searchTerm);
    } catch (err) {
      alert(`Deletion error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (sexFilter === 'ALL') return true;
    return (patient.sex || '').toUpperCase() === sexFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Patient Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Structured clinical patient records • Intake source: User-provided baseline
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="refresh-directory-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => loadPatients(searchTerm)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            id="add-patient-btn"
            className="btn btn-primary"
            onClick={onAddPatient}
          >
            <UserPlus size={16} />
            Add Patient Intake
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '460px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="patient-search-input"
              type="text"
              className="input"
              style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.85rem' }}
              placeholder="Search by patient name, MRN, or complaint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="input select"
              style={{ height: '38px', width: 'auto', paddingRight: '2rem', fontSize: '0.82rem' }}
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
            >
              <option value="ALL">All Sexes</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredPatients.length}</strong> of{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> patients
        </div>
      </div>

      {/* 3. Error Alert */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: 'var(--status-critical-bg)',
            border: '1px solid var(--status-critical-border)',
            color: 'var(--status-critical)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Patient Clinical Cards Grid */}
      {loading && patients.length === 0 ? (
        <div className="empty-state-box">
          <RefreshCw size={24} className="animate-spin text-primary" style={{ marginBottom: '0.75rem', color: '#0284c7' }} />
          <div className="empty-title">Loading clinical records...</div>
          <div className="empty-desc">Fetching patient directories from the secure SQLite database.</div>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <Users size={24} />
          </div>
          <div className="empty-title">No Patient Records Found</div>
          <div className="empty-desc">
            {searchTerm
              ? `No patient records match the query "${searchTerm}". Try a different name or MRN.`
              : 'The clinical directory is currently empty. Register your first patient intake to get started.'}
          </div>
          {!searchTerm && (
            <button className="btn btn-primary" onClick={onAddPatient}>
              <UserPlus size={16} /> Add Patient Intake
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              className="card"
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: '1px solid var(--border-subtle)',
              }}
              onClick={() => onSelectPatient(patient.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#bae6fd';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div>
                {/* Header: Name & MRN Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <h3
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '0.2rem',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {patient.full_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="mrn-badge">{patient.patient_identifier}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {patient.age !== null ? `${patient.age} yrs` : 'Age N/A'} • {patient.sex ? patient.sex.toLowerCase() : 'unknown sex'}
                      </span>
                    </div>
                  </div>

                  <div className="provenance-tag" title="Source: Patient/Clinician Intake">
                    <span className="provenance-dot"></span>
                    Patient reported
                  </div>
                </div>

                {/* Presenting Complaints / Symptoms */}
                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' }}>
                    Presenting Complaints
                  </div>
                  <div className="chips-cloud">
                    {patient.symptoms && patient.symptoms.length > 0 ? (
                      patient.symptoms.slice(0, 3).map((s, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {s.symptom}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        None recorded at baseline
                      </span>
                    )}
                    {patient.symptoms && patient.symptoms.length > 3 && (
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, alignSelf: 'center' }}>
                        +{patient.symptoms.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Metadata & Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} />
                  <span>Updated {new Date(patient.updated_at).toLocaleDateString()}</span>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.25rem 0.55rem' }}
                    title="Open Chart"
                    onClick={() => onSelectPatient(patient.id)}
                  >
                    <Eye size={13} /> View
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.25rem 0.55rem' }}
                    title="Edit Intake"
                    onClick={() => onEditPatient(patient)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.25rem 0.55rem' }}
                    title="Delete Record"
                    disabled={deletingId === patient.id}
                    onClick={(e) => handleDelete(e, patient)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
