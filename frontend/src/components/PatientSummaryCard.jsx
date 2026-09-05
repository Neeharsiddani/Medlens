import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Shield,
  FileText,
  Printer,
} from 'lucide-react';
import { getPatientSummary, generatePatientSummary } from '../api/summaries';

export default function PatientSummaryCard({ patientId, patient, onSummaryUpdated }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatientSummary(patientId);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve patient summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchSummary();
    }
  }, [patientId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const newSummary = await generatePatientSummary(patientId);
      setSummary(newSummary);
      if (onSummaryUpdated) {
        onSummaryUpdated(newSummary);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate summary.');
    } finally {
      setGenerating(false);
    }
  };

  // Authoritative real-time staleness evaluated by backend source fingerprint
  const isStale = Boolean(summary?.is_stale);

  return (
    <div
      className="card patient-summary-container"
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '1px solid #e0e7ff',
        boxShadow: '0 2px 8px rgba(99, 102, 241, 0.04)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #f1f5f9',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: '#1e1b4b',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                Patient Summary
              </h3>
              {summary && (
                <span
                  className="provenance-tag"
                  style={{
                    backgroundColor: summary.provenance_tag === 'AI_GENERATED' ? '#f5f3ff' : '#f8fafc',
                    borderColor: summary.provenance_tag === 'AI_GENERATED' ? '#ddd6fe' : '#e2e8f0',
                    color: summary.provenance_tag === 'AI_GENERATED' ? '#6d28d9' : '#475569',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                  }}
                  title={summary.provenance_tag === 'AI_GENERATED' ? 'Grounded exclusively in structured MedLens record' : 'System generated summary'}
                >
                  <span className="provenance-dot" style={{ backgroundColor: summary.provenance_tag === 'AI_GENERATED' ? '#7c3aed' : '#64748b' }}></span>
                  {summary.provenance_tag === 'AI_GENERATED' ? 'AI Generated Summary' : summary.provenance_tag}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
              Factual, patient-friendly explanation synthesized strictly from structured database entities
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {summary && (
            <>
              <button
                id="print-summary-card-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => window.print()}
                title="Print or export patient summary using browser-native print"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Printer size={13} />
                Print / Export Summary
              </button>
              <button
                id="regenerate-summary-btn"
                className="btn btn-secondary btn-sm"
                disabled={generating || loading}
                onClick={handleGenerate}
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Regenerating...' : 'Regenerate Summary'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#e11d48',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Stale Warning Notification */}
      {isStale && !generating && (
        <div
          style={{
            padding: '0.65rem 0.95rem',
            marginBottom: '1.1rem',
            borderRadius: '8px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={15} color="#d97706" style={{ flexShrink: 0 }} />
            <span>
              The structured patient record has been updated since this summary was generated.
            </span>
          </div>
          <button
            onClick={handleGenerate}
            style={{
              background: 'none',
              border: 'none',
              color: '#b45309',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Update Now
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <RefreshCw size={24} className="animate-spin text-primary" style={{ color: '#4f46e5', margin: '0 auto 0.6rem' }} />
          <div style={{ fontSize: '0.88rem', color: '#475569' }}>Loading patient summary...</div>
        </div>
      )}

      {/* Empty state — No summary generated yet */}
      {!loading && !summary && (
        <div
          style={{
            padding: '2rem 1.5rem',
            textAlign: 'center',
            backgroundColor: '#faf5ff',
            borderRadius: '10px',
            border: '1px dashed #d8b4fe',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#ede9fe',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
            }}
          >
            <Sparkles size={22} />
          </div>
          <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#4c1d95', marginBottom: '0.35rem' }}>
            No Patient Summary Generated Yet
          </h4>
          <p
            style={{
              fontSize: '0.82rem',
              color: '#6b21a8',
              maxWidth: '480px',
              margin: '0 auto 1.25rem',
              lineHeight: 1.5,
            }}
          >
            Generate a patient-friendly summary grounded exclusively in this patient's registered symptoms, conditions, active medications, and extracted laboratory results.
          </p>
          <button
            id="generate-summary-btn"
            className="btn btn-primary"
            disabled={generating}
            onClick={handleGenerate}
            style={{
              backgroundColor: '#6366f1',
              borderColor: '#4f46e5',
              padding: '0.5rem 1.25rem',
              fontSize: '0.86rem',
            }}
          >
            <Sparkles size={15} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Synthesizing Summary...' : 'Generate Patient Summary'}
          </button>
        </div>
      )}

      {/* Summary Content */}
      {!loading && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Narrative Paragraph */}
          <div
            className="patient-summary-narrative"
            style={{
              fontSize: '0.92rem',
              lineHeight: 1.65,
              color: '#1e293b',
              backgroundColor: '#f8fafc',
              padding: '1.1rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            {summary.summary_text}
          </div>

          {/* Key Observations & Data Limitations Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Key Observations */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem 1.15rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '0.65rem',
                }}
              >
                <CheckCircle2 size={16} color="#0284c7" />
                <span>Key Observations</span>
              </div>
              {summary.key_observations && summary.key_observations.length > 0 ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.2rem',
                    fontSize: '0.83rem',
                    color: '#334155',
                    lineHeight: 1.6,
                  }}
                >
                  {summary.key_observations.map((obs, idx) => (
                    <li key={idx} style={{ marginBottom: '0.35rem' }}>
                      {obs}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No specific observations noted.
                </div>
              )}
            </div>

            {/* Data Limitations */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem 1.15rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  marginBottom: '0.65rem',
                }}
              >
                <Info size={16} color="#d97706" />
                <span>Data Limitations & Source Context</span>
              </div>
              {summary.data_limitations && summary.data_limitations.length > 0 ? (
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.2rem',
                    fontSize: '0.83rem',
                    color: '#334155',
                    lineHeight: 1.6,
                  }}
                >
                  {summary.data_limitations.map((lim, idx) => (
                    <li key={idx} style={{ marginBottom: '0.35rem' }}>
                      {lim}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No record limitations documented.
                </div>
              )}
            </div>
          </div>

          {/* Footer Metadata & Provenance Bar */}
          <div
            style={{
              paddingTop: '0.85rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.75rem',
              color: '#64748b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={12} />
                Generated: {new Date(summary.generated_at).toLocaleString()}
              </span>
              <span>•</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                Model: {summary.model_name}
              </span>
              <span>•</span>
              <span>Provenance: {summary.provenance_tag}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#64748b',
                fontStyle: 'italic',
              }}
            >
              <Shield size={12} color="#94a3b8" />
              <span>Grounded in structured record. Not a clinical diagnosis.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
