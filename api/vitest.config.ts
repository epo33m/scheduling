import path from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Unit tests only. Anything touching Prisma/HTTP belongs in test/*.api-spec.ts (jest).
export default defineConfig({
  oxc: false,
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    pool: 'forks',
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: {
    alias: {
      '@repo/types': path.resolve(__dirname, '../packages/types/src/index.ts'),
      '@repo/validators': path.resolve(
        __dirname,
        '../packages/validators/src/index.ts',
      ),
    },
  },
});
