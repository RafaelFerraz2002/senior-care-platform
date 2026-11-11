import { coverage } from '@scp/config/vitest/coverage';
import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // O SWC compila os decorators do NestJS com a metadata (emitDecoratorMetadata);
  // o plugin desliga o Oxc do Vite, que a perderia.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    coverage: coverage('unit'),
    // Só os testes unitários: os de integração (*.integration.test.ts) têm um script próprio.
    include: ['src/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'src/**/*.integration.test.ts'],
  },
});
