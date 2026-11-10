// API em modo de desenvolvimento: tsc em watch (mantém os metadados dos decorators)
// e node a reiniciar quando o dist muda. O ambiente vem do scripts/dev.mjs da raiz.
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const tsc = ['exec', 'tsc', '-p', 'tsconfig.build.json'];
const initial = spawnSync('pnpm', tsc, { stdio: 'inherit' });
if (initial.status !== 0) process.exit(initial.status ?? 1);

const children = [
  spawn('pnpm', [...tsc, '--watch', '--preserveWatchOutput'], { stdio: 'inherit' }),
  spawn('node', ['--watch', '--watch-path=dist', 'dist/main.js'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(signal) {
  stopping = true;
  for (const child of children) child.kill(signal);
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
for (const child of children) {
  child.on('exit', (code) => {
    if (!stopping) {
      stop('SIGTERM');
      process.exitCode = code ?? 1;
    }
  });
}
