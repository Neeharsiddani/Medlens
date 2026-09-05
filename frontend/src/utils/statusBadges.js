/**
 * Shared Clinical Badge and Status Helpers for MedLens UI.
 */

export function getStatusBadge(status) {
  switch (status) {
    case 'LOW':
      return { className: 'status-badge low', label: 'LOW' };
    case 'NORMAL':
      return { className: 'status-badge normal', label: 'NORMAL' };
    case 'HIGH':
      return { className: 'status-badge high', label: 'HIGH' };
    case 'NO_RANGE_AVAILABLE':
      return { className: 'status-badge no-range', label: 'NO RANGE' };
    case 'UNDETERMINED':
    default:
      return { className: 'status-badge undetermined', label: 'UNDETERMINED' };
  }
}

export function getExtractionMethodBadge(method, model, procStatus) {
  if (method === 'GEMINI_AI') {
    return {
      label: `Gemini AI · ${model || 'gemini-2.5-flash'}`,
      style: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', color: '#6d28d9', fontWeight: 600 },
      dotColor: '#7c3aed',
    };
  }
  if (method === 'LOCAL_DETERMINISTIC') {
    return {
      label: 'Deterministic Local Parser · Non-AI',
      style: { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1', fontWeight: 600 },
      dotColor: '#0284c7',
    };
  }
  if (method === 'NOT_AVAILABLE' || procStatus === 'FAILED') {
    return {
      label: 'AI Extraction Unavailable',
      style: { backgroundColor: '#fff1f2', borderColor: '#fecdd3', color: '#be123c', fontWeight: 600 },
      dotColor: '#e11d48',
    };
  }
  return {
    label: 'REPORT_EXTRACTED',
    style: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' },
    dotColor: '#64748b',
  };
}
