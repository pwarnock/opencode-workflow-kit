import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { TestContainer } from 'testcontainers';
import { GenericContainer } from 'testcontainers';
import { Octokit } from '@octokit/rest';

// Integration test setup
let mockGitHubServer: TestContainer;
let mockBeadsServer: TestContainer;

beforeAll(async () => {
  // Start mock services for integration tests
  try {
    // Mock GitHub API server
    mockGitHubServer = await new GenericContainer('mcr.microsoft.com/playwright:v1.47.0')
      .withExposedPorts(3000)
      .withCommand(['node', '-e', `
        const express = require('express');
        const app = express();
        app.use(express.json());

        app.get('/api/v3/repos/:owner/:repo/issues', (req, res) => {
          res.json([{ id: 1, title: 'Test Issue', body: 'Test Body', state: 'open' }]);
        });

        app.post('/api/v3/repos/:owner/:repo/issues', (req, res) => {
          res.json({ id: 2, title: req.body.title, body: req.body.body, state: 'open' });
        });

        app.listen(3000);
      `])
      .start();

    // Mock Beads server
    mockBeadsServer = await new GenericContainer('node:18-alpine')
      .withExposedPorts(3001)
      .withCommand(['node', '-e', `
        const express = require('express');
        const app = express();
        app.use(express.json());

        app.post('/api/v1/issues', (req, res) => {
          res.json({ id: 'beads-1', title: req.body.title, status: 'open' });
        });

        app.listen(3001);
      `])
      .start();

    // Set environment variables for tests
    process.env.GITHUB_API_URL = `http://localhost:${mockGitHubServer.getMappedPort(3000)}`;
    process.env.BEADS_API_URL = `http://localhost:${mockBeadsServer.getMappedPort(3001)}`;
    process.env.GITHUB_TOKEN = 'test-token';
  } catch (error) {
    console.warn('Failed to start mock services, using nock instead:', error);
  }
});

afterAll(async () => {
  // Cleanup mock services
  try {
    if (mockGitHubServer) {
      await mockGitHubServer.stop();
    }
    if (mockBeadsServer) {
      await mockBeadsServer.stop();
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