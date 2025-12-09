import os from 'os';

export default {
  // Test runner configuration
  testRunner: 'vitest',
  testRunnerComment: 'Use Vitest as test runner',
  
  // TypeScript checker
  checker: ['typescript'],
  checkersComment: 'Use TypeScript checker',
  
  // Mutation testing options
  mutate: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ],
  
  // Coverage thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 0
  },
  
  // Reporting
  reporters: ['progress', 'clear-text', 'html'],
  
  // Temp files folder
  tempDirName: '.stryker-tmp',
  
  // Package management (use npm for stryker, but tests run with bun)
  packageManager: 'npm',
  
  // Concurrency
  concurrency: Math.max(1, Math.floor(os.cpus().length / 2)),
  
  // Timeout
  timeoutMS: 60000,
  
  // Max concurrent test runners
  maxConcurrentTestRunners: 2,
  
  // Ignore patterns
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    '.stryker-tmp',
    '!src/**/*.ts'
  ]
};