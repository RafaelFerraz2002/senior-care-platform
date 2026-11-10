// Arranque do ambiente de desenvolvimento: serviços (docker compose), API e apps.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);

if (!existsSync('.env')) {
  console.error('Falta o ficheiro .env na raiz. Copie o exemplo: cp .env.example .env');
  process.exit(1);
}
// Não sobrepõe variáveis já definidas no ambiente.
process.loadEnvFile('.env');

const services = spawnSync('docker', ['compose', 'up', '-d', '--wait'], { stdio: 'inherit' });
if (services.status !== 0) {
  console.error('Não foi possível arrancar os serviços (docker compose). O Docker está a correr?');
  process.exit(services.status ?? 1);
}

const turbo = spawn('pnpm', ['exec', 'turbo', 'run', 'dev'], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => turbo.kill(signal));
turbo.on('exit', (code, signal) => {
  // Os serviços do docker compose ficam a correr de propósito (docker compose down para parar).
  process.exit(code ?? (signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1));
});
