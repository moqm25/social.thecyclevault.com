import { describe, it, expect, vi, afterEach } from 'vitest';
import { relativeTime } from './time';

describe('relativeTime', () => {
  afterEach(() => vi.useRealTimers());

  function freeze(now: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
  }

  it('returns "just now" for very recent times', () => {
    freeze('2026-06-27T12:00:00Z');
    expect(relativeTime(Date.now() - 5_000)).toBe('just now');
  });

  it('formats minutes, hours, and days', () => {
    freeze('2026-06-27T12:00:00Z');
    expect(relativeTime(Date.now() - 5 * 60_000)).toBe('5m');
    expect(relativeTime(Date.now() - 3 * 3_600_000)).toBe('3h');
    expect(relativeTime(Date.now() - 2 * 86_400_000)).toBe('2d');
  });

  it('falls back to a date for older times', () => {
    freeze('2026-06-27T12:00:00Z');
    const out = relativeTime(Date.now() - 30 * 86_400_000);
    expect(out).toMatch(/[A-Z][a-z]{2}\s\d+/); // e.g. "May 28"
  });

  it('accepts Firestore-like Timestamp objects', () => {
    freeze('2026-06-27T12:00:00Z');
    expect(relativeTime({ toMillis: () => Date.now() - 60_000 })).toBe('1m');
  });

  it('returns empty string for null/undefined', () => {
    expect(relativeTime(null)).toBe('');
    expect(relativeTime(undefined)).toBe('');
  });
});
