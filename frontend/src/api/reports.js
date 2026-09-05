/**
 * Medical Reports and Structured Extraction API endpoints.
 */
import { fetchApi } from './client';

export async function uploadReport(patientId, file, autoProcess = true) {
  const formData = new FormData();
  formData.append('file', file);

  return fetchApi(`/api/v1/patients/${patientId}/reports?auto_process=${autoProcess}`, {
    method: 'POST',
    body: formData,
  });
}

export async function listPatientReports(patientId) {
  return fetchApi(`/api/v1/patients/${patientId}/reports`);
}

export async function getReport(reportId) {
  return fetchApi(`/api/v1/reports/${reportId}`);
}

export async function getReportExtraction(reportId) {
  return fetchApi(`/api/v1/reports/${reportId}/extraction`);
}

export async function processReport(reportId) {
  return fetchApi(`/api/v1/reports/${reportId}/process`, {
    method: 'POST',
  });
}

export async function updateReportMetadata(reportId, updateData) {
  return fetchApi(`/api/v1/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
}

export async function verifyLabResult(reportId, resultId, verificationData) {
  return fetchApi(`/api/v1/reports/${reportId}/lab-results/${resultId}/verify`, {
    method: 'PATCH',
    body: JSON.stringify(verificationData),
  });
}
