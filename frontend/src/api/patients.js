/**
 * Patient API client service for intake, directory retrieval, updates, and deletion.
 */
import { fetchApi } from './client';

export async function getPatients(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const queryString = query.toString();
  const endpoint = `/api/v1/patients${queryString ? `?${queryString}` : ''}`;
  return fetchApi(endpoint);
}

export async function getPatientById(id) {
  return fetchApi(`/api/v1/patients/${id}`);
}

export async function createPatient(payload) {
  return fetchApi('/api/v1/patients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePatient(id, payload) {
  return fetchApi(`/api/v1/patients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deletePatient(id) {
  return fetchApi(`/api/v1/patients/${id}`, {
    method: 'DELETE',
  });
}
