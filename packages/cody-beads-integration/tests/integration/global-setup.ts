import { TestContainer } from 'testcontainers';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DATA_DIR = join(process.cwd(), '.test-data');
const INTEGRATION_TEST_DIR = join(TEST_DATA_DIR, 'integration');

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  // Create test data directories
  if (!existsSync(TEST_DATA_DIR)) {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  
  if (!existsSync(INTEGRATION_TEST_DIR)) {
    mkdirSync(INTEGRATION_TEST_DIR, { recursive: true });
  }

  // Set up test environment variables
  process.env.INTEGRATION_TEST = 'true';
  process.env.TEST_DATA_DIR = INTEGRATION_TEST_DIR;
  process.env.NODE_ENV = 'test';

  // Build the project if not already built
  if (!existsSync(join(process.cwd(), 'dist'))) {
    console.log('📦 Building project for integration tests...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // Initialize test containers if needed
  try {
    // Example: Set up a mock GitHub API container
    // const githubContainer = await new TestContainer()
    //   .withImage('mockserver/mockserver:latest')
    //   .withExposedPorts(1080)
    //   .start();
    
    // process.env.MOCK_GITHUB_URL = `http://localhost:${githubContainer.getMappedPort(1080)}`;
    
    console.log('✅ Integration test environment ready');
  } catch (error) {
    console.warn('⚠️  Could not start test containers:', error);
    console.log('🔄 Continuing with local integration tests...');
  }

  // Create test configuration files
  const testConfig = {
    github: {
      apiUrl: process.env.MOCK_GITHUB_URL || 'https://api.github.com',
      token: 'test-token'
    },
    beads: {
      dataDir: INTEGRATION_TEST_DIR,
      syncInterval: 5000
    },
    cody: {
      projectDir: INTEGRATION_TEST_DIR,
      templatesDir: join(INTEGRATION_TEST_DIR, 'templates')
    }
  };

  writeFileSync(
    join(INTEGRATION_TEST_DIR, 'test-config.json'),
    JSON.stringify(testConfig, null, 2)
  );

  // Initialize git repository for testing
  const gitTestDir = join(INTEGRATION_TEST_DIR, 'git-repo');
  if (!existsSync(gitTestDir)) {
    mkdirSync(gitTestDir, { recursive: true });
    
    try {
      execSync('git init', { cwd: gitTestDir });
      execSync('git config user.name "Test User"', { cwd: gitTestDir });
      execSync('git config user.email "test@example.com"', { cwd: gitTestDir });
      
      // Create initial commit
      writeFileSync(join(gitTestDir, 'README.md'), '# Test Repository');
      execSync('git add README.md', { cwd: gitTestDir });
      execSync('git commit -m "Initial commit"', { cwd: gitTestDir });
      
      console.log('✅ Git test repository initialized');
    } catch (error) {
      console.warn('⚠️  Could not initialize git test repository:', error);
    }
  }

  return async () => {
    console.log('🧹 Cleaning up integration test environment...');
    
    // Cleanup containers if they were started
    // if (githubContainer) {
    //   await githubContainer.stop();
    // }
    
    console.log('✅ Integration test cleanup complete');
  };
}