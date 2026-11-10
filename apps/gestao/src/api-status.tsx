import { getSaudeOptions } from '@scp/api-client';
import { useQuery } from '@tanstack/react-query';

/** Mostra se a API (e a base de dados) responde. Erro HTTP ou falta de rede contam como sem ligação. */
export function ApiStatus() {
  const { data, isPending } = useQuery({
    ...getSaudeOptions(),
    // Sem repetições e sem pausar offline: a falha tem de aparecer logo como "sem ligação".
    retry: false,
    networkMode: 'always',
  });

  if (isPending) {
    return <p role="status">A verificar a API…</p>;
  }

  const connected = data?.database === 'ok';
  return <p role="status">{connected ? 'API ligada' : 'API sem ligação'}</p>;
}
