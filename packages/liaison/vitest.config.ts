import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    allowOnly: true,
    // Allow running with no test files
    passWithNoTests: true,
    // Test file patterns - include all test types
    include: ['**/*.test.ts', '**/*.test.js', '**/*.integration.test.ts', '**/*.integration.test.js'],
    // Exclude integration tests by default (run with --include pattern)
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
  },
});
