import React from 'react';
import { Activity, HeartPulse, AlertTriangle, Pill } from 'lucide-react';
import PatientSummaryCard from '../PatientSummaryCard';

export default function PatientOverviewTab({ patient, onSummaryUpdated }) {
  if (!patient) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Clinical Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Presenting Symptoms */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
              <Activity size={17} color="#0284c7" />
              <span>Presenting Complaints & Symptoms</span>
            </div>
            <span className="provenance-tag">
              <span className="provenance-dot"></span> Patient reported
            </span>
          </div>

          {!patient.symptoms || patient.symptoms.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No complaints reported during intake.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {patient.symptoms.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{s.symptom}</strong>
                    {s.duration && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Duration: {s.duration}
                      </div>
                    )}
                  </div>
                  {s.severity && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        backgroundColor:
                          s.severity.toLowerCase() === 'severe'
                            ? '#fff1f2'
                            : s.severity.toLowerCase() === 'moderate'
                            ? '#fffbeb'
                            : '#f0fdf4',
                        color:
                          s.severity.toLowerCase() === 'severe'
                            ? '#e11d48'
                            : s.severity.toLowerCase() === 'moderate'
                            ? '#d97706'
                            : '#16a34a',
                        border: `1px solid ${
                          s.severity.toLowerCase() === 'severe'
                            ? '#fecdd3'
                            : s.severity.toLowerCase() === 'moderate'
                            ? '#fde68a'
                            : '#bbf7d0'
                        }`,
                      }}
                    >
                      {s.severity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medical Conditions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
              <HeartPulse size={17} color="#0284c7" />
              <span>Medical History & Conditions</span>
            </div>
            <span className="provenance-tag">
              <span className="provenance-dot"></span> Patient reported
            </span>
          </div>

          {!patient.existing_conditions || patient.existing_conditions.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No past medical conditions documented.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {patient.existing_conditions.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.condition}</strong>
                    {c.diagnosed_year && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Diagnosed: {c.diagnosed_year}
                      </span>
                    )}
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {c.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Known Allergies */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
              <AlertTriangle size={17} color="#d97706" />
              <span>Allergies & Adverse Reactions</span>
            </div>
            <span className="provenance-tag">
              <span className="provenance-dot"></span> Patient reported
            </span>
          </div>

          {!patient.allergies || patient.allergies.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No drug or environmental allergies documented.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {patient.allergies.map((a, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#92400e' }}>{a.allergen}</strong>
                    {a.reaction && (
                      <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Reaction: {a.reaction}</div>
                    )}
                  </div>
                  {a.severity && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        backgroundColor: '#ffffff',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                      }}
                    >
                      {a.severity}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Medications */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.92rem' }}>
              <Pill size={17} color="#0284c7" />
              <span>Current Active Medications</span>
            </div>
            <span className="provenance-tag">
              <span className="provenance-dot"></span> Patient reported
            </span>
          </div>

          {!patient.medications || patient.medications.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No current medications documented.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {patient.medications.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m.name}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {m.dosage && <span>{m.dosage}</span>}
                    {m.frequency && <span>• {m.frequency}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Clinical Notes Card */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Clinical Intake Notes</h4>
          <span className="provenance-tag">
            <span className="provenance-dot"></span> Patient reported
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {patient.other_information || 'No additional intake notes provided.'}
        </p>
      </div>

      {/* AI-Powered Patient-Friendly Summary (Phase 5) */}
      <PatientSummaryCard
        patientId={patient.id}
        patient={patient}
        onSummaryUpdated={onSummaryUpdated}
      />
    </div>
  );
}
