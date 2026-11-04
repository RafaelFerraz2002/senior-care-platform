import { createFileRoute } from '@tanstack/react-router';
import { EstadoApi } from '../estado-api';

export const Route = createFileRoute('/')({ component: Inicio });

function Inicio() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Registo Diário</h1>
      <EstadoApi />
    </>
  );
}
