import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import DashboardOverview from './components/DashboardOverview';
import PatientDirectory from './components/PatientDirectory';
import PatientDetailView from './components/PatientDetailView';
import PatientFormModal from './components/PatientFormModal';
import UploadReportModal from './components/UploadReportModal';
import ExtractionReviewModal from './components/ExtractionReviewModal';
import ReportsView from './components/views/ReportsView';
import LabResultsView from './components/views/LabResultsView';
import PatientSummaryCard from './components/PatientSummaryCard';

describe('App component render', () => {
  it('imports App successfully without throwing', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('renders initial App tree without throwing', () => {
    const html = renderToString(<App />);
    expect(html).toContain('MedLens');
    expect(html).toContain('Active Patients');
  });

  it('renders DashboardOverview without throwing', () => {
    const html = renderToString(
      <DashboardOverview
        patients={[]}
        totalPatients={0}
        onOpenUpload={() => {}}
        onOpenAddPatient={() => {}}
        onSelectPatient={() => {}}
        onViewDirectory={() => {}}
        onOpenReviewReport={() => {}}
        onViewReports={() => {}}
      />
    );
    expect(html).toContain('Recent Patient Records');
  });

  it('renders PatientDirectory without throwing', () => {
    const html = renderToString(
      <PatientDirectory
        onSelectPatient={() => {}}
        onAddPatient={() => {}}
      />
    );
    expect(html).toBeDefined();
  });

  it('renders PatientDetailView without throwing', () => {
    const html = renderToString(
      <PatientDetailView
        patientId={1}
        onBack={() => {}}
        onEdit={() => {}}
        onOpenUpload={() => {}}
      />
    );
    expect(html).toBeDefined();
  });

  it('renders PatientFormModal without throwing', () => {
    const html = renderToString(
      <PatientFormModal
        isOpen={true}
        onClose={() => {}}
        onPatientSaved={() => {}}
      />
    );
    expect(html).toContain('Clinical Intake');
  });

  it('renders UploadReportModal without throwing', () => {
    const html = renderToString(
      <UploadReportModal
        isOpen={true}
        onClose={() => {}}
        onUploadSuccess={() => {}}
      />
    );
    expect(html).toContain('Upload Medical Report');
  });

  it('renders ExtractionReviewModal without throwing', () => {
    const html = renderToString(
      <ExtractionReviewModal
        isOpen={true}
        reportId={1}
        onClose={() => {}}
      />
    );
    expect(html).toBeDefined();
  });

  it('renders ReportsView without throwing', () => {
    const html = renderToString(
      <ReportsView
        patients={[]}
        onOpenUpload={() => {}}
      />
    );
    expect(html).toBeDefined();
  });

  it('renders LabResultsView without throwing', () => {
    const html = renderToString(
      <LabResultsView
        patients={[]}
      />
    );
    expect(html).toBeDefined();
  });

  it('renders PatientSummaryCard without throwing', () => {
    const html = renderToString(
      <PatientSummaryCard
        patientId={1}
      />
    );
    expect(html).toBeDefined();
  });
});


