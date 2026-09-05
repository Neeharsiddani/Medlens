/**
 * Patient Summary API client service for Phase 5 AI Patient-Friendly Summary.
 */
import { fetchApi } from './client';

export async function getPatientSummary(patientId) {
  try {
    return await fetchApi(`/api/v1/patients/${patientId}/summary`);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function generatePatientSummary(patientId) {
  return fetchApi(`/api/v1/patients/${patientId}/summary`, {
    method: 'POST',
  });
}
