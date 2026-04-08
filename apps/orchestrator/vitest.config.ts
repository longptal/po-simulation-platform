import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [path.join(__dirname, 'src/**/*.test.ts')],
  },
  resolve: {
    alias: {
      '@po-sim/shared': path.join(__dirname, '../../packages/shared/src'),
      '@po-sim/db': path.join(__dirname, '../../packages/db/src'),
    },
  },
});
