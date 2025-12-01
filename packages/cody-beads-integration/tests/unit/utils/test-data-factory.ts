import { vi, expect } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync } from 'fs';

/**
 * Test data factory for creating consistent test objects
 */
export class TestDataFactory {
  private static tempDirs: string[] = [];

  /**
   * Create a temporary directory for testing
   */
  static createTempDir(prefix = 'cody-beads-test-'): string {
    const tempDir = mkdtempSync(join(tmpdir(), prefix));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Clean up all temporary directories
   */
  static cleanupTempDirs(): void {
    this.tempDirs.forEach(dir => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup temp dir ${dir}:`, error);
      }
    });
    this.tempDirs = [];
  }

  /**
   * Create a mock Cody configuration
   */
  static createMockConfig(overrides = {}) {
    return {
      version: '1.0.0',
      github: {
        token: 'mock-github-token',
        owner: 'test-owner',
        repo: 'test-repo',
        apiUrl: 'https://api.github.com'
      },
      cody: {
        projectId: 'test-project-id',
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: './test-beads',
        configPath: '.beads/beads.json',
        autoSync: false,
        syncInterval: 60
      },
      sync: {
        defaultDirection: 'bidirectional' as const,
        conflictResolution: 'manual' as const,
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
        includeLabels: ['bug', 'feature'],
        excludeLabels: ['wontfix']
      },
      templates: {
        defaultTemplate: 'minimal',
        templatePath: './templates'
      },
      ...overrides
    };
  }

  /**
   * Create mock GitHub issue data
   */
  static createMockGitHubIssue(overrides = {}) {
    return {
      id: 12345,
      number: 1,
      title: 'Test Issue',
      body: 'This is a test issue',
      state: 'open',
      labels: [{ name: 'bug' }, { name: 'test' }],
      assignees: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      user: {
        login: 'testuser',
        id: 67890
      },
      ...overrides
    };
  }

  /**
   * Create mock Beads task data
   */
  static createMockBeadsTask(overrides = {}) {
    return {
      id: 'bd-123',
      title: 'Test Task',
      description: 'This is a test task',
      status: 'open',
      priority: 2,
      issue_type: 'task',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      ...overrides
    };
  }

  /**
   * Create mock sync metadata
   */
  static createMockSyncMetadata(overrides = {}) {
    return {
      githubId: 12345,
      beadsId: 'bd-123',
      lastSyncedAt: '2025-01-01T00:00:00Z',
      syncDirection: 'cody-to-beads',
      conflictResolution: 'none',
      ...overrides
    };
  }

  /**
   * Create mock CLI command result
   */
  static createMockCommandResult(overrides = {}) {
    return {
      exitCode: 0,
      stdout: 'Command completed successfully',
      stderr: '',
      success: true,
      data: null,
      ...overrides
    };
  }
}

/**
 * Test utilities for common test operations
 */
export class TestUtils {
  /**
   * Wait for a specified amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a mock function that returns a value
   */
  static mockReturnValue<T>(value: T): ReturnType<typeof vi.fn> {
    return vi.fn().mockReturnValue(value);
  }

  /**
   * Create a mock function that rejects with an error
   */
  static mockRejectedValue(error: Error): ReturnType<typeof vi.fn> {
    return vi.fn().mockRejectedValue(error);
  }

  /**
   * Create a mock function that resolves with a value
   */
  static mockResolvedValue<T>(value: T): ReturnType<typeof vi.fn> {
    return vi.fn().mockResolvedValue(value);
  }

  /**
   * Assert that a function was called with specific arguments
   */
  static assertCalledWith(mock: ReturnType<typeof vi.fn>, ...args: any[]): void {
    expect(mock).toHaveBeenCalledWith(...args);
  }

  /**
   * Assert that a function was called exactly once
   */
  static assertCalledOnce(mock: ReturnType<typeof vi.fn>): void {
    expect(mock).toHaveBeenCalledTimes(1);
  }

  /**
   * Assert that a function was not called
   */
  static assertNotCalled(mock: ReturnType<typeof vi.fn>): void {
    expect(mock).not.toHaveBeenCalled();
  }
}