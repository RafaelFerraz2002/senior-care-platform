import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // O SWC compila os decorators do NestJS com a metadata (emitDecoratorMetadata);
  // o plugin desliga o Oxc do Vite, que a perderia.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    // Só os testes unitários: os de integração (*.integracao.test.ts) têm um script próprio.
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'src/**/*.integracao.test.ts'],
  },
});
