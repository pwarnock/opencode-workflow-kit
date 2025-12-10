import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    allowOnly: true,
    // Allow running with no test files
    passWithNoTests: true,
  },
});
