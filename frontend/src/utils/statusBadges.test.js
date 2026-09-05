import { describe, it, expect } from 'vitest';
import { getStatusBadge, getExtractionMethodBadge } from './statusBadges';

describe('getStatusBadge', () => {
  it('returns low badge styling for LOW status', () => {
    const badge = getStatusBadge('LOW');
    expect(badge.className).toBe('status-badge low');
    expect(badge.label).toBe('LOW');
  });

  it('returns normal badge styling for NORMAL status', () => {
    const badge = getStatusBadge('NORMAL');
    expect(badge.className).toBe('status-badge normal');
    expect(badge.label).toBe('NORMAL');
  });

  it('returns high badge styling for HIGH status', () => {
    const badge = getStatusBadge('HIGH');
    expect(badge.className).toBe('status-badge high');
    expect(badge.label).toBe('HIGH');
  });

  it('returns no-range badge styling for NO_RANGE_AVAILABLE status', () => {
    const badge = getStatusBadge('NO_RANGE_AVAILABLE');
    expect(badge.className).toBe('status-badge no-range');
    expect(badge.label).toBe('NO RANGE');
  });

  it('defaults to undetermined for unknown or UNDETERMINED status', () => {
    const badge = getStatusBadge('UNDETERMINED');
    expect(badge.className).toBe('status-badge undetermined');
    expect(badge.label).toBe('UNDETERMINED');

    const unknownBadge = getStatusBadge('SOME_UNKNOWN_VALUE');
    expect(unknownBadge.className).toBe('status-badge undetermined');
  });
});

describe('getExtractionMethodBadge', () => {
  it('correctly attributes GEMINI_AI with model name', () => {
    const badge = getExtractionMethodBadge('GEMINI_AI', 'gemini-2.5-flash');
    expect(badge.label).toBe('Gemini AI · gemini-2.5-flash');
    expect(badge.dotColor).toBe('#7c3aed');
  });

  it('correctly attributes LOCAL_DETERMINISTIC as Non-AI', () => {
    const badge = getExtractionMethodBadge('LOCAL_DETERMINISTIC');
    expect(badge.label).toBe('Deterministic Local Parser · Non-AI');
    expect(badge.dotColor).toBe('#0284c7');
  });

  it('correctly labels NOT_AVAILABLE or FAILED states', () => {
    const badge = getExtractionMethodBadge('NOT_AVAILABLE', null, 'FAILED');
    expect(badge.label).toBe('AI Extraction Unavailable');
    expect(badge.dotColor).toBe('#e11d48');
  });

  it('defaults to REPORT_EXTRACTED for generic extraction', () => {
    const badge = getExtractionMethodBadge('UNKNOWN_METHOD');
    expect(badge.label).toBe('REPORT_EXTRACTED');
  });
});
