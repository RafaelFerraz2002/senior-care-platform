import { createFileRoute } from '@tanstack/react-router';
import { ApiStatus } from '../api-status';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Registo Diário</h1>
      <ApiStatus />
    </>
  );
}
