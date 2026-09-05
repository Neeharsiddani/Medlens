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

export async function getReportsStats() {
  return fetchApi('/api/v1/reports/stats');
}

export async function getGlobalReports(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  const qStr = query.toString();
  return fetchApi(`/api/v1/reports${qStr ? `?${qStr}` : ''}`);
}

export async function getGlobalLabResults(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.patient_id !== undefined) query.append('patient_id', params.patient_id);
  if (params.mrn && params.mrn !== 'ALL') query.append('mrn', params.mrn);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  const qStr = query.toString();
  return fetchApi(`/api/v1/reports/lab-results${qStr ? `?${qStr}` : ''}`);
}
