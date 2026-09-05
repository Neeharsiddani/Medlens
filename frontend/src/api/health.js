/**
 * Health check API service.
 */
import { fetchApi } from './client';

export async function checkBackendHealth() {
  const startTime = performance.now();
  const data = await fetchApi('/health');
  const latencyMs = Math.round(performance.now() - startTime);
  return {
    ...data,
    latencyMs,
  };
}
