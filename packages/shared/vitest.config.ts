import { coverage } from '@scp/config/vitest/coverage';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { coverage: coverage('unit') },
});
