// Verifica o tamanho (gzip) do JavaScript das apps contra os valores de referência em app-sizes.json.
// Uso: node scripts/check-size.mjs [--update]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const apps = ['gestao', 'registo'];
const limit = 0.1;
const root = fileURLToPath(new URL('..', import.meta.url));
const referenceFile = `${root}app-sizes.json`;

function gzipSize(app) {
  const dir = `${root}apps/${app}/dist/assets`;
  if (!existsSync(dir)) {
    console.error(`Falta ${dir}. Corra primeiro: pnpm build`);
    process.exit(1);
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith('.js'))
    .reduce((sum, name) => sum + gzipSync(readFileSync(`${dir}/${name}`)).length, 0);
}

const current = Object.fromEntries(apps.map((app) => [app, gzipSize(app)]));

if (process.argv.includes('--update')) {
  writeFileSync(referenceFile, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Valores de referência escritos em app-sizes.json: ${JSON.stringify(current)}`);
  process.exit(0);
}

if (!existsSync(referenceFile)) {
  console.error('Falta app-sizes.json. Crie-o com: node scripts/check-size.mjs --update');
  process.exit(1);
}
const reference = JSON.parse(readFileSync(referenceFile, 'utf8'));
// Sem isto, uma app em falta dava NaN e a comparação passava sempre em silêncio.
const missingReference = apps.filter(
  (app) => typeof reference[app] !== 'number' || !Number.isFinite(reference[app]),
);
if (missingReference.length > 0) {
  console.error(
    `app-sizes.json não tem um valor de referência numérico para: ${missingReference.join(', ')}.`,
  );
  process.exit(1);
}

let failed = false;
for (const app of apps) {
  const max = Math.round(reference[app] * (1 + limit));
  const exceeded = current[app] > max;
  failed ||= exceeded;
  console.log(
    `${exceeded ? 'FALHA' : 'ok   '} ${app}: ${current[app]} B gzip (referência ${reference[app]} B, máximo ${max} B, limite +${limit * 100}%)`,
  );
}
process.exit(failed ? 1 : 0);
