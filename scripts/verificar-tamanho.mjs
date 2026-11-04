// Verifica o tamanho (gzip) do JavaScript das apps contra os valores de referência em tamanho-apps.json.
// Uso: node scripts/verificar-tamanho.mjs [--atualizar]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import console from 'node:console';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const apps = ['gestao', 'registo'];
const limite = 0.1;
const raiz = fileURLToPath(new URL('..', import.meta.url));
const ficheiroReferencia = `${raiz}tamanho-apps.json`;

function tamanhoGzip(app) {
  const pasta = `${raiz}apps/${app}/dist/assets`;
  if (!existsSync(pasta)) {
    console.error(`Falta ${pasta}. Corra primeiro: pnpm build`);
    process.exit(1);
  }
  return readdirSync(pasta)
    .filter((nome) => nome.endsWith('.js'))
    .reduce((soma, nome) => soma + gzipSync(readFileSync(`${pasta}/${nome}`)).length, 0);
}

const atuais = Object.fromEntries(apps.map((app) => [app, tamanhoGzip(app)]));

if (process.argv.includes('--atualizar')) {
  writeFileSync(ficheiroReferencia, `${JSON.stringify(atuais, null, 2)}\n`);
  console.log(`Valores de referência escritos em tamanho-apps.json: ${JSON.stringify(atuais)}`);
  process.exit(0);
}

if (!existsSync(ficheiroReferencia)) {
  console.error(
    'Falta tamanho-apps.json. Crie-o com: node scripts/verificar-tamanho.mjs --atualizar',
  );
  process.exit(1);
}
const referencia = JSON.parse(readFileSync(ficheiroReferencia, 'utf8'));

let falhou = false;
for (const app of apps) {
  const maximo = Math.round(referencia[app] * (1 + limite));
  const excedeu = atuais[app] > maximo;
  falhou ||= excedeu;
  console.log(
    `${excedeu ? 'FALHA' : 'ok   '} ${app}: ${atuais[app]} B gzip (referência ${referencia[app]} B, máximo ${maximo} B, limite +${limite * 100}%)`,
  );
}
process.exit(falhou ? 1 : 0);
