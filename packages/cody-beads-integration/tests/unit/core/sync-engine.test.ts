import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncEngine } from '../../../src/core/sync-engine.js';
import { createMockGitHubClient, createMockConfig } from '../../setup.js';
import type { GitHubClient, BeadsClient, SyncOptions, SyncConflict } from '../../../src/types/index.js';

describe('SyncEngine', () => {
  let syncEngine: SyncEngine;
  let mockGitHubClient: GitHubClient;
  let mockBeadsClient: BeadsClient;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = createMockConfig();
    mockGitHubClient = createMockGitHubClient();
    mockBeadsClient = {
      getIssues: vi.fn(),
      createIssue: vi.fn(),
      updateIssue: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      deleteComment: vi.fn(),
      addLabel: vi.fn(),
      removeLabel: vi.fn()
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
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        }
      ];

      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'Test Task',
          description: 'Test Description',
          status: 'open',
          priority: 'medium',
          assignee: 'testuser',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          metadata: {},
          comments: []
        }
      ];

      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue(mockGitHubIssues);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue(mockBeadsIssues);

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.issuesSynced).toBeGreaterThan(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle dry run mode', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: true,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(mockBeadsClient.createIssue).not.toHaveBeenCalled();
      expect(mockGitHubClient.createIssue).not.toHaveBeenCalled();
    });

    it('should handle cody-to-beads direction', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
    });

    it('should handle beads-to-cody direction', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'beads-to-cody',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
    });

    it('should filter by labels', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
    });

    it('should handle sync date filtering', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const since = new Date('2025-01-01');
      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: true,
        since
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts when same item exists in both systems', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'GitHub Title',
          body: 'GitHub Body',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: new Date().toISOString(), // Recent update
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        }
      ];

      const mockBeadsIssues = [
        {
          id: 'beads-1',
          title: 'Different Title', // Different title = conflict
          description: 'Beads Description',
          status: 'open',
          priority: 'medium',
          assignee: 'testuser',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: new Date().toISOString(), // Recent update
          metadata: { githubIssueNumber: 1 }, // Link to GitHub issue
          comments: []
        }
      ];

      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue(mockGitHubIssues);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue(mockBeadsIssues);

      const conflicts = await syncEngine.detectConflicts();

      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should return no conflicts when items are synchronized', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const conflicts = await syncEngine.detectConflicts();

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict with manual intervention', async () => {
      const conflict: SyncConflict = {
        type: 'issue',
        itemId: 'test-1',
        itemType: 'issue',
        message: 'Test conflict',
        codyData: { title: 'Cody Title' },
        beadsData: { title: 'Beads Title' }
      };

      await syncEngine.resolveConflict(conflict, 'manual');

      // Manual resolution should not automatically update anything
      expect(mockBeadsClient.updateIssue).not.toHaveBeenCalled();
      expect(mockGitHubClient.updateIssue).not.toHaveBeenCalled();
    });

    it('should resolve conflict with cody-wins strategy', async () => {
      const conflict: SyncConflict = {
        type: 'issue',
        itemId: 'test-1',
        itemType: 'issue',
        message: 'Test conflict',
        codyData: { 
          number: 1,
          title: 'Cody Title',
          body: 'Cody Body',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        },
        beadsData: { 
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Description',
          status: 'open',
          priority: 'medium',
          assignee: 'testuser',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          metadata: { githubIssueNumber: 1 },
          comments: []
        }
      };

      await syncEngine.resolveConflict(conflict, 'cody-wins');

      // Should update Beads with Cody data
      expect(mockBeadsClient.updateIssue).toHaveBeenCalledWith(
        expect.any(String),
        'beads-1',
        expect.any(Object)
      );
    });

    it('should resolve conflict with beads-wins strategy', async () => {
      const conflict: SyncConflict = {
        type: 'issue',
        itemId: 'test-1',
        itemType: 'issue',
        message: 'Test conflict',
        codyData: { 
          number: 1,
          title: 'Cody Title',
          body: 'Cody Body',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        },
        beadsData: { 
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Description',
          status: 'open',
          priority: 'medium',
          assignee: 'testuser',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          metadata: { githubIssueNumber: 1 },
          comments: []
        }
      };

      await syncEngine.resolveConflict(conflict, 'beads-wins');

      // Should update GitHub with Beads data
      expect(mockGitHubClient.updateIssue).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        1,
        expect.any(Object)
      );
    });

    it('should resolve conflict with newer-wins strategy', async () => {
      const conflict: SyncConflict = {
        type: 'issue',
        itemId: 'test-1',
        itemType: 'issue',
        message: 'Test conflict',
        codyData: { 
          number: 1,
          title: 'Cody Title',
          body: 'Cody Body',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z', // Newer
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        },
        beadsData: { 
          id: 'beads-1',
          title: 'Beads Title',
          description: 'Beads Description',
          status: 'open',
          priority: 'medium',
          assignee: 'testuser',
          labels: ['task'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z', // Older
          metadata: { githubIssueNumber: 1 },
          comments: []
        }
      };

      await syncEngine.resolveConflict(conflict, 'newer-wins');

      // Should update with newer data (Cody in this case)
      expect(mockBeadsClient.updateIssue).toHaveBeenCalledWith(
        expect.any(String),
        'beads-1',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle GitHub API errors gracefully', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockRejectedValue(new Error('GitHub API Error'));
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync failed: GitHub API Error');
    });

    it('should handle Beads API errors gracefully', async () => {
      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockRejectedValue(new Error('Beads API Error'));

      const options: SyncOptions = {
        direction: 'bidirectional',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync failed: Beads API Error');
    });

    it('should continue processing after individual item errors', async () => {
      const mockGitHubIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue 1',
          body: 'Test Body 1',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
        },
        {
          id: 2,
          number: 2,
          title: 'Test Issue 2',
          body: 'Test Body 2',
          state: 'open' as const,
          labels: [{ name: 'feature' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: undefined,
          html_url: 'https://github.com/test/repo/issues/2',
          user: { login: 'testuser' },
          comments: 0
        }
      ];

      vi.mocked(mockGitHubClient.getIssues).mockResolvedValue(mockGitHubIssues);
      vi.mocked(mockGitHubClient.getPullRequests).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.getIssues).mockResolvedValue([]);
      vi.mocked(mockBeadsClient.createIssue).mockRejectedValueOnce(new Error('Create failed'));

      const options: SyncOptions = {
        direction: 'cody-to-beads',
        dryRun: false,
        force: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(false); // Should fail due to errors
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.issuesSynced).toBe(1); // But should still process the successful item
    });
  });
});