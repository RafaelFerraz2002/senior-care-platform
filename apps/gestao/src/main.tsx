import { client } from '@scp/api-client';
import '@scp/ui/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { iniciarSentry } from './sentry';
import { routeTree } from './routeTree.gen';

iniciarSentry(import.meta.env.VITE_SENTRY_DSN);
client.setConfig({ baseUrl: '/api' });

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
