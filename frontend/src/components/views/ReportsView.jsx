import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { listPatientReports } from '../../api/reports';
import ExtractionReviewModal from '../ExtractionReviewModal';

export default function ReportsView({ onOpenUpload, patients }) {
  const [realReports, setRealReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const loadAllReports = async () => {
    if (!patients || patients.length === 0) return;
    setLoading(true);
    try {
      const allReps = [];
      for (const p of patients) {
        try {
          const res = await listPatientReports(p.id);
          if (res.reports && res.reports.length > 0) {
            res.reports.forEach((r) => {
              allReps.push({
                ...r,
                patientName: p.full_name,
                mrn: p.patient_identifier,
              });
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
      setRealReports(allReps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, [patients]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Clinical Reports Archive</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
            Structured extraction, document hash integrity, and clinician review pipeline
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onOpenUpload(null)}>
          <FileUp size={16} /> Upload Report
        </button>
      </div>

      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          backgroundColor: '#f0f9ff',
          border: '1px solid #bae6fd',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <ShieldCheck size={20} color="#0284c7" />
        <div style={{ fontSize: '0.82rem', color: '#0369a1', lineHeight: 1.5 }}>
          <strong>Report Provenance Architecture:</strong> Uploaded medical documents are hashed with SHA-256 and parsed through schema-constrained extraction. Every extracted value is marked <span className="provenance-tag"><span className="provenance-dot"></span> REPORT_EXTRACTED</span> and starts as Unverified.
        </div>
      </div>

      {loading ? (
        <div className="empty-state-box" style={{ padding: '3rem' }}>
          <RefreshCw size={28} className="animate-spin text-primary" style={{ color: '#0284c7', marginBottom: '0.5rem' }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Loading clinical reports...</div>
        </div>
      ) : realReports.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <FileText size={24} />
          </div>
          <div className="empty-title">No Medical Reports Ingested Yet</div>
          <div className="empty-desc">
            Upload a laboratory report, CBC panel, prescription, or clinical summary to test Phase 3 structured extraction.
          </div>
          <button className="btn btn-primary" onClick={() => onOpenUpload(null)}>
            <FileUp size={16} /> Upload First Report
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {realReports.map((rep) => (
            <div key={rep.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
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

                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.65rem', marginBottom: '0.35rem' }}>
                  {rep.original_filename}
                </h3>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Patient: <strong style={{ color: 'var(--text-primary)' }}>{rep.patientName}</strong> ({rep.mrn})
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>{new Date(rep.uploaded_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{(rep.file_size / 1024).toFixed(1)} KB ({rep.mime_type})</span>
                </div>

                <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Hash: {rep.document_hash.slice(0, 16)}...
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span className="provenance-tag">
                  <span className="provenance-dot"></span> REPORT_EXTRACTED
                </span>

                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedReportId(rep.id)}
                >
                  <Eye size={13} /> Review Extraction
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReportId && (
        <ExtractionReviewModal
          reportId={selectedReportId}
          isOpen={!!selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onUpdate={loadAllReports}
        />
      )}
    </div>
  );
}
