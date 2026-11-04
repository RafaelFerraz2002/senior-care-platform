import { z } from 'zod';

/**
 * Resposta de `GET /saude`: estado geral da API e da ligação à base de dados.
 * O `id` dá o nome ao schema no OpenAPI (`#/components/schemas/SaudeResposta`) e no cliente gerado.
 */
export const saudeRespostaSchema = z
  .object({
    estado: z.enum(['ok', 'erro']),
    baseDeDados: z.enum(['ok', 'erro']),
  })
  .meta({ id: 'SaudeResposta' });

export type SaudeResposta = z.infer<typeof saudeRespostaSchema>;
