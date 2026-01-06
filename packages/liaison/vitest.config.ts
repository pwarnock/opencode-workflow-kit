import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    allowOnly: true,
    // Allow running with no test files
    passWithNoTests: true,
    // Test file patterns - include all test types
    include: ['**/*.test.ts', '**/*.test.js', '**/*.integration.test.ts', '**/*.integration.test.js'],
    // Exclude dist directory and common non-test directories
    // Also exclude unified-cli test due to @opentui/core dependency issues with .scm files
    exclude: ['node_modules', 'dist/**', 'dist', '.idea', '.git', '.cache', '**/unified-cli.integration.test.ts'],
  },
});
