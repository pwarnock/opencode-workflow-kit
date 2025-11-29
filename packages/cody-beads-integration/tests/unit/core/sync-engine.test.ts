import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../../../src/core/sync-engine.js';
import { createMockGitHubClient, createMockConfig } from '../../setup.js';
import type { GitHubClient, BeadsClient, SyncOptions } from '../../../src/types/index.js';

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockGitHubClient: GitHubClient;
  let mockBeadsClient: BeadsClient;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockGitHubClient = createMockGitHubClient();
    mockBeadsClient = {
      getTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      testConnection: vi.fn()
    };

    syncEngine = new SyncEngine(mockConfig, mockGitHubClient, mockBeadsClient);
  });

  describe('executeSync', () => {
    it('should sync bidirectional by default', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: 'Test Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      const mockBeadsTasks = [
        {
          id: 'beads-1',
          title: 'Test Task',
          description: 'Test Description',
          status: 'open',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockGitHubIssues);
      mockBeadsClient.getTasks.mockResolvedValue(mockBeadsTasks);

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.issuesSynced).toBeGreaterThanOrEqual(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle dry run mode', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: 'Test Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: true,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.issuesSynced).toBe(0);
      expect(result.dryRun).toBe(true);
      expect(mockBeadsClient.createTask).not.toHaveBeenCalled();
    });

    it('should handle cody-to-beads direction', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'GitHub Issue',
          body: 'Issue Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(mockBeadsClient.createTask).toHaveBeenCalled();
      expect(result.issuesSynced).toBe(1);
    });

    it('should handle beads-to-cody direction', async () => {
      const mockTasks = [
        {
          id: 'beads-1',
          title: 'Beads Task',
          description: 'Task Description',
          status: 'open',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue([]);
      mockBeadsClient.getTasks.mockResolvedValue(mockTasks);

      const options: SyncOptions = {
        direction: 'beads-to-cody',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(mockGitHubClient.createIssue).toHaveBeenCalled();
      expect(result.issuesSynced).toBe(1);
    });

    it('should filter by labels', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Bug Issue',
          body: 'Bug Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          number: 2,
          title: 'Wontfix Issue',
          body: 'Wontfix Body',
          state: 'open',
          labels: ['wontfix'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      // Should only sync issues with included labels
      expect(mockBeadsClient.createTask).toHaveBeenCalledTimes(1);
      expect(result.issuesSynced).toBe(1);
    });

    it('should handle sync date filtering', async () => {
      const sinceDate = new Date('2025-01-15T00:00:00Z');

      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Old Issue',
          body: 'Old Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T00:00:00Z'
        },
        {
          id: 2,
          number: 2,
          title: 'New Issue',
          body: 'New Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-20T00:00:00Z',
          updated_at: '2025-01-20T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: false,
        since: sinceDate
      };

      const result = await syncEngine.executeSync(options);

      // Should only sync issues updated since the specified date
      expect(mockBeadsClient.createTask).toHaveBeenCalledTimes(1);
      expect(result.issuesSynced).toBe(1);
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts when same item exists in both systems', async () => {
      const syncId = 'sync-123';
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T00:00:00Z',
          sync_id: syncId
        }
      ];

      const mockTasks = [
        {
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Body',
          status: 'open',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-08T00:00:00Z',
          sync_id: syncId
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue(mockTasks);

      const conflicts = await syncEngine.detectConflicts();

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].syncId).toBe(syncId);
      expect(conflicts[0].githubIssue?.title).toBe('GitHub Title');
      expect(conflicts[0].beadsTask?.title).toBe('Beads Title');
    });

    it('should return no conflicts when items are synchronized', async () => {
      const syncId = 'sync-123';
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Same Title',
          body: 'Same Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T00:00:00Z',
          sync_id: syncId
        }
      ];

      const mockTasks = [
        {
          id: 'beads-1',
          title: 'Same Title',
          description: 'Same Body',
          status: 'open',
          labels: ['bug'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-10T00:00:00Z',
          sync_id: syncId
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue(mockTasks);

      const conflicts = await syncEngine.detectConflicts();

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict with manual intervention', async () => {
      const conflict = {
        syncId: 'sync-123',
        githubIssue: {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body'
        },
        beadsTask: {
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Body'
        },
        type: 'title_mismatch' as const
      };

      // Mock user interaction
      vi.mock('inquirer', () => ({
        default: vi.fn().mockResolvedValue({
          resolution: 'github',
          applyToBoth: true
        })
      }));

      await syncEngine.resolveConflict(conflict, 'manual');

      expect(mockBeadsClient.updateTask).toHaveBeenCalledWith(
        'beads-1',
        expect.objectContaining({
          title: 'GitHub Title',
          description: 'GitHub Body'
        })
      );
    });

    it('should resolve conflict with cody-wins strategy', async () => {
      const conflict = {
        syncId: 'sync-123',
        githubIssue: {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body'
        },
        beadsTask: {
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Body'
        },
        type: 'title_mismatch' as const
      };

      await syncEngine.resolveConflict(conflict, 'cody-wins');

      expect(mockBeadsClient.updateTask).toHaveBeenCalledWith(
        'beads-1',
        expect.objectContaining({
          title: 'GitHub Title',
          description: 'GitHub Body'
        })
      );
    });

    it('should resolve conflict with beads-wins strategy', async () => {
      const conflict = {
        syncId: 'sync-123',
        githubIssue: {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body'
        },
        beadsTask: {
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Body'
        },
        type: 'title_mismatch' as const
      };

      await syncEngine.resolveConflict(conflict, 'beads-wins');

      expect(mockGitHubClient.updateIssue).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        1,
        expect.objectContaining({
          title: 'Beads Title',
          body: 'Beads Body'
        })
      );
    });

    it('should resolve conflict with newer-wins strategy', async () => {
      const conflict = {
        syncId: 'sync-123',
        githubIssue: {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body',
          updated_at: '2025-01-15T00:00:00Z'
        },
        beadsTask: {
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Body',
          updated_at: '2025-01-10T00:00:00Z'
        },
        type: 'title_mismatch' as const
      };

      await syncEngine.resolveConflict(conflict, 'newer-wins');

      expect(mockBeadsClient.updateTask).toHaveBeenCalledWith(
        'beads-1',
        expect.objectContaining({
          title: 'GitHub Title',
          description: 'GitHub Body'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle GitHub API errors gracefully', async () => {
      mockGitHubClient.getIssues.mockRejectedValue(new Error('GitHub API Error'));

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('GitHub API Error');
      expect(result.issuesSynced).toBe(0);
    });

    it('should handle Beads API errors gracefully', async () => {
      mockGitHubClient.getIssues.mockResolvedValue([
        {
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: 'Test Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ]);

      mockBeadsClient.getTasks.mockRejectedValue(new Error('Beads API Error'));

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Beads API Error');
    });

    it('should continue processing after individual item errors', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Valid Issue',
          body: 'Valid Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          number: 2,
          title: 'Invalid Issue',
          body: 'Invalid Body',
          state: 'open',
          labels: ['bug'],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockGitHubClient.getIssues.mockResolvedValue(mockIssues);
      mockBeadsClient.getTasks.mockResolvedValue([]);
      mockBeadsClient.createTask
        .mockResolvedValueOnce({ id: 'beads-1' })
        .mockRejectedValueOnce(new Error('Create task failed'));

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.errors).toHaveLength(1);
      expect(result.issuesSynced).toBe(1); // Only one succeeded
    });
  });
});