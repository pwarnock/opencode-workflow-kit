import { vi } from 'vitest';
import nock from 'nock';

/**
 * Mock utilities for external services
 */
export class MockUtils {
  /**
   * Create a mock GitHub API scope
   */
  static createGitHubMock() {
    return nock('https://api.github.com')
      .defaultReplyHeaders({
        'Content-Type': 'application/json',
        'X-GitHub-Media-Type': 'github.v3'
      });
  }

  /**
   * Mock GitHub issues endpoint
   */
  static mockGitHubIssues(issues: any[] = []) {
    return this.createGitHubMock()
      .get('/repos/test-owner/test-repo/issues')
      .query({ state: 'open' })
      .reply(200, issues);
  }

  /**
   * Mock GitHub create issue endpoint
   */
  static mockGitHubCreateIssue(issue: any) {
    return this.createGitHubMock()
      .post('/repos/test-owner/test-repo/issues')
      .reply(201, issue);
  }

  /**
   * Mock GitHub update issue endpoint
   */
  static mockGitHubUpdateIssue(issueNumber: number, issue: any) {
    return this.createGitHubMock()
      .patch(`/repos/test-owner/test-repo/issues/${issueNumber}`)
      .reply(200, issue);
  }

  /**
   * Mock Beads API scope
   */
  static createBeadsMock() {
    return nock('https://api.beads.io')
      .defaultReplyHeaders({
        'Content-Type': 'application/json'
      });
  }

  /**
   * Mock Beads tasks endpoint
   */
  static mockBeadsTasks(tasks: any[] = []) {
    return this.createBeadsMock()
      .get('/projects/test-project-id/tasks')
      .query({ status: 'open' })
      .reply(200, tasks);
  }

  /**
   * Mock Beads create task endpoint
   */
  static mockBeadsCreateTask(task: any) {
    return this.createBeadsMock()
      .post('/projects/test-project-id/tasks')
      .reply(201, task);
  }

  /**
   * Mock Beads update task endpoint
   */
  static mockBeadsUpdateTask(taskId: string, task: any) {
    return this.createBeadsMock()
      .patch(`/projects/test-project-id/tasks/${taskId}`)
      .reply(200, task);
  }

  /**
   * Clean up all nock mocks
   */
  static cleanupMocks(): void {
    nock.cleanAll();
    nock.restore();
  }

  /**
   * Activate nock for testing
   */
  static activateMocks(): void {
    if (!nock.isActive()) {
      nock.activate();
    }
  }
}

/**
 * File system mock utilities
 */
export class FileSystemMock {
  private static mockFs = new Map();

  /**
   * Mock file system operations
   */
  static mockFileSystem(files: Record<string, string>): void {
    this.mockFs.clear();
    Object.entries(files).forEach(([path, content]) => {
      this.mockFs.set(path, content);
    });
  }

  /**
   * Mock file read operation
   */
  static mockReadFile(path: string): string | null {
    return this.mockFs.get(path) || null;
  }

  /**
   * Mock file write operation
   */
  static mockWriteFile(path: string, content: string): void {
    this.mockFs.set(path, content);
  }

  /**
   * Mock file exists check
   */
  static mockFileExists(path: string): boolean {
    return this.mockFs.has(path);
  }

  /**
   * Clean up file system mocks
   */
  static cleanup(): void {
    this.mockFs.clear();
  }
}

/**
 * CLI prompt mock utilities
 */
export class PromptMock {
  private static responses: any[] = [];

  /**
   * Set up mock responses for inquirer prompts
   */
  static mockPrompt(responses: any[]): void {
    this.responses = responses;
    
    // Mock inquirer
    vi.doMock('inquirer', () => ({
      prompt: vi.fn().mockImplementation((questions) => {
        const response = this.responses.shift() || {};
        return Promise.resolve(response);
      })
    }));
  }

  /**
   * Clean up prompt mocks
   */
  static cleanup(): void {
    this.responses = [];
    vi.unmock('inquirer');
  }
}

/**
 * Environment variable mock utilities
 */
export class EnvMock {
  private static originalEnv: Record<string, string | undefined> = {};

  /**
   * Set mock environment variables
   */
  static mockEnv(env: Record<string, string>): void {
    // Store original values
    Object.keys(env).forEach(key => {
      this.originalEnv[key] = process.env[key];
    });

    // Set mock values
    Object.entries(env).forEach(([key, value]) => {
      process.env[key] = value;
    });
  }

  /**
   * Restore original environment variables
   */
  static restoreEnv(): void {
    Object.entries(this.originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    this.originalEnv = {};
  }
}