import { checkBackendHealth } from '../api/health';

/**
 * Service wrapper for backend health checks.
 */
export async function getSystemHealth() {
  return await checkBackendHealth();
}
