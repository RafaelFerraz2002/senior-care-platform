// API em modo de desenvolvimento: tsc em watch (mantém os metadados dos decorators)
// e node a reiniciar quando o dist muda. O ambiente vem do scripts/dev.mjs da raiz.
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const tsc = ['exec', 'tsc', '-p', 'tsconfig.build.json'];
const inicial = spawnSync('pnpm', tsc, { stdio: 'inherit' });
if (inicial.status !== 0) process.exit(inicial.status ?? 1);

const filhos = [
  spawn('pnpm', [...tsc, '--watch', '--preserveWatchOutput'], { stdio: 'inherit' }),
  spawn('node', ['--watch', '--watch-path=dist', 'dist/main.js'], { stdio: 'inherit' }),
];
let aTerminar = false;
function terminar(sinal) {
  aTerminar = true;
  for (const filho of filhos) filho.kill(sinal);
}
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => terminar(sinal));
for (const filho of filhos) {
  filho.on('exit', (codigo) => {
    if (!aTerminar) {
      terminar('SIGTERM');
      process.exitCode = codigo ?? 1;
    }
  });
}
