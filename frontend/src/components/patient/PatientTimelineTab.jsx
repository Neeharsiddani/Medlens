import React from 'react';

export default function PatientTimelineTab({
  timelineEvents = [],
  onReviewReport,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Clinical Chronology & Encounters</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
          Auditable sequence of intake, document ingestions, and clinician verifications
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {timelineEvents.map((evt, idx) => (
          <div key={evt.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: evt.type === 'INTAKE' ? '#0284c7' : evt.type === 'VERIFICATION' ? '#16a34a' : '#7c3aed',
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.2)',
                  marginTop: '2px',
                }}
              />
              {idx < timelineEvents.length - 1 && (
                <div style={{ width: '2px', flex: 1, backgroundColor: '#e2e8f0', margin: '0.35rem 0' }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: idx < timelineEvents.length - 1 ? '1.25rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{evt.title}</strong>
                <span
                  className="provenance-tag"
                  style={{ ...evt.badgeStyle, fontSize: '0.7rem', padding: '0.1rem 0.45rem', fontWeight: 600 }}
                >
                  <span className="provenance-dot" style={{ backgroundColor: evt.badgeStyle?.color }} />
                  {evt.badge}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {evt.date.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                {evt.desc}
              </div>
              {evt.reportId && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => onReviewReport && onReviewReport(evt.reportId)}
                >
                  Review Document Extraction
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
