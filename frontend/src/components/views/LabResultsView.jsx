import React, { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Info,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { listPatientReports, getReportExtraction } from '../../api/reports';
import ExtractionReviewModal from '../ExtractionReviewModal';

export default function LabResultsView({ patients }) {
  const [selectedMrn, setSelectedMrn] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const loadAllLabs = async () => {
    if (!patients || patients.length === 0) return;
    setLoading(true);
    try {
      const accumulator = [];
      for (const p of patients) {
        try {
          const res = await listPatientReports(p.id);
          const reports = res.reports || [];
          for (const rep of reports) {
            try {
              const detail = await getReportExtraction(rep.id);
              if (detail.lab_results && detail.lab_results.length > 0) {
                detail.lab_results.forEach((lab) => {
                  accumulator.push({
                    ...lab,
                    patientName: p.full_name,
                    mrn: p.patient_identifier,
                    reportFilename: rep.original_filename,
                  });
                });
              }
            } catch (err) {
              console.error(err);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLabs(accumulator);
    } catch (err) {
      console.error('Failed to load lab results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllLabs();
  }, [patients]);

  const filteredLabs = labs.filter((lab) => {
    const matchesMrn = selectedMrn === 'ALL' || lab.mrn === selectedMrn;
    const matchesSearch =
      lab.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lab.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lab.reportFilename && lab.reportFilename.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMrn && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Structured Laboratory Intelligence</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Laboratory values extracted from reports with strictly preserved reference ranges and provenance
          </p>
        </div>
      </div>

      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Info size={20} color="#0284c7" />
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong>Deterministic Range Notice:</strong> MedLens strictly preserves exact source reference ranges (e.g. <code>12.0 - 16.0</code>, <code>&gt; 40</code>, <code>Negative</code>). Low/Normal/High classification will be evaluated against standardized clinical reference engines in Phase 4.
        </div>
      </div>

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
            style={{ maxWidth: '360px', height: '36px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Patient:</span>
          <select
            className="input select"
            value={selectedMrn}
            onChange={(e) => setSelectedMrn(e.target.value)}
            style={{ width: 'auto', height: '36px', fontSize: '0.82rem' }}
          >
            <option value="ALL">All Ingested Patients</option>
            {patients &&
              patients.map((p) => (
                <option key={p.id} value={p.patient_identifier}>
                  {p.full_name} ({p.patient_identifier})
                </option>
              ))}
          </select>
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
                <th>Test Parameter</th>
                <th>Result Value</th>
                <th>Units</th>
                <th>Source Reference Range</th>
                <th>Patient</th>
                <th>Provenance Source</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLabs.map((lab) => (
                <tr key={lab.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{lab.test_name}</strong>
                    {lab.observation && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {lab.observation}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {lab.verified_value || lab.value_raw}
                    </span>
                    {lab.verified_value && lab.verified_value !== lab.value_raw && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Raw: {lab.value_raw}
                      </div>
                    )}
                  </td>
                  <td>{lab.unit || '—'}</td>
                  <td>
                    {lab.reference_range_raw ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {lab.reference_range_raw}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
                        None provided in source
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {lab.patientName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lab.mrn}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{lab.reportFilename}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Page {lab.source_page || 1}
                    </div>
                  </td>
                  <td>
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
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                      onClick={() => setSelectedReportId(lab.report_id)}
                    >
                      <Eye size={12} /> Review Report
                    </button>
                  </td>
                </tr>
              ))}
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
