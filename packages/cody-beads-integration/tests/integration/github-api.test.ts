import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { GitHubClient } from '../../../src/utils/github.js';

describe('GitHub API Integration Tests', () => {
  let githubClient: GitHubClient;
  let config: any;

  beforeEach(() => {
    config = {
      version: '1.0.0',
      github: {
        owner: 'test-owner',
        repo: 'test-repo',
        token: 'test-token'
      },
      cody: {
        projectId: 'test-cody-project',
        apiUrl: 'https://api.cody.ai'
      },
      beads: {
        projectPath: './test-beads',
        configPath: '.beads/beads.json',
        autoSync: false,
        syncInterval: 60
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual',
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
        excludeLabels: ['wontfix', 'duplicate'],
        includeLabels: ['bug', 'feature', 'enhancement']
      },
      templates: {
        defaultTemplate: 'minimal',
        templatePath: './templates'
      }
    };
    
    githubClient = new GitHubClient(config.github.token);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('getIssues', () => {
    it('should fetch issues from GitHub API', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue 1',
          body: 'Test Body 1',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 2,
          number: 2,
          title: 'Test Issue 2',
          body: 'Test Body 2',
          state: 'closed' as const,
          labels: [{ name: 'enhancement' }],
          assignees: [],
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z'
        }
      ];

      // Mock fetch response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues
      } as Response);

      const issues = await githubClient.getIssues(config.github.owner, config.github.repo);

      expect(issues).toHaveLength(2);
      expect(issues[0].title).toBe('Test Issue 1');
      expect(issues[1].title).toBe('Test Issue 2');
      expect(issues[0].state).toBe('open');
      expect(issues[1].state).toBe('closed');
    });

    it('should handle API errors gracefully', async () => {
      // Mock error response
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'));

      await expect(githubClient.getIssues(config.github.owner, config.github.repo))
        .rejects.toThrow('API Error');
    });

    it('should filter by since date', async () => {
      const sinceDate = new Date('2025-01-01T00:00:00Z');
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Recent Issue',
          body: 'Recent Body',
          state: 'open' as const,
          labels: [{ name: 'bug' }],
          assignees: [],
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z'
        }
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssues
      } as Response);

      const issues = await githubClient.getIssues(config.github.owner, config.github.repo, { since: sinceDate });

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Recent Issue');
    });
  });

  describe('getPullRequests', () => {
    it('should fetch pull requests from GitHub API', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 1,
          title: 'Test PR 1',
          body: 'Test PR Body 1',
          state: 'open' as const,
          labels: [{ name: 'feature' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          pull_request: {
            url: 'https://github.com/test-owner/test-repo/pulls/1'
          }
        }
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      } as Response);

      const prs = await githubClient.getPullRequests(config.github.owner, config.github.repo);

      expect(prs).toHaveLength(1);
      expect(prs[0].title).toBe('Test PR 1');
      expect(prs[0].pull_request).toBeDefined();
    });
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const newIssue = {
        title: 'New Issue Title',
        body: 'New Issue Body',
        labels: ['bug'],
        assignees: ['testuser']
      };

      const createdIssue = {
        id: 3,
        number: 3,
        title: newIssue.title,
        body: newIssue.body,
        state: 'open' as const,
        labels: newIssue.labels.map(label => ({ name: label })),
        assignees: newIssue.assignees.map(assignee => ({ login: assignee })),
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdIssue
      } as Response);

      const issue = await githubClient.createIssue(config.github.owner, config.github.repo, newIssue);

      expect(issue.title).toBe(newIssue.title);
      expect(issue.number).toBe(3);
    });

    it('should handle validation errors', async () => {
      const invalidIssue = {
        title: '', // Empty title should cause validation error
        body: 'Test Body'
      };

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Validation failed'));

      await expect(githubClient.createIssue(config.github.owner, config.github.repo, invalidIssue))
        .rejects.toThrow('Validation failed');
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      const updateData = {
        title: 'Updated Issue Title',
        body: 'Updated Issue Body',
        state: 'closed' as const,
        labels: ['enhancement', 'updated']
      };

      const updatedIssue = {
        id: 1,
        number: 1,
        title: updateData.title,
        body: updateData.body,
        state: updateData.state,
        labels: updateData.labels.map(label => ({ name: label })),
        assignees: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedIssue
      } as Response);

      const issue = await githubClient.updateIssue(config.github.owner, config.github.repo, 1, updateData);

      expect(issue.title).toBe(updateData.title);
      expect(issue.state).toBe('closed');
    });

    it('should handle not found errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Not Found'));

      await expect(githubClient.updateIssue(config.github.owner, config.github.repo, 999, { title: 'Test' }))
        .rejects.toThrow('Not Found');
    });
  });

  describe('getComments', () => {
    it('should fetch comments for an issue', async () => {
      const mockComments = [
        {
          id: 1,
          body: 'Test comment 1',
          user: { login: 'testuser1' },
          created_at: '2025-01-01T01:00:00Z',
          updated_at: '2025-01-01T01:00:00Z'
        },
        {
          id: 2,
          body: 'Test comment 2',
          user: { login: 'testuser2' },
          created_at: '2025-01-01T02:00:00Z',
          updated_at: '2025-01-01T02:00:00Z'
        }
      ];

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockComments
      } as Response);

      const comments = await githubClient.getComments(config.github.owner, config.github.repo, 1);

      expect(comments).toHaveLength(2);
      expect(comments[0].body).toBe('Test comment 1');
      expect(comments[1].user.login).toBe('testuser2');
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const commentBody = 'This is a new comment';

      const createdComment = {
        id: 3,
        body: commentBody,
        user: { login: config.github.owner },
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdComment
      } as Response);

      const comment = await githubClient.createComment(config.github.owner, config.github.repo, 1, commentBody);

      expect(comment.body).toBe(commentBody);
      expect(comment.user.login).toBe(config.github.owner);
    });
  });

  describe('Authentication', () => {
    it('should include authentication headers', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      await githubClient.getIssues(config.github.owner, config.github.repo);

      // Verify fetch was called with correct headers
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[0]).toContain('authorization');
      expect(fetchCall[0]).toContain(`token ${config.github.token}`);
    });

    it('should handle authentication errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Bad credentials'));

      await expect(githubClient.getIssues(config.github.owner, config.github.repo))
        .rejects.toThrow('Bad credentials');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'API rate limit exceeded' }),
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() / 1000 + 60)
        }
      } as Response);

      await expect(githubClient.getIssues(config.github.owner, config.github.repo))
        .rejects.toThrow('rate limit');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(githubClient.getIssues(config.github.owner, config.github.repo))
        .rejects.toThrow('Network error');
    });

    it('should retry on transient failures', async () => {
      let callCount = 0;
      
      vi.mocked(global.fetch).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => []
        } as Response);
      });

      // Should succeed after retries
      const issues = await githubClient.getIssues(config.github.owner, config.github.repo);
      expect(issues).toEqual([]);
      expect(callCount).toBe(3);
    });
  });
});