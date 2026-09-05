import React from 'react';
import { FileUp, RefreshCw, Activity, ShieldCheck } from 'lucide-react';

export default function PatientLabsTab({
  patient,
  allLabs = [],
  loadingReports = false,
  onOpenUpload,
  onReviewReport,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Structured Laboratory Results</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Extracted laboratory values with strictly preserved source ranges and provenance
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => onOpenUpload && onOpenUpload(patient)}>
          <FileUp size={15} /> Upload Lab Report
        </button>
      </div>

      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <ShieldCheck size={16} color="#0284c7" />
        <span>
          <strong>Deterministic Range Engine:</strong> Laboratory results retain raw values and report-stated reference ranges. Low/Normal/High classification is evaluated deterministically by the clinical reference engine without AI guessing.
        </span>
      </div>

      {loadingReports ? (
        <div className="empty-state-box" role="status" aria-live="polite" style={{ padding: '2rem' }}>
          <RefreshCw size={24} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading laboratory extractions...</div>
        </div>
      ) : allLabs.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <Activity size={24} />
          </div>
          <div className="empty-title">No Lab Results Extracted Yet</div>
          <div className="empty-desc">
            Upload a blood test, CBC panel, or metabolic report to extract structured laboratory data.
          </div>
          <button className="btn btn-primary" onClick={() => onOpenUpload && onOpenUpload(patient)}>
            <FileUp size={16} /> Upload Lab Report
          </button>
        </div>
      ) : (
        <div className="clinical-table-card">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Result</th>
                <th>Unit</th>
                <th>Reference Range</th>
                <th>Range Status</th>
                <th>Source Document</th>
                <th>Provenance</th>
                <th>Verification</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {allLabs.map((lab) => {
                const activeRangeStatus = lab.current_classification || lab.reference_range_status;
                const rangeBadgeClass =
                  activeRangeStatus === 'LOW' ? 'status-badge low' :
                  activeRangeStatus === 'NORMAL' ? 'status-badge normal' :
                  activeRangeStatus === 'HIGH' ? 'status-badge high' :
                  activeRangeStatus === 'NO_RANGE_AVAILABLE' ? 'status-badge no-range' :
                  activeRangeStatus ? 'status-badge undetermined' : '';

                return (
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
                          Not in report
                        </span>
                      )}
                    </td>
                    <td>
                      {activeRangeStatus ? (
                        <span className={rangeBadgeClass} style={{ fontSize: '0.72rem' }}>
                          {activeRangeStatus === 'NO_RANGE_AVAILABLE' ? 'NO RANGE' : activeRangeStatus}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {lab.reportFilename || lab.report_filename}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {lab.source_page ? `Page ${lab.source_page}` : 'Doc'}
                      </div>
                    </td>
                    <td>
                      {lab.provenance_tag === 'USER_VERIFIED' ? (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
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
                        <span className="provenance-tag" style={{ fontSize: '0.72rem' }}>
                          <span className="provenance-dot"></span> {lab.provenance_tag || 'REPORT_EXTRACTED'}
                        </span>
                      )}
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
                        onClick={() => onReviewReport && onReviewReport(lab.report_id)}
                      >
                        Review in Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
