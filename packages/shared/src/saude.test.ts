import { describe, expect, it } from 'vitest';

import { saudeRespostaSchema } from './index.js';

describe('saudeRespostaSchema', () => {
  it('aceita { estado: "ok", baseDeDados: "ok" } e rejeita estados desconhecidos', () => {
    expect(saudeRespostaSchema.parse({ estado: 'ok', baseDeDados: 'ok' })).toEqual({
      estado: 'ok',
      baseDeDados: 'ok',
    });
    expect(saudeRespostaSchema.safeParse({ estado: 'talvez', baseDeDados: 'ok' }).success).toBe(
      false,
    );
  });
});
