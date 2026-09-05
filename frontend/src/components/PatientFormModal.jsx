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
      // Reset defaults
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

    // Client validation
    if (!fullName.trim()) {
      setFormError('Patient full name is required.');
      return;
    }

    if (!dateOfBirth && (age === '' || isNaN(Number(age)))) {
      setFormError('Either Date of Birth or Age must be provided for patient intake.');
      return;
    }

    if (age !== '' && (Number(age) < 0 || Number(age) > 150)) {
      setFormError('Age must be between 0 and 150.');
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
      setFormError(err.message || 'An error occurred while saving the patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog clinical-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="card-icon-wrap" style={{ width: '36px', height: '36px' }}>
              <User size={18} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEdit ? `Edit Intake: ${patient.patient_identifier}` : 'New Patient Clinical Intake'}
              </h3>
              <p className="modal-subtitle">Phase 2 • Structured Baseline Intake</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Provenance Notice */}
        <div className="modal-provenance-bar">
          <ShieldCheck size={16} />
          <span>
            <strong>Data Provenance Notice:</strong> All information recorded in this intake form is stored with provenance tag <code>USER_PROVIDED</code>.
          </span>
        </div>

        {/* Error Display */}
        {formError && (
          <div className="modal-error-alert">
            <AlertCircle size={18} />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-sections-container">
            {/* Section 1: Demographics & Identity */}
            <div className="form-section">
              <div className="section-title">
                <User size={16} />
                <span>1. Patient Identity & Demographics</span>
              </div>
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="full-name-input">Full Name *</label>
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
                <div className="form-field">
                  <label htmlFor="patient-id-input">
                    Clinical ID / MRN{' '}
                    <span className="label-hint">(Optional — auto-generated if blank)</span>
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
                <div className="form-field">
                  <label htmlFor="dob-input">Date of Birth</label>
                  <input
                    id="dob-input"
                    type="date"
                    className="input"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="age-input">
                    Age (years) <span className="label-hint">(Provide either Age or DOB)</span>
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
                <div className="form-field">
                  <label htmlFor="sex-select">Biological Sex</label>
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

            {/* Section 2: Presenting Symptoms */}
            <div className="form-section">
              <div className="section-title">
                <Activity size={16} />
                <span>2. Presenting Complaints & Symptoms</span>
              </div>
              <div className="multi-builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Symptom (e.g. Dyspnea, Fatigue)"
                  value={symptomInput.symptom}
                  onChange={(e) => setSymptomInput({ ...symptomInput, symptom: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSymptom(e))}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Duration (e.g. 4 days)"
                  value={symptomInput.duration}
                  onChange={(e) => setSymptomInput({ ...symptomInput, duration: e.target.value })}
                  style={{ maxWidth: '140px' }}
                />
                <select
                  className="input select"
                  value={symptomInput.severity}
                  onChange={(e) => setSymptomInput({ ...symptomInput, severity: e.target.value })}
                  style={{ maxWidth: '120px' }}
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

              {/* Added symptoms pill list */}
              <div className="structured-items-cloud">
                {symptoms.length === 0 ? (
                  <span className="text-muted">No symptoms added.</span>
                ) : (
                  symptoms.map((item, idx) => (
                    <div key={idx} className="builder-pill">
                      <strong>{item.symptom}</strong>
                      {item.duration && <span className="pill-sub">({item.duration})</span>}
                      {item.severity && <span className="pill-badge">{item.severity}</span>}
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveSymptom(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 3: Medical Conditions */}
            <div className="form-section">
              <div className="section-title">
                <HeartPulse size={16} />
                <span>3. Existing Medical Conditions</span>
              </div>
              <div className="multi-builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Condition (e.g. Hypertension, Asthma)"
                  value={conditionInput.condition}
                  onChange={(e) => setConditionInput({ ...conditionInput, condition: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCondition(e))}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Diagnosed Year (e.g. 2019)"
                  value={conditionInput.diagnosed_year}
                  onChange={(e) => setConditionInput({ ...conditionInput, diagnosed_year: e.target.value })}
                  style={{ maxWidth: '160px' }}
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

              <div className="structured-items-cloud">
                {conditions.length === 0 ? (
                  <span className="text-muted">No conditions added.</span>
                ) : (
                  conditions.map((item, idx) => (
                    <div key={idx} className="builder-pill">
                      <strong>{item.condition}</strong>
                      {item.diagnosed_year && <span className="pill-sub">({item.diagnosed_year})</span>}
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveCondition(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 4: Allergies */}
            <div className="form-section">
              <div className="section-title">
                <AlertTriangle size={16} />
                <span>4. Known Allergies</span>
              </div>
              <div className="multi-builder-row">
                <input
                  type="text"
                  className="input"
                  placeholder="Allergen (e.g. Penicillin, Latex)"
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
                  value={allergyInput.severity}
                  onChange={(e) => setAllergyInput({ ...allergyInput, severity: e.target.value })}
                  style={{ maxWidth: '120px' }}
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

              <div className="structured-items-cloud">
                {allergies.length === 0 ? (
                  <span className="text-muted">No allergies recorded.</span>
                ) : (
                  allergies.map((item, idx) => (
                    <div key={idx} className="builder-pill allergy-pill">
                      <strong>{item.allergen}</strong>
                      {item.reaction && <span className="pill-sub">({item.reaction})</span>}
                      {item.severity && <span className="pill-badge error-badge">{item.severity}</span>}
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveAllergy(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 5: Current Medications */}
            <div className="form-section">
              <div className="section-title">
                <Pill size={16} />
                <span>5. Current Active Medications</span>
              </div>
              <div className="multi-builder-row">
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
                  placeholder="Dosage (e.g. 10mg)"
                  value={medicationInput.dosage}
                  onChange={(e) => setMedicationInput({ ...medicationInput, dosage: e.target.value })}
                  style={{ maxWidth: '140px' }}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Frequency (e.g. Daily)"
                  value={medicationInput.frequency}
                  onChange={(e) => setMedicationInput({ ...medicationInput, frequency: e.target.value })}
                  style={{ maxWidth: '140px' }}
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

              <div className="structured-items-cloud">
                {medications.length === 0 ? (
                  <span className="text-muted">No active medications recorded.</span>
                ) : (
                  medications.map((item, idx) => (
                    <div key={idx} className="builder-pill med-pill">
                      <strong>{item.name}</strong>
                      {item.dosage && <span className="pill-sub">{item.dosage}</span>}
                      {item.frequency && <span className="pill-badge info-badge">{item.frequency}</span>}
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveMedication(idx)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section 6: Other Information */}
            <div className="form-section">
              <div className="section-title">
                <FileText size={16} />
                <span>6. Other Relevant Clinical Information</span>
              </div>
              <textarea
                className="input textarea"
                rows={3}
                placeholder="Enter any additional clinical context, social history, or baseline notes..."
                value={otherInformation}
                onChange={(e) => setOtherInformation(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              id="save-patient-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <Save size={15} />
              {submitting ? 'Saving Intake Record...' : isEdit ? 'Update Record' : 'Save Patient Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
