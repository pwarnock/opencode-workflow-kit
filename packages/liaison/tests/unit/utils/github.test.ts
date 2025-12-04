import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubClientImpl, createGitHubClient } from '../../../src/utils/github.js';
import { Octokit } from '@octokit/rest';

// Mock Octokit
vi.mock('@octokit/rest', () => {
  const mockResponse = (data: any) => ({
    data,
    status: 200,
    headers: {},
    url: 'https://api.github.com'
  });

  return {
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        issues: {
          listForRepo: vi.fn().mockResolvedValue(mockResponse([])),
          listComments: vi.fn().mockResolvedValue(mockResponse([])),
          create: vi.fn().mockResolvedValue(mockResponse({
            id: 1,
            number: 1,
            title: 'New Issue',
            state: 'open',
            body: 'Issue body',
            labels: [],
            assignees: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            closed_at: null,
            html_url: 'https://github.com/test/test/issues/1',
            user: { login: 'testuser' },
            comments: 0
          })),
          update: vi.fn().mockResolvedValue(mockResponse({
            id: 1,
            number: 1,
            title: 'Updated Issue',
            state: 'open',
            body: 'Updated body',
            labels: [],
            assignees: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            closed_at: null,
            html_url: 'https://github.com/test/test/issues/1',
            user: { login: 'testuser' },
            comments: 0
          })),
          createComment: vi.fn().mockResolvedValue(mockResponse({
            id: 1,
            body: 'New comment',
            user: { login: 'testuser' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/test/issues/1#comment-1'
          })),
          updateComment: vi.fn().mockResolvedValue(mockResponse({
            id: 1,
            body: 'Updated comment',
            user: { login: 'testuser' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/test/issues/1#comment-1'
          })),
          deleteComment: vi.fn().mockResolvedValue(mockResponse({})),
          addLabels: vi.fn().mockResolvedValue(mockResponse({})),
          removeLabel: vi.fn().mockResolvedValue(mockResponse({}))
        },
        pulls: {
          list: vi.fn().mockResolvedValue(mockResponse([]))
        },
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue(mockResponse([]))
        }
      }
    }))
  };
});

describe('GitHubClientImpl', () => {
  let client: GitHubClientImpl;
  let mockOctokit: any;

  beforeEach(() => {
    // Create a proper mock instance
    mockOctokit = {
      rest: {
        issues: {
          listForRepo: vi.fn().mockResolvedValue({ data: [] }),
          listComments: vi.fn().mockResolvedValue({ data: [] }),
          create: vi.fn().mockResolvedValue({ data: {
            id: 1,
            number: 1,
            title: 'New Issue',
            state: 'open',
            body: 'Issue body',
            labels: [],
            assignees: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            closed_at: null,
            html_url: 'https://github.com/test/test/issues/1',
            user: { login: 'testuser' },
            comments: 0
          }}),
          update: vi.fn().mockResolvedValue({ data: {
            id: 1,
            number: 1,
            title: 'Updated Issue',
            state: 'open',
            body: 'Updated body',
            labels: [],
            assignees: [],
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            closed_at: null,
            html_url: 'https://github.com/test/test/issues/1',
            user: { login: 'testuser' },
            comments: 0
          }}),
          createComment: vi.fn().mockResolvedValue({ data: {
            id: 1,
            body: 'New comment',
            user: { login: 'testuser' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/test/issues/1#comment-1'
          }}),
          updateComment: vi.fn().mockResolvedValue({ data: {
            id: 1,
            body: 'Updated comment',
            user: { login: 'testuser' },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/test/issues/1#comment-1'
          }}),
          deleteComment: vi.fn().mockResolvedValue({}),
          addLabels: vi.fn().mockResolvedValue({}),
          removeLabel: vi.fn().mockResolvedValue({})
        },
        pulls: {
          list: vi.fn().mockResolvedValue({ data: [] })
        },
        repos: {
          listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] })
        }
      }
    };

    // Mock the GitHubClientImpl to use our mock octokit
    client = new GitHubClientImpl('test-token');
    // @ts-ignore - inject mock for testing
    client['octokit'] = mockOctokit;
  });

  describe('Constructor', () => {
    it('should create client with token', () => {
      expect(client).toBeInstanceOf(GitHubClientImpl);
    });

    it('should support custom API URL', () => {
      const customClient = new GitHubClientImpl('token', { apiUrl: 'https://custom.github.com' });
      expect(customClient).toBeInstanceOf(GitHubClientImpl);
    });
  });

  describe('Factory Function', () => {
    it('should create client via factory', () => {
      const factoryClient = createGitHubClient('factory-token');
      expect(factoryClient).toBeInstanceOf(GitHubClientImpl);
    });
  });

  describe('getIssues', () => {
    it('should fetch issues from repository', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue',
          state: 'open',
          body: 'Test body',
          labels: [],
          assignees: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/test/test/issues/1',
          user: { login: 'testuser' },
          comments: 0
        }
      ];

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues });

      const issues = await client.getIssues('test-owner', 'test-repo');
      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Test Issue');
    });

    it('should handle errors gracefully', async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error('API Error'));

      await expect(client.getIssues('test-owner', 'test-repo'))
        .rejects.toThrow('API Error');
    });
  });

  describe('getPullRequests', () => {
    it('should fetch pull requests from repository', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 1,
          title: 'Test PR',
          state: 'open',
          body: 'Test body',
          labels: [],
          assignees: [],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/test/test/pull/1',
          user: { login: 'testuser' },
          comments: 0
        }
      ];

      mockOctokit.rest.pulls.list.mockResolvedValue({ data: mockPRs });

      const prs = await client.getPullRequests('test-owner', 'test-repo');
      expect(prs).toHaveLength(1);
      expect(prs[0].title).toBe('Test PR');
    });
  });

  describe('getComments', () => {
    it('should fetch comments for issue', async () => {
      const mockComments = [
        {
          id: 1,
          body: 'Test comment',
          user: { login: 'testuser' },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          html_url: 'https://github.com/test/test/issues/1#comment-1'
        }
      ];

      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      const comments = await client.getComments('test-owner', 'test-repo', 1);
      expect(comments).toHaveLength(1);
      expect(comments[0].body).toBe('Test comment');
    });
  });

  describe('createIssue', () => {
    it('should create new issue', async () => {
      const mockIssue = {
        id: 1,
        number: 1,
        title: 'New Issue',
        state: 'open',
        body: 'Issue body',
        labels: [],
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        html_url: 'https://github.com/test/test/issues/1',
        user: { login: 'testuser' },
        comments: 0
      };

      mockOctokit.rest.issues.create.mockResolvedValue({ data: mockIssue });

      const createdIssue = await client.createIssue('test-owner', 'test-repo', {
        title: 'New Issue',
        body: 'Issue body'
      });

      expect(createdIssue.title).toBe('New Issue');
      expect(mockOctokit.rest.issues.create).toHaveBeenCalledWith(expect.objectContaining({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'New Issue',
        body: 'Issue body'
      }));
    });
  });

  describe('updateIssue', () => {
    it('should update existing issue', async () => {
      const mockUpdatedIssue = {
        id: 1,
        number: 1,
        title: 'Updated Issue',
        state: 'open',
        body: 'Updated body',
        labels: [],
        assignees: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        closed_at: null,
        html_url: 'https://github.com/test/test/issues/1',
        user: { login: 'testuser' },
        comments: 0
      };

      mockOctokit.rest.issues.update.mockResolvedValue({ data: mockUpdatedIssue });

      const updatedIssue = await client.updateIssue('test-owner', 'test-repo', 1, {
        title: 'Updated Issue'
      });

      expect(updatedIssue.title).toBe('Updated Issue');
    });
  });

  describe('createComment', () => {
    it('should create comment on issue', async () => {
      const mockComment = {
        id: 1,
        body: 'New comment',
        user: { login: 'testuser' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        html_url: 'https://github.com/test/test/issues/1#comment-1'
      };

      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: mockComment });

      const createdComment = await client.createComment('test-owner', 'test-repo', 1, 'New comment');
      expect(createdComment.body).toBe('New comment');
    });
  });

  describe('updateComment', () => {
    it('should update existing comment', async () => {
      const mockUpdatedComment = {
        id: 1,
        body: 'Updated comment',
        user: { login: 'testuser' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        html_url: 'https://github.com/test/test/issues/1#comment-1'
      };

      mockOctokit.rest.issues.updateComment.mockResolvedValue({ data: mockUpdatedComment });

      const updatedComment = await client.updateComment('test-owner', 'test-repo', 1, 'Updated comment');
      expect(updatedComment.body).toBe('Updated comment');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      mockOctokit.rest.issues.deleteComment.mockResolvedValue({});

      await expect(client.deleteComment('test-owner', 'test-repo', 1))
        .resolves.not.toThrow();
    });
  });

  describe('addLabel', () => {
    it('should add label to issue', async () => {
      mockOctokit.rest.issues.addLabels.mockResolvedValue({});

      await expect(client.addLabel('test-owner', 'test-repo', 1, 'bug'))
        .resolves.not.toThrow();
    });
  });

  describe('removeLabel', () => {
    it('should remove label from issue', async () => {
      mockOctokit.rest.issues.removeLabel.mockResolvedValue({});

      await expect(client.removeLabel('test-owner', 'test-repo', 1, 'bug'))
        .resolves.not.toThrow();
    });
  });

  describe('getRepositories', () => {
    it('should fetch user repositories', async () => {
      const mockRepos = [
        {
          id: 1,
          name: 'test-repo',
          full_name: 'test-owner/test-repo',
          private: false,
          html_url: 'https://github.com/test-owner/test-repo'
        }
      ];

      mockOctokit.rest.repos.listForAuthenticatedUser.mockResolvedValue({ data: mockRepos });

      const repos = await client.getRepositories();
      expect(repos).toHaveLength(1);
      expect(repos[0].name).toBe('test-repo');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors consistently', async () => {
      mockOctokit.rest.issues.listForRepo.mockRejectedValue(new Error('Network Error'));

      await expect(client.getIssues('test-owner', 'test-repo'))
        .rejects.toThrow('Network Error');
    });
  });
});