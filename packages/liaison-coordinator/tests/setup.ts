import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';

// Global test setup for Vitest
beforeAll(async () => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  // Mock console methods in tests
  vi.spyOn(console, 'log').mockImplementation(vi.fn());
  vi.spyOn(console, 'warn').mockImplementation(vi.fn());
  vi.spyOn(console, 'error').mockImplementation(vi.fn());

  // Set up test environment variables
  process.env.GITHUB_TOKEN = 'test-github-token';
  process.env.BEADS_PROJECT_PATH = './test-data/beads-project';

  // Create test directories if they don't exist
  const testDirs = ['./test-data', './test-data/beads-project'];
  for (const dir of testDirs) {
    try {
      execSync(`mkdir -p ${dir}`, { stdio: 'ignore' });
    } catch {
      // Directory might already exist
    }
  }
});

afterAll(async () => {
  // Cleanup global test environment
  vi.restoreAllMocks();

  // Clean up environment variables
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
  delete process.env.GITHUB_TOKEN;
  delete process.env.BEADS_PROJECT_PATH;
});

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Clean up after each test
  try {
    vi.clearAllTimers();
  } catch {
    // Ignore if no fake timers are active
  }
  vi.useRealTimers();
});

// Global test utilities
export const createMockGitHubClient = () => {
  const mockClient = {
    getIssues: vi.fn().mockResolvedValue([]),
    getPullRequests: vi.fn().mockResolvedValue([]),
    getComments: vi.fn().mockResolvedValue([]),
    createIssue: vi.fn().mockResolvedValue({}),
    updateIssue: vi.fn().mockResolvedValue({}),
    createComment: vi.fn().mockResolvedValue({}),
    updateComment: vi.fn().mockResolvedValue({}),
    deleteComment: vi.fn().mockResolvedValue({}),
    addLabel: vi.fn().mockResolvedValue({}),
    removeLabel: vi.fn().mockResolvedValue({}),
    getRepositories: vi.fn().mockResolvedValue([]),
  };

  // Type assertion to allow mock methods
  return mockClient as any;
};

export const createMockConfig = (overrides = {}) => ({
  version: '1.0.0',
  github: {
    owner: 'test-owner',
    repo: 'test-repo',
    token: 'test-token',
    apiUrl: 'https://api.github.com',
  },
  cody: {
    projectId: 'test-cody-project',
    apiUrl: 'https://api.cody.ai',
  },
  beads: {
    projectPath: './test-data/beads-project',
    configPath: '.beads/beads.json',
    autoSync: false,
    syncInterval: 60,
  },
  sync: {
    defaultDirection: 'bidirectional' as const,
    conflictResolution: 'manual' as const,
    preserveComments: true,
    preserveLabels: true,
    syncMilestones: false,
    excludeLabels: ['wontfix', 'duplicate'],
    includeLabels: ['bug', 'feature', 'enhancement'],
  },
  templates: {
    defaultTemplate: 'minimal',
    templatePath: './templates',
  },
  ...overrides,
});
