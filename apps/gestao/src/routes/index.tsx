import { Button } from '@scp/ui';
import { createFileRoute } from '@tanstack/react-router';
import { EstadoApi } from '../estado-api';

export const Route = createFileRoute('/')({ component: Inicio });

function Inicio() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Senior Care Platform — Gestão</h1>
      <EstadoApi />
      <Button className="mt-4" variant="outline">
        Começar
      </Button>
    </>
  );
}
