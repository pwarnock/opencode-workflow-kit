import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { Octokit } from '@octokit/rest';

// Integration test setup
let mockGitHubServer: any;
let mockBeadsServer: any;

beforeAll(async () => {
  // Start mock services for integration tests
  try {
    // For now, we'll use nock for HTTP mocking instead of containers
    // Containers can be added later when needed
    console.log('🔧 Setting up mock services with nock...');
    
    // Set environment variables for tests
    process.env.GITHUB_API_URL = 'https://api.github.com';
    process.env.BEADS_API_URL = 'http://localhost:3001';
    process.env.GITHUB_TOKEN = 'test-token';
  } catch (error) {
    console.warn('Failed to start mock services:', error);
  }
});

afterAll(async () => {
  // Cleanup mock services
  try {
    if (mockGitHubServer) {
      await mockGitHubServer.stop?.();
    }
    if (mockBeadsServer) {
      await mockBeadsServer.stop?.();
    }
  } catch (error) {
    console.warn('Failed to stop mock services:', error);
  }

  // Cleanup environment variables
  delete process.env.GITHUB_API_URL;
  delete process.env.BEADS_API_URL;
  delete process.env.GITHUB_TOKEN;
});

beforeEach(async () => {
  // Reset mock services state before each test
  // This is where you would reset any databases or state
});

afterEach(async () => {
  // Cleanup after each integration test
  // Clean up any temporary files or resources
});