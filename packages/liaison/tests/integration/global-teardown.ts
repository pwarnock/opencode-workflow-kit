import { afterAll } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export default async function globalTeardown() {
  console.log('🧹 Tearing down integration test environment...');

  try {
    // Cleanup test data
    const testDirs = [
      './test-data/temp',
      './test-data/beads-project/.beads'
    ];

    for (const dir of testDirs) {
      if (existsSync(dir)) {
        execSync(`rm -rf ${dir}`, { stdio: 'inherit' });
      }
    }

    // Kill any remaining test processes
    try {
      execSync('pkill -f "cody-beads" || true', { stdio: 'ignore' });
    } catch {
      // Ignore errors if no processes to kill
    }

    // Cleanup environment variables
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.GITHUB_TOKEN;
    delete process.env.BEADS_PROJECT_PATH;

    console.log('✅ Integration test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to tear down integration test environment:', error);
    // Don't throw here to avoid failing the entire test suite
  }
}