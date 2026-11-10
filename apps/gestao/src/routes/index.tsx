import { Button } from '@scp/ui';
import { createFileRoute } from '@tanstack/react-router';
import { ApiStatus } from '../api-status';

export const Route = createFileRoute('/')({ component: Inicio });

function Inicio() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Senior Care Platform — Gestão</h1>
      <ApiStatus />
      <Button className="mt-4" variant="outline">
        Começar
      </Button>
    </>
  );
}
