import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Info,
  Eye,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { getGlobalLabResults } from '../../api/reports';
import ExtractionReviewModal from '../ExtractionReviewModal';
import { getStatusBadge } from '../../utils/statusBadges';

export default function LabResultsView({ patients }) {
  const [selectedMrn, setSelectedMrn] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const loadAllLabs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getGlobalLabResults({ limit: 200 });
      setLabs(res.labs || []);
    } catch (err) {
      setError(err.message || 'Failed to load lab results.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllLabs();
  }, [loadAllLabs]);

  const filteredLabs = useMemo(() => {
    const sTerm = searchTerm.toLowerCase();
    return labs.filter((lab) => {
      const matchesMrn = selectedMrn === 'ALL' || lab.patient_identifier === selectedMrn || lab.mrn === selectedMrn;
      const currentClass = lab.verified_classification || lab.reference_range_status || 'UNDETERMINED';
      const matchesStatus = selectedStatus === 'ALL' || currentClass === selectedStatus;
      const matchesSearch =
        !sTerm ||
        (lab.test_name && lab.test_name.toLowerCase().includes(sTerm)) ||
        (lab.patient_name && lab.patient_name.toLowerCase().includes(sTerm)) ||
        (lab.patientName && lab.patientName.toLowerCase().includes(sTerm)) ||
        (lab.report_filename && lab.report_filename.toLowerCase().includes(sTerm)) ||
        (lab.reportFilename && lab.reportFilename.toLowerCase().includes(sTerm));
      return matchesMrn && matchesStatus && matchesSearch;
    });
  }, [labs, selectedMrn, selectedStatus, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Cross-Report Lab Comparison</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Structured laboratory registry across clinical documents with deterministic reference-range intelligence and clinician auditability
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '1.1rem 1.25rem',
          borderRadius: '10px',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Info size={18} color="#0284c7" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong>Deterministic Range Engine — Zero AI:</strong> LOW, NORMAL, and HIGH statuses are evaluated strictly via deterministic code against report-provided intervals. Gemini AI never assigns or guesses clinical reference ranges.
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#dc2626',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button
            onClick={loadAllLabs}
            className="btn btn-secondary"
            style={{ marginLeft: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            className="input"
            placeholder="Filter by test name, patient, or report..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '340px', height: '36px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              className="input select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: 'auto', height: '36px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="NO_RANGE_AVAILABLE">NO RANGE</option>
              <option value="UNDETERMINED">UNDETERMINED</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Patient:</span>
            <select
              className="input select"
              value={selectedMrn}
              onChange={(e) => setSelectedMrn(e.target.value)}
              style={{ width: 'auto', height: '36px', fontSize: '0.82rem' }}
            >
              <option value="ALL">All Patients</option>
              {patients &&
                patients.map((p) => (
                  <option key={p.id} value={p.patient_identifier}>
                    {p.full_name} ({p.patient_identifier})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Laboratory Table */}
      {loading ? (
        <div className="empty-state-box" style={{ padding: '3rem' }}>
          <RefreshCw size={28} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading laboratory tests...</div>
        </div>
      ) : filteredLabs.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <Activity size={24} />
          </div>
          <div className="empty-title">No Laboratory Results Found</div>
          <div className="empty-desc">
            Upload medical reports in a patient's chart to extract structured laboratory panels.
          </div>
        </div>
      ) : (
        <div className="clinical-table-card">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>TEST</th>
                <th>VALUE</th>
                <th>UNIT</th>
                <th>REFERENCE RANGE</th>
                <th>STATUS</th>
                <th>SOURCE</th>
                <th>VERIFICATION</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabs.map((lab) => {
                const activeClass = lab.current_classification || lab.reference_range_status || 'UNDETERMINED';
                const badge = getStatusBadge(activeClass);
                return (
                  <tr key={lab.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{lab.test_name}</strong>
                      {lab.observation && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {lab.observation}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                          {lab.verified_value || lab.value_raw}
                        </span>
                        {lab.verified_value && lab.verified_value !== lab.value_raw && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Raw: {lab.value_raw}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {lab.unit || '—'}
                      </span>
                    </td>
                    <td>
                      {lab.reference_range_raw ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          {lab.reference_range_raw}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                          None in source
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        title={lab.classification_reason || `Status: ${badge.label}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'help' }}
                      >
                        <span className={badge.className} style={{ fontSize: '0.72rem' }}>
                          {badge.label}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{lab.reportFilename}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {lab.source_page ? `Page ${lab.source_page}` : 'Doc'} • {lab.patientName}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                        <span
                          className={`status-badge ${
                            lab.verification_status === 'VERIFIED'
                              ? 'success'
                              : lab.verification_status === 'REJECTED'
                              ? 'danger'
                              : 'neutral'
                          }`}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {lab.verification_status}
                        </span>
                        {lab.provenance_tag === 'USER_VERIFIED' ? (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                            title={lab.original_provenance ? `Original source: ${lab.original_provenance}` : 'Verified by user'}
                          >
                            USER_VERIFIED
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px',
                              backgroundColor: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                              fontWeight: 500,
                            }}
                          >
                            {lab.provenance_tag || 'REPORT_EXTRACTED'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedReportId(lab.report_id)}
                      >
                        <Eye size={12} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedReportId && (
        <ExtractionReviewModal
          reportId={selectedReportId}
          isOpen={!!selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onUpdate={loadAllLabs}
        />
      )}
    </div>
  );
}
