import { describe, expect, it } from 'vitest';

import { createFakeDataGenerator } from './index.js';

describe('createFakeDataGenerator', () => {
  it('a mesma semente gera os mesmos dados', () => {
    const a = createFakeDataGenerator(42);
    const b = createFakeDataGenerator(42);
    expect(a.nomePessoa()).toBe(b.nomePessoa());
    expect(a.dataNascimento().toISOString()).toBe(b.dataNascimento().toISOString());
  });

  it('sementes diferentes geram dados diferentes', () => {
    expect(createFakeDataGenerator(1).nomePessoa()).not.toBe(
      createFakeDataGenerator(2).nomePessoa(),
    );
  });

  it('gera datas de nascimento de pessoas idosas', () => {
    const data = createFakeDataGenerator(7).dataNascimento();
    const idade = 2026 - data.getFullYear();
    expect(idade).toBeGreaterThanOrEqual(64);
    expect(idade).toBeLessThanOrEqual(96);
  });
});
