import React from 'react';
import { Pill, CheckCircle2 } from 'lucide-react';

export default function PatientMedicationsTab({ patient }) {
  const medications = patient?.medications || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Documented Active Medications</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Active pharmaceuticals documented during clinical intake with provenance tracking
          </p>
        </div>
      </div>

      {medications.length === 0 ? (
        <div className="empty-state-box">
          <div className="empty-icon-bubble">
            <Pill size={24} />
          </div>
          <div className="empty-title">No Active Medications Documented</div>
          <div className="empty-desc">
            Document active prescriptions during intake or extract them from physician discharge summaries.
          </div>
        </div>
      ) : (
        <div className="clinical-table-card">
          <table className="clinical-table">
            <thead>
              <tr>
                <th>Medication Name</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Provenance Source</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med, i) => (
                <tr key={i}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{med.name}</strong>
                  </td>
                  <td>{med.dosage || '—'}</td>
                  <td>{med.frequency || '—'}</td>
                  <td>
                    <span className="provenance-tag">
                      <span className="provenance-dot"></span> Patient reported
                    </span>
                  </td>
                  <td>
                    <span className="status-badge success">
                      <CheckCircle2 size={12} /> Active Baseline
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
