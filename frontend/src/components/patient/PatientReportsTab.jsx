import React from 'react';
import { FileUp, RefreshCw, FileText } from 'lucide-react';

export default function PatientReportsTab({
  patient,
  reports = [],
  loadingReports = false,
  onOpenUpload,
  onReviewReport,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Clinical Documents & Reports</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Medical reports, laboratory panels, discharge summaries, and prescriptions for {patient?.full_name}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onOpenUpload && onOpenUpload(patient)}>
          <FileUp size={15} /> Upload Report
        </button>
      </div>

      {loadingReports ? (
        <div className="empty-state-box" style={{ padding: '2rem' }}>
          <RefreshCw size={24} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Loading patient reports...</div>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <FileText size={24} />
          </div>
          <div className="empty-title">No Medical Reports Ingested Yet</div>
          <div className="empty-desc">
            Upload a CBC panel, metabolic panel, discharge summary, or prescription to execute Phase 3 structured extraction.
          </div>
          <button className="btn btn-primary" onClick={() => onOpenUpload && onOpenUpload(patient)}>
            <FileUp size={16} /> Upload First Report
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {rep.report_type || 'OTHER'}
                  </span>
                  <span
                    className={`status-badge ${
                      rep.processing_status === 'REVIEW_REQUIRED'
                        ? 'warning'
                        : rep.processing_status === 'FAILED'
                        ? 'danger'
                        : 'info'
                    }`}
                    style={{ fontSize: '0.72rem' }}
                  >
                    {rep.processing_status === 'REVIEW_REQUIRED' ? 'Requires Review' : rep.processing_status}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
                  {rep.original_filename}
                </h4>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                  <div>Uploaded: {new Date(rep.uploaded_at).toLocaleDateString()}</div>
                  <div>Size: {(rep.file_size / 1024).toFixed(1)} KB ({rep.mime_type})</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Hash: {rep.document_hash ? rep.document_hash.slice(0, 16) : ''}...
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                {(() => {
                  if (rep.extraction_method === 'GEMINI_AI') {
                    return (
                      <span
                        className="provenance-tag"
                        style={{ backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9', fontWeight: 600, fontSize: '0.72rem' }}
                        title={`Gemini AI · ${rep.extraction_model || 'gemini-2.5-flash'}`}
                      >
                        <span className="provenance-dot" style={{ backgroundColor: '#7c3aed' }}></span>
                        {`Gemini AI · ${rep.extraction_model || 'gemini-2.5-flash'}`}
                      </span>
                    );
                  }
                  if (rep.extraction_method === 'LOCAL_DETERMINISTIC') {
                    return (
                      <span
                        className="provenance-tag"
                        style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1', fontWeight: 600, fontSize: '0.72rem' }}
                        title="Deterministic Local Parser — Non-AI"
                      >
                        <span className="provenance-dot" style={{ backgroundColor: '#0284c7' }}></span>
                        Deterministic Local Parser · Non-AI
                      </span>
                    );
                  }
                  if (rep.extraction_method === 'NOT_AVAILABLE' || rep.processing_status === 'FAILED') {
                    return (
                      <span
                        className="provenance-tag"
                        style={{ backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c', fontWeight: 600, fontSize: '0.72rem' }}
                        title="AI Extraction Unavailable"
                      >
                        <span className="provenance-dot" style={{ backgroundColor: '#e11d48' }}></span>
                        AI Extraction Unavailable
                      </span>
                    );
                  }
                  return (
                    <span className="provenance-tag" style={{ fontSize: '0.72rem' }}>
                      <span className="provenance-dot"></span> REPORT_EXTRACTED
                    </span>
                  );
                })()}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onReviewReport && onReviewReport(rep.id)}
                >
                  Review Extraction
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
