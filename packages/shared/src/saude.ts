import { z } from 'zod';

/**
 * Resposta de `GET /saude`: estado geral da API e da ligação à base de dados.
 * O `id` dá o nome ao schema no OpenAPI (`#/components/schemas/SaudeResponse`) e no cliente gerado.
 */
export const saudeResponseSchema = z
  .object({
    status: z.enum(['ok', 'error']),
    database: z.enum(['ok', 'error']),
  })
  .meta({ id: 'SaudeResponse' });

export type SaudeResponse = z.infer<typeof saudeResponseSchema>;

export const tipoErrado: number = 'texto';
