import { getSaudeOptions } from '@scp/api-client';
import { useQuery } from '@tanstack/react-query';

/** Mostra se a API (e a base de dados) responde. Erro HTTP ou falta de rede contam como sem ligação. */
export function EstadoApi() {
  const { data, isPending } = useQuery(getSaudeOptions());

  if (isPending) {
    return <p role="status">A verificar a API…</p>;
  }

  const ligada = data?.baseDeDados === 'ok';
  return <p role="status">{ligada ? 'API ligada' : 'API sem ligação'}</p>;
}
