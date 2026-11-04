import { describe, expect, it } from 'vitest';

import { createGerador } from './index.js';

describe('createGerador', () => {
  it('a mesma semente gera os mesmos dados', () => {
    const a = createGerador(42);
    const b = createGerador(42);
    expect(a.nomePessoa()).toBe(b.nomePessoa());
    expect(a.dataNascimento().toISOString()).toBe(b.dataNascimento().toISOString());
  });

  it('sementes diferentes geram dados diferentes', () => {
    expect(createGerador(1).nomePessoa()).not.toBe(createGerador(2).nomePessoa());
  });

  it('gera datas de nascimento de pessoas idosas', () => {
    const data = createGerador(7).dataNascimento();
    const idade = 2026 - data.getFullYear();
    expect(idade).toBeGreaterThanOrEqual(64);
    expect(idade).toBeLessThanOrEqual(96);
  });
});
