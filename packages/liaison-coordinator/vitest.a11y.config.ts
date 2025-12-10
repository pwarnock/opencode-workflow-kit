import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/a11y/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'tests/unit', 'tests/e2e', 'tests/bdd'],
    testTimeout: 30000,
    hookTimeout: 30000,
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: './test-results/a11y-results.json',
      junit: './test-results/a11y-results.xml'
    },
    watch: false,
    bail: 1,
    retry: 2
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.A11Y_TEST': JSON.stringify('true')
  }
});