import React, { useState } from 'react';
import {
  X,
  FileUp,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { uploadReport } from '../api/reports';

export default function UploadReportModal({ isOpen, onClose, patients, preselectedPatient, onSuccess }) {
  const [selectedPatientId, setSelectedPatientId] = useState(
    preselectedPatient ? preselectedPatient.id : ''
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setError('File exceeds the 25MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setError('File exceeds the 25MB limit.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedPatientId) return;

    setUploading(true);
    setError(null);
    setUploadStep('Uploading and processing medical report with structured extraction...');

    try {
      const result = await uploadReport(selectedPatientId, selectedFile, true);
      setUploading(false);
      setSelectedFile(null);
      setUploadStep('');
      onClose();
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload and process report.');
      setUploading(false);
      setUploadStep('');
    }
  };

  return (
    <div className="modal-overlay" onClick={uploading ? undefined : onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileUp size={18} />
            </div>
            <div>
              <h3 className="modal-title">Upload Medical Report</h3>
              <p className="modal-subtitle">Phase 3 Document Ingestion & Structured Extraction</p>
            </div>
          </div>
          <button className="modal-close-btn" disabled={uploading} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Safety & Provenance Notice */}
        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderBottom: '1px solid #bbf7d0',
            padding: '0.65rem 1.5rem',
            fontSize: '0.8rem',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={16} />
          <span>
            <strong>Extraction Only:</strong> Raw values and source reference ranges are strictly preserved. Records start as Unverified.
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Patient Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Associate with Patient *
              </label>
              <select
                className="input select"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                disabled={uploading || !!preselectedPatient}
                required
              >
                <option value="">Select a patient record...</option>
                {patients &&
                  patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.patient_identifier})
                    </option>
                  ))}
              </select>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-canvas)',
                cursor: uploading ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onClick={() => {
                if (!uploading) document.getElementById('report-file-input').click();
              }}
            >
              <input
                id="report-file-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                disabled={uploading}
                onChange={handleFileChange}
              />
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#f0f9ff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UploadCloud size={22} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {selectedFile ? selectedFile.name : 'Choose a clinical document or drag it here'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Accepted: PDF, PNG, JPG, JPEG (Max 25MB)
              </div>
              {selectedFile && (
                <div style={{ fontSize: '0.78rem', color: '#0369a1', fontWeight: 500, marginTop: '0.25rem' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Document'}
                </div>
              )}
            </div>

            {/* Progress / Step Feedback */}
            {uploading && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <RefreshCw size={16} className="animate-spin" />
                <span>{uploadStep}</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" disabled={uploading} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectedFile || !selectedPatientId || uploading}
            >
              <FileUp size={15} />
              {uploading ? 'Processing Extraction...' : 'Upload & Process Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
