import { fileURLToPath } from 'node:url';

/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  // Resolvido a partir deste pacote, para funcionar em qualquer pasta do monorepo.
  plugins: [fileURLToPath(import.meta.resolve('prettier-plugin-tailwindcss'))],
};
