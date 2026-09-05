import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  User,
  Activity,
  HeartPulse,
  AlertTriangle,
  Pill,
  FileText,
  Save,
} from 'lucide-react';
import { createPatient, updatePatient } from '../api/patients';

export default function PatientFormModal({ patient, isOpen, onClose, onSaved }) {
  const isEdit = Boolean(patient && patient.id);

  // Form states
  const [fullName, setFullName] = useState('');
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('UNKNOWN');
  const [otherInformation, setOtherInformation] = useState('');

  // Structured multi-item lists
  const [symptoms, setSymptoms] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [medications, setMedications] = useState([]);

  // Temp inputs for adding items
  const [symptomInput, setSymptomInput] = useState({ symptom: '', duration: '', severity: '' });
  const [conditionInput, setConditionInput] = useState({ condition: '', diagnosed_year: '', notes: '' });
  const [allergyInput, setAllergyInput] = useState({ allergen: '', reaction: '', severity: '' });
  const [medicationInput, setMedicationInput] = useState({ name: '', dosage: '', frequency: '' });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (patient) {
      setFullName(patient.full_name || '');
      setPatientIdentifier(patient.patient_identifier || '');
      setDateOfBirth(patient.date_of_birth || '');
      setAge(patient.age !== null && patient.age !== undefined ? String(patient.age) : '');
      setSex(patient.sex || 'UNKNOWN');
      setOtherInformation(patient.other_information || '');
      setSymptoms(patient.symptoms || []);
      setConditions(patient.existing_conditions || []);
      setAllergies(patient.allergies || []);
      setMedications(patient.medications || []);
    } else {
      setFullName('');
      setPatientIdentifier('');
      setDateOfBirth('');
      setAge('');
      setSex('UNKNOWN');
      setOtherInformation('');
      setSymptoms([]);
      setConditions([]);
      setAllergies([]);
      setMedications([]);
    }
    setFormError(null);
  }, [patient, isOpen]);

  if (!isOpen) return null;

  // Add Item Handlers
  const handleAddSymptom = (e) => {
    e.preventDefault();
    if (!symptomInput.symptom.trim()) return;
    setSymptoms([
      ...symptoms,
      {
        symptom: symptomInput.symptom.trim(),
        duration: symptomInput.duration.trim() || undefined,
        severity: symptomInput.severity.trim() || undefined,
        source: 'USER_PROVIDED',
      },
    ]);
    setSymptomInput({ symptom: '', duration: '', severity: '' });
  };

  const handleRemoveSymptom = (index) => {
    setSymptoms(symptoms.filter((_, i) => i !== index));
  };

  const handleAddCondition = (e) => {
    e.preventDefault();
    if (!conditionInput.condition.trim()) return;
    setConditions([
      ...conditions,
      {
        condition: conditionInput.condition.trim(),
        diagnosed_year: conditionInput.diagnosed_year.trim() || undefined,
        notes: conditionInput.notes.trim() || undefined,
        source: 'USER_PROVIDED',
      },
    ]);
    setConditionInput({ condition: '', diagnosed_year: '', notes: '' });
  };

  const handleRemoveCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleAddAllergy = (e) => {
    e.preventDefault();
    if (!allergyInput.allergen.trim()) return;
    setAllergies([
      ...allergies,
      {
        allergen: allergyInput.allergen.trim(),
        reaction: allergyInput.reaction.trim() || undefined,
        severity: allergyInput.severity.trim() || undefined,
        source: 'USER_PROVIDED',
      },
    ]);
    setAllergyInput({ allergen: '', reaction: '', severity: '' });
  };

  const handleRemoveAllergy = (index) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!medicationInput.name.trim()) return;
    setMedications([
      ...medications,
      {
        name: medicationInput.name.trim(),
        dosage: medicationInput.dosage.trim() || undefined,
        frequency: medicationInput.frequency.trim() || undefined,
        source: 'USER_PROVIDED',
      },
    ]);
    setMedicationInput({ name: '', dosage: '', frequency: '' });
  };

  const handleRemoveMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Patient legal name is required.');
      return;
    }

    if (!dateOfBirth && (age === '' || isNaN(Number(age)))) {
      setFormError('Either Date of Birth or Age must be provided for patient intake.');
      return;
    }

    if (age !== '' && (Number(age) < 0 || Number(age) > 150)) {
      setFormError('Age must be between 0 and 150 years.');
      return;
    }

    const payload = {
      full_name: fullName.trim(),
      patient_identifier: patientIdentifier.trim() || undefined,
      date_of_birth: dateOfBirth || null,
      age: age !== '' ? parseInt(age, 10) : null,
      sex: sex || 'UNKNOWN',
      symptoms,
      existing_conditions: conditions,
      allergies,
      medications,
      other_information: otherInformation.trim() || null,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await updatePatient(patient.id, payload);
      } else {
        await createPatient(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setFormError(err.message || 'Failed to save patient intake record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#f0f9ff',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEdit ? `Edit Intake: ${patient.patient_identifier}` : 'New Patient Clinical Intake'}
              </h3>
              <p className="modal-subtitle">Structured clinical intake baseline</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Provenance Notice Bar */}
        <div
          style={{
            backgroundColor: '#f0f9ff',
            borderBottom: '1px solid #bae6fd',
            padding: '0.65rem 1.5rem',
            fontSize: '0.8rem',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={16} />
          <span>
            <strong>Data Provenance Notice:</strong> All intake entries will be recorded with <code>USER_PROVIDED</code> provenance semantics.
          </span>
        </div>

        {/* Error Alert */}
        {formError && (
          <div
            style={{
              margin: '1rem 1.5rem 0 1.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--status-critical-bg)',
              border: '1px solid var(--status-critical-border)',
              color: 'var(--status-critical)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Demographics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <User size={16} color="#0284c7" />
                <span>1. Demographics & Identifier</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Full Legal Name *
                  </label>
                  <input
                    id="full-name-input"
                    type="text"
                    className="input"
                    placeholder="e.g. Eleanor Vance"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Clinical ID / MRN <span style={{ color: 'var(--text-muted)' }}>(Auto-generated if empty)</span>
                  </label>
                  <input
                    id="patient-id-input"
                    type="text"
                    className="input"
                    placeholder="e.g. PAT-2026-0042"
                    value={patientIdentifier}
                    onChange={(e) => setPatientIdentifier(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Date of Birth
                  </label>
                  <input
                    id="dob-input"
                    type="date"
                    className="input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Age (years)
                  </label>
                  <input
                    id="age-input"
                    type="number"
                    min="0"
                    max="150"
                    className="input"
                    placeholder="e.g. 45"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Biological Sex
                  </label>
                  <select
                    id="sex-select"
                    className="input select"
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                  >
                    <option value="UNKNOWN">UNKNOWN</option>
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Presenting Complaints */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <Activity size={16} color="#0284c7" />
                <span>2. Presenting Complaints & Symptoms</span>
              </div>

              <div className="builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Symptom (e.g. Chest tightness)"
                  value={symptomInput.symptom}
                  onChange={(e) => setSymptomInput({ ...symptomInput, symptom: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSymptom(e))}
                />
                <input
                  type="text"
                  className="input"
                  style={{ maxWidth: '140px' }}
                  placeholder="Duration (e.g. 3 days)"
                  value={symptomInput.duration}
                  onChange={(e) => setSymptomInput({ ...symptomInput, duration: e.target.value })}
                />
                <select
                  className="input select"
                  style={{ maxWidth: '120px' }}
                  value={symptomInput.severity}
                  onChange={(e) => setSymptomInput({ ...symptomInput, severity: e.target.value })}
                >
                  <option value="">Severity</option>
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddSymptom}
                  disabled={!symptomInput.symptom.trim()}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="chips-cloud">
                {symptoms.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No symptoms added.</span>
                ) : (
                  symptoms.map((item, idx) => (
                    <div key={idx} className="clinical-chip">
                      <span>{item.symptom}</span>
                      {item.duration && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({item.duration})</span>}
                      {item.severity && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.05rem 0.35rem',
                            borderRadius: '4px',
                            backgroundColor: '#e2e8f0',
                          }}
                        >
                          {item.severity}
                        </span>
                      )}
                      <button type="button" className="chip-remove-btn" onClick={() => handleRemoveSymptom(idx)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Medical Conditions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <HeartPulse size={16} color="#0284c7" />
                <span>3. Existing Medical Conditions</span>
              </div>

              <div className="builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Condition (e.g. Hypertension)"
                  value={conditionInput.condition}
                  onChange={(e) => setConditionInput({ ...conditionInput, condition: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition(e))}
                />
                <input
                  type="text"
                  className="input"
                  style={{ maxWidth: '160px' }}
                  placeholder="Year (e.g. 2018)"
                  value={conditionInput.diagnosed_year}
                  onChange={(e) => setConditionInput({ ...conditionInput, diagnosed_year: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddCondition}
                  disabled={!conditionInput.condition.trim()}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="chips-cloud">
                {conditions.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No medical conditions added.</span>
                ) : (
                  conditions.map((item, idx) => (
                    <div key={idx} className="clinical-chip">
                      <span>{item.condition}</span>
                      {item.diagnosed_year && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({item.diagnosed_year})</span>}
                      <button type="button" className="chip-remove-btn" onClick={() => handleRemoveCondition(idx)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Allergies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <AlertTriangle size={16} color="#d97706" />
                <span>4. Known Allergies</span>
              </div>

              <div className="builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Allergen (e.g. Penicillin)"
                  value={allergyInput.allergen}
                  onChange={(e) => setAllergyInput({ ...allergyInput, allergen: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy(e))}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Reaction (e.g. Hives, Anaphylaxis)"
                  value={allergyInput.reaction}
                  onChange={(e) => setAllergyInput({ ...allergyInput, reaction: e.target.value })}
                />
                <select
                  className="input select"
                  style={{ maxWidth: '120px' }}
                  value={allergyInput.severity}
                  onChange={(e) => setAllergyInput({ ...allergyInput, severity: e.target.value })}
                >
                  <option value="">Severity</option>
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddAllergy}
                  disabled={!allergyInput.allergen.trim()}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="chips-cloud">
                {allergies.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No allergies recorded.</span>
                ) : (
                  allergies.map((item, idx) => (
                    <div key={idx} className="clinical-chip" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                      <span style={{ color: '#92400e', fontWeight: 600 }}>{item.allergen}</span>
                      {item.reaction && <span style={{ color: '#b45309', fontSize: '0.72rem' }}>({item.reaction})</span>}
                      <button type="button" className="chip-remove-btn" onClick={() => handleRemoveAllergy(idx)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Current Medications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <Pill size={16} color="#0284c7" />
                <span>5. Current Active Medications</span>
              </div>

              <div className="builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Medication Name (e.g. Lisinopril)"
                  value={medicationInput.name}
                  onChange={(e) => setMedicationInput({ ...medicationInput, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMedication(e))}
                />
                <input
                  type="text"
                  className="input"
                  style={{ maxWidth: '140px' }}
                  placeholder="Dosage (e.g. 10mg)"
                  value={medicationInput.dosage}
                  onChange={(e) => setMedicationInput({ ...medicationInput, dosage: e.target.value })}
                />
                <input
                  type="text"
                  className="input"
                  style={{ maxWidth: '140px' }}
                  placeholder="Frequency (e.g. Daily)"
                  value={medicationInput.frequency}
                  onChange={(e) => setMedicationInput({ ...medicationInput, frequency: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddMedication}
                  disabled={!medicationInput.name.trim()}
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              <div className="chips-cloud">
                {medications.length === 0 ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No medications recorded.</span>
                ) : (
                  medications.map((item, idx) => (
                    <div key={idx} className="clinical-chip" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                      <span style={{ color: '#0369a1', fontWeight: 600 }}>{item.name}</span>
                      {item.dosage && <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{item.dosage}</span>}
                      {item.frequency && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>• {item.frequency}</span>}
                      <button type="button" className="chip-remove-btn" onClick={() => handleRemoveMedication(idx)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 6. Other Clinical Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <FileText size={16} color="#0284c7" />
                <span>6. Other Relevant Information</span>
              </div>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Enter any additional clinical notes, social history, or baseline observations..."
                value={otherInformation}
                onChange={(e) => setOtherInformation(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button id="save-patient-submit-btn" type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={15} />
              {submitting ? 'Saving Intake...' : isEdit ? 'Update Record' : 'Save Patient Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
