/**
 * API client configuration and base fetch wrapper.
 * In development / localhost: defaults to 'http://localhost:8000'.
 * In deployed production (e.g. GitHub Pages): defaults to same-origin relative path or window.MEDLENS_API_URL
 * to prevent browser Mixed Content (HTTPS -> insecure HTTP localhost) security blocking.
 */
export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.MEDLENS_API_URL) {
      return window.MEDLENS_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
      return 'http://localhost:8000';
    }
    // Production static hosting fallback: do not target insecure http://localhost:8000
    return '';
  }
  return 'http://localhost:8000';
}

const API_BASE_URL = getApiBaseUrl();

export async function fetchApi(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail
          .map((d) => (d.loc ? `${d.loc.slice(-1)[0]}: ${d.msg}` : d.msg))
          .join('; ');
      } else if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Non-JSON response
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export { API_BASE_URL };
