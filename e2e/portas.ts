// Portas próprias das apps nos e2e: não colidem com o `pnpm dev` (Gestão 5173, Registo 5174).
// Se o e2e reutilizasse os servidores de desenvolvimento, testava o Vite dev (sem service worker)
// ligado a outra API, e os resultados não valiam nada. A porta da API está no playwright.config.ts.
export const portaGestao = 4173;
export const portaRegisto = 4174;
export const urlGestao = `http://localhost:${portaGestao}`;
export const urlRegisto = `http://localhost:${portaRegisto}`;
