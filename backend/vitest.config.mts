import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Source uses NodeNext-style ".js" specifiers that resolve to ".ts" on disk.
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' }],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
