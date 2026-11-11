import { describe, expect, it } from 'vitest';

import { saudeResponseSchema } from './index.js';

describe('saudeResponseSchema', () => {
  it('aceita { status: "ok", database: "ok" } e rejeita estados desconhecidos', () => {
    expect(saudeResponseSchema.parse({ status: 'ok', database: 'ok' })).toEqual({
      status: 'ok',
      database: 'error',
    });
    expect(saudeResponseSchema.safeParse({ status: 'talvez', database: 'ok' }).success).toBe(false);
  });
});
