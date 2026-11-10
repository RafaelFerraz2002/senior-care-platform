import { describe, expect, it } from 'vitest';

import { SystemClock, TestClock } from './clock.js';

describe('Clock', () => {
  it('o relógio de teste avança sem esperar', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00Z'));
    clock.advance(14 * 3600_000);
    expect(clock.now().toISOString()).toBe('2026-01-01T14:00:00.000Z');
  });

  it('o relógio de teste aceita uma data definida', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00Z'));
    clock.set(new Date('2027-05-05T10:00:00Z'));
    expect(clock.now().toISOString()).toBe('2027-05-05T10:00:00.000Z');
  });

  it('o relógio do sistema devolve a hora atual', () => {
    const before = Date.now();
    const now = new SystemClock().now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
