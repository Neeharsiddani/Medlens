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
  Calendar,
  Activity,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { getPatients, deletePatient } from '../api/patients';

export default function PatientDirectory({ onSelectPatient, onAddPatient, onEditPatient }) {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    if (!window.confirm(`Are you sure you want to delete patient record ${patient.patient_identifier} (${patient.full_name})?`)) {
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

  return (
    <div className="directory-container">
      {/* Directory Header & Controls */}
      <div className="directory-header">
        <div className="directory-title-wrap">
          <div className="card-icon-wrap" style={{ width: '40px', height: '40px' }}>
            <Users size={22} />
          </div>
          <div>
            <h2 className="directory-heading">Patient Directory</h2>
            <p className="directory-subheading">
              Structured clinical records • Intake data source: <strong>USER_PROVIDED</strong>
            </p>
          </div>
        </div>

        <div className="directory-actions">
          <button
            id="refresh-directory-btn"
            className="btn btn-secondary"
            onClick={() => loadPatients(searchTerm)}
            disabled={loading}
            title="Refresh Directory"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
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

      {/* Search & Metrics Bar */}
      <div className="search-bar-row">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            id="patient-search-input"
            type="text"
            className="input search-input"
            placeholder="Search by patient name, MRN, or identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="directory-metric">
          Total Records: <strong id="total-patient-count">{total}</strong>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="card error-card">
          <div className="error-card-content">
            <AlertCircle size={20} />
            <div>
              <strong>Failed to retrieve patients:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {/* Directory Content: Table / List */}
      <div className="directory-table-card">
        {loading && patients.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <span>Loading patient records from database...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon-box">
              <Users size={32} />
            </div>
            <h3>No Patient Records Found</h3>
            <p>
              {searchTerm
                ? `No patients match "${searchTerm}". Try adjusting your search query.`
                : 'No clinical intake records currently exist. Create the first patient intake.'}
            </p>
            {!searchTerm && (
              <button className="btn btn-primary" onClick={onAddPatient} style={{ marginTop: '1rem' }}>
                <UserPlus size={16} />
                Register First Patient
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="clinical-table">
              <thead>
                <tr>
                  <th>Patient ID / MRN</th>
                  <th>Full Name</th>
                  <th>Age / DOB</th>
                  <th>Sex</th>
                  <th>Presenting Symptoms</th>
                  <th>Source</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="clickable-row"
                    onClick={() => onSelectPatient(patient.id)}
                  >
                    <td>
                      <span className="mrn-badge">{patient.patient_identifier}</span>
                    </td>
                    <td>
                      <div className="patient-name-cell">
                        <strong>{patient.full_name}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="age-dob-cell">
                        <span>{patient.age !== null ? `${patient.age} yrs` : '—'}</span>
                        {patient.date_of_birth && (
                          <span className="dob-subtext">{patient.date_of_birth}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`sex-pill sex-${(patient.sex || 'unknown').toLowerCase()}`}>
                        {patient.sex || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>
                      <div className="symptoms-tag-list">
                        {patient.symptoms && patient.symptoms.length > 0 ? (
                          patient.symptoms.slice(0, 2).map((s, idx) => (
                            <span key={idx} className="symptom-tag">
                              {s.symptom}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted">None noted</span>
                        )}
                        {patient.symptoms && patient.symptoms.length > 2 && (
                          <span className="more-tag">+{patient.symptoms.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="provenance-pill">
                        <ShieldCheck size={12} />
                        USER_PROVIDED
                      </span>
                    </td>
                    <td className="text-secondary" style={{ fontSize: '0.8rem' }}>
                      {new Date(patient.updated_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-action-btns" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-icon-btn"
                          title="View Patient Chart"
                          onClick={() => onSelectPatient(patient.id)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-icon-btn"
                          title="Edit Patient Intake"
                          onClick={() => onEditPatient(patient)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="action-icon-btn delete-btn"
                          title="Delete Record"
                          disabled={deletingId === patient.id}
                          onClick={(e) => handleDelete(e, patient)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
