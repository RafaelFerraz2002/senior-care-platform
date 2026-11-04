import { describe, expect, it } from 'vitest';

import { RelogioDeTeste, RelogioSistema } from './relogio.js';

describe('Relogio', () => {
  it('o relógio de teste avança sem esperar', () => {
    const relogio = new RelogioDeTeste(new Date('2026-01-01T00:00:00Z'));
    relogio.avancar(14 * 3600_000);
    expect(relogio.agora().toISOString()).toBe('2026-01-01T14:00:00.000Z');
  });

  it('o relógio de teste aceita uma data definida', () => {
    const relogio = new RelogioDeTeste(new Date('2026-01-01T00:00:00Z'));
    relogio.definir(new Date('2027-05-05T10:00:00Z'));
    expect(relogio.agora().toISOString()).toBe('2027-05-05T10:00:00.000Z');
  });

  it('o relógio do sistema devolve a hora atual', () => {
    const antes = Date.now();
    const agora = new RelogioSistema().agora().getTime();
    expect(agora).toBeGreaterThanOrEqual(antes);
    expect(agora).toBeLessThanOrEqual(Date.now());
  });
});
