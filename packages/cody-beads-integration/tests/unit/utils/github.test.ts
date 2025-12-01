import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GitHubClientImpl, GitHubClient } from '../../../src/utils/github.js';

describe('GitHub Utils', () => {
  let githubClient: GitHubClientImpl;
  let mockConsole: { log: any; error: any };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock console methods
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };

    // Mock Octokit at the module level
    vi.doMock('@octokit/rest', () => ({
      Octokit: vi.fn().mockImplementation(() => ({
        rest: {
          issues: {
            listForRepo: vi.fn().mockResolvedValue({ data: [] }),
            listComments: vi.fn().mockResolvedValue({ data: [] }),
            create: vi.fn().mockResolvedValue({ data: {} }),
            update: vi.fn().mockResolvedValue({ data: {} }),
            createComment: vi.fn().mockResolvedValue({ data: {} }),
            updateComment: vi.fn().mockResolvedValue({ data: {} }),
            deleteComment: vi.fn().mockResolvedValue({}),
            addLabels: vi.fn().mockResolvedValue({ data: [] }),
            removeLabel: vi.fn().mockResolvedValue({})
          },
          pulls: {
            list: vi.fn().mockResolvedValue({ data: [] })
          },
          repos: {
            listForAuthenticatedUser: vi.fn().mockResolvedValue({ data: [] })
          }
        }
      }))
    }));

    // Mock chalk
    vi.doMock('chalk', () => ({
      default: {
        gray: vi.fn((text: string) => text),
        red: vi.fn((text: string) => text)
      }
    }));

    // Create GitHub client with test token
    githubClient = new GitHubClientImpl('test-token');
  });

  afterEach(() => {
    // Restore console mocks
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
  });

  describe('GitHubClientImpl', () => {
    describe('constructor', () => {
      it('should initialize with default options', () => {
        const client = new GitHubClientImpl('test-token');
        expect(client).toBeInstanceOf(GitHubClientImpl);
      });

      it('should initialize with custom API URL', () => {
        const client = new GitHubClientImpl('test-token', { apiUrl: 'https://api.github.example.com' });
        expect(client).toBeInstanceOf(GitHubClientImpl);
      });
    });

    describe('Data Transformation Methods', () => {
      it('should map GitHub issue correctly', () => {
        const mockIssue = {
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: null,
          state: 'open',
          labels: ['bug', 'enhancement'],
          assignees: ['user1', 'user2'],
          milestone: null,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/owner/repo/issues/1',
          user: { login: 'testuser' },
          comments: 5,
          pull_request: null
        };

        // Access private method through prototype for testing
        const mapGitHubIssue = (githubClient as any).mapGitHubIssue.bind(githubClient);
        const result = mapGitHubIssue(mockIssue);

        expect(result).toMatchObject({
          id: 1,
          number: 1,
          title: 'Test Issue',
          body: '', // null should be converted to empty string
          state: 'open',
          labels: [{ name: 'bug' }, { name: 'enhancement' }],
          assignees: [{ login: 'user1' }, { login: 'user2' }],
          milestone: undefined, // null should be converted to undefined
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          closed_at: null,
          html_url: 'https://github.com/owner/repo/issues/1',
          user: { login: 'testuser' },
          comments: 5,
          pull_request: null
        });
      });

      it('should map GitHub comment correctly', () => {
        const mockComment = {
          id: 101,
          body: 'Test comment',
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/1#issuecomment-101'
        };

        // Access private method through prototype for testing
        const mapGitHubComment = (githubClient as any).mapGitHubComment.bind(githubClient);
        const result = mapGitHubComment(mockComment);

        expect(result).toMatchObject({
          id: 101,
          body: 'Test comment',
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/1#issuecomment-101'
        });
      });

      it('should handle missing optional fields in comment', () => {
        const mockComment = {
          id: 102,
          body: null,
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/1#issuecomment-102'
        };

        const mapGitHubComment = (githubClient as any).mapGitHubComment.bind(githubClient);
        const result = mapGitHubComment(mockComment);

        expect(result).toMatchObject({
          id: 102,
          body: '', // null should be converted to empty string
          user: { login: 'testuser' }
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle missing issue data gracefully', () => {
        const incompleteIssue = {
          id: 1,
          number: 1,
          title: 'Test Issue',
          state: 'open',
          labels: [],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/owner/repo/issues/1',
          user: { login: 'testuser' },
          comments: 0
          // Missing some optional fields
        };

        const mapGitHubIssue = (githubClient as any).mapGitHubIssue.bind(githubClient);
        
        // Should not throw error with incomplete data
        expect(() => {
          const result = mapGitHubIssue(incompleteIssue);
          expect(result.id).toBe(1);
          expect(result.number).toBe(1);
          expect(result.title).toBe('Test Issue');
        }).not.toThrow();
      });

      it('should handle missing comment data gracefully', () => {
        const incompleteComment = {
          id: 101,
          body: 'Test comment'
          // Missing other required fields
        };

        const mapGitHubComment = (githubClient as any).mapGitHubComment.bind(githubClient);
        
        // Should not throw error with incomplete data
        expect(() => {
          const result = mapGitHubComment(incompleteComment);
          expect(result.id).toBe(101);
          expect(result.body).toBe('Test comment');
        }).not.toThrow();
      });
    });
  });

  describe('GitHubClient Factory', () => {
    it('should create GitHubClient instance', () => {
      const client = GitHubClient('test-token');
      expect(client).toBeInstanceOf(GitHubClientImpl);
    });

    it('should create GitHubClient instance with options', () => {
      const client = GitHubClient('test-token', { apiUrl: 'https://api.github.example.com' });
      expect(client).toBeInstanceOf(GitHubClientImpl);
    });
  });

  describe('Input Validation', () => {
    it('should handle empty token gracefully', () => {
      expect(() => {
        new GitHubClientImpl('');
      }).not.toThrow();
    });

    it('should handle null options gracefully', () => {
      expect(() => {
        new GitHubClientImpl('test-token', null as any);
      }).not.toThrow();
    });

    it('should handle undefined options gracefully', () => {
      expect(() => {
        new GitHubClientImpl('test-token', undefined);
      }).not.toThrow();
    });
  });
});