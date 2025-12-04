import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts', './tests/integration/setup.ts'],
    include: [
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.spec.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      'tests/unit',
      'tests/e2e',
      'tests/bdd'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        maxThreads: 1,
        minThreads: 1
      }
    },
    globalSetup: './tests/integration/global-setup.ts',
    sequence: {
      hooks: 'stack',
      concurrent: false
    },
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: './test-results/integration-results.json',
      junit: './test-results/integration-results.xml'
    },
    watch: false,
    bail: 1,
    retry: 2,
    onConsoleLog: (log, type) => {
      if (type === 'stderr') {
        console.warn(`Integration Test Warning: ${log}`);
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './tests')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.INTEGRATION_TEST': JSON.stringify('true')
  }
});