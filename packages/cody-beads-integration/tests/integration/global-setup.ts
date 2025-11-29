import { beforeAll } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  try {
    // Build the project if not already built
    if (!existsSync(join(process.cwd(), 'dist'))) {
      console.log('📦 Building project for integration tests...');
      execSync('npm run build', { stdio: 'inherit' });
    }

    // Initialize test database or services
    console.log('🗄️ Initializing test services...');

    // Set up test configuration
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'warn';
    process.env.GITHUB_TOKEN = 'test-github-token';
    process.env.BEADS_PROJECT_PATH = './test-data/beads-project';

    // Create test directories if they don't exist
    const testDirs = [
      './test-data',
      './test-data/beads-project',
      './test-data/temp',
      './test-data/configs'
    ];

    for (const dir of testDirs) {
      if (!existsSync(dir)) {
        execSync(`mkdir -p ${dir}`, { stdio: 'inherit' });
      }
    }

    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.error('❌ Failed to set up integration test environment:', error);
    throw error;
  }
}