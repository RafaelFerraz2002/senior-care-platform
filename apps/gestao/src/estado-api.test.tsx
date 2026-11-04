import { client } from '@scp/api-client';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { EstadoApi } from './estado-api';

// QueryClient com os valores por omissão (retry e networkMode incluídos), como em main.tsx:
// o EstadoApi tem de garantir sozinho que mostra "API sem ligação" depressa e sem rede.
function renderizar() {
  const cliente = new QueryClient();
  render(
    <QueryClientProvider client={cliente}>
      <EstadoApi />
    </QueryClientProvider>,
  );
}

function resposta(corpo: unknown, status: number) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('EstadoApi', () => {
  // No jsdom o fetch precisa de URL absoluta (na app o proxy resolve o '/api').
  beforeAll(() => client.setConfig({ baseUrl: 'http://localhost/api' }));
  afterEach(() => {
    vi.unstubAllGlobals();
    onlineManager.setOnline(true);
  });

  it('mostra "API ligada" quando a API responde ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(resposta({ estado: 'ok', baseDeDados: 'ok' }, 200)),
    );
    renderizar();
    expect(await screen.findByText('API ligada')).toBeInTheDocument();
  });

  it('mostra "API sem ligação" quando a API responde 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(resposta({ estado: 'erro', baseDeDados: 'erro' }, 503)),
    );
    renderizar();
    expect(await screen.findByText('API sem ligação')).toBeInTheDocument();
  });

  it('mostra "API sem ligação" quando o pedido falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderizar();
    expect(await screen.findByText('API sem ligação')).toBeInTheDocument();
  });

  it('mostra "API sem ligação" quando o browser está offline', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    onlineManager.setOnline(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderizar();
    expect(
      await screen.findByText('API sem ligação', undefined, { timeout: 1500 }),
    ).toBeInTheDocument();
  });
});
