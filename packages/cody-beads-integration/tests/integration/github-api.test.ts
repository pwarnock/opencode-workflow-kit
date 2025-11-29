import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GitHubClient } from '../../../src/utils/github.js';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createMockConfig } from '../../setup.js';

const server = setupServer();

describe('GitHub API Integration Tests', () => {
  let githubClient: GitHubClient;
  let config: any;

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    config = createMockConfig();
    githubClient = new GitHubClient(config.github.token);
    server.resetHandlers();
  });

  describe('getIssues', () => {
    it('should fetch issues from GitHub API', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Test Issue 1',
          body: 'Test Body 1',
          state: 'open',
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
          state: 'closed',
          labels: [{ name: 'enhancement' }],
          assignees: [],
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z'
        }
      ];

      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            const { owner, repo } = req.params;

            if (owner === config.github.owner && repo === config.github.repo) {
              return res(
                ctx.status(200),
                ctx.json(mockIssues)
              );
            }

            return res(
              ctx.status(404),
              ctx.json({ message: 'Not Found' })
            );
          }
        )
      );

      const issues = await githubClient.getIssues(
        config.github.owner,
        config.github.repo
      );

      expect(issues).toHaveLength(2);
      expect(issues[0].title).toBe('Test Issue 1');
      expect(issues[1].title).toBe('Test Issue 2');
      expect(issues[0].state).toBe('open');
      expect(issues[1].state).toBe('closed');
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            return res(
              ctx.status(500),
              ctx.json({ message: 'Internal Server Error' })
            );
          }
        )
      );

      await expect(
        githubClient.getIssues(config.github.owner, config.github.repo)
      ).rejects.toThrow();
    });

    it('should filter by since date', async () => {
      const sinceDate = new Date('2025-01-15T00:00:00Z');
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Recent Issue',
          body: 'Recent Body',
          state: 'open',
          labels: [],
          assignees: [],
          created_at: '2025-01-20T00:00:00Z',
          updated_at: '2025-01-20T00:00:00Z'
        }
      ];

      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            const since = req.url.searchParams.get('since');
            expect(since).toBe(sinceDate.toISOString());

            return res(
              ctx.status(200),
              ctx.json(mockIssues)
            );
          }
        )
      );

      const issues = await githubClient.getIssues(
        config.github.owner,
        config.github.repo,
        { since: sinceDate }
      );

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
          state: 'open',
          labels: [{ name: 'feature' }],
          assignees: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          pull_request: {
            url: 'https://api.github.com/repos/test-owner/test-repo/pulls/1'
          }
        }
      ];

      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/pulls',
          (req, res, ctx) => {
            return res(
              ctx.status(200),
              ctx.json(mockPRs)
            );
          }
        )
      );

      const prs = await githubClient.getPullRequests(
        config.github.owner,
        config.github.repo
      );

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
        state: 'open',
        labels: newIssue.labels.map(label => ({ name: label })),
        assignees: newIssue.assignees.map(assignee => ({ login: assignee })),
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      };

      server.use(
        rest.post(
          'https://api.github.com/repos/:owner/:repo/issues',
          async (req, res, ctx) => {
            const body = await req.json();

            expect(body.title).toBe(newIssue.title);
            expect(body.body).toBe(newIssue.body);
            expect(body.labels).toEqual(newIssue.labels);
            expect(body.assignees).toEqual(newIssue.assignees);

            return res(
              ctx.status(201),
              ctx.json(createdIssue)
            );
          }
        )
      );

      const issue = await githubClient.createIssue(
        config.github.owner,
        config.github.repo,
        newIssue
      );

      expect(issue.title).toBe(newIssue.title);
      expect(issue.body).toBe(newIssue.body);
      expect(issue.number).toBe(3);
    });

    it('should handle validation errors', async () => {
      const invalidIssue = {
        title: '', // Empty title should cause validation error
        body: 'Test body'
      };

      server.use(
        rest.post(
          'https://api.github.com/repos/:owner/:repo/issues',
          async (req, res, ctx) => {
            return res(
              ctx.status(422),
              ctx.json({
                message: 'Validation Failed',
                errors: [{ field: 'title', code: 'missing_field' }]
              })
            );
          }
        )
      );

      await expect(
        githubClient.createIssue(config.github.owner, config.github.repo, invalidIssue)
      ).rejects.toThrow();
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      const updateData = {
        title: 'Updated Issue Title',
        body: 'Updated Issue Body',
        labels: ['enhancement', 'updated'],
        assignees: ['newuser']
      };

      const updatedIssue = {
        id: 1,
        number: 1,
        title: updateData.title,
        body: updateData.body,
        state: 'open',
        labels: updateData.labels.map(label => ({ name: label })),
        assignees: updateData.assignees.map(assignee => ({ login: assignee })),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-04T00:00:00Z'
      };

      server.use(
        rest.patch(
          'https://api.github.com/repos/:owner/:repo/issues/:issue_number',
          async (req, res, ctx) => {
            const { issue_number } = req.params;
            const body = await req.json();

            expect(issue_number).toBe('1');
            expect(body.title).toBe(updateData.title);
            expect(body.body).toBe(updateData.body);

            return res(
              ctx.status(200),
              ctx.json(updatedIssue)
            );
          }
        )
      );

      const issue = await githubClient.updateIssue(
        config.github.owner,
        config.github.repo,
        1,
        updateData
      );

      expect(issue.title).toBe(updateData.title);
      expect(issue.body).toBe(updateData.body);
    });

    it('should handle not found errors', async () => {
      server.use(
        rest.patch(
          'https://api.github.com/repos/:owner/:repo/issues/:issue_number',
          (req, res, ctx) => {
            return res(
              ctx.status(404),
              ctx.json({ message: 'Not Found' })
            );
          }
        )
      );

      await expect(
        githubClient.updateIssue(
          config.github.owner,
          config.github.repo,
          999,
          { title: 'Updated Title' }
        )
      ).rejects.toThrow();
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

      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments',
          (req, res, ctx) => {
            const { issue_number } = req.params;
            expect(issue_number).toBe('1');

            return res(
              ctx.status(200),
              ctx.json(mockComments)
            );
          }
        )
      );

      const comments = await githubClient.getComments(
        config.github.owner,
        config.github.repo,
        1
      );

      expect(comments).toHaveLength(2);
      expect(comments[0].body).toBe('Test comment 1');
      expect(comments[1].body).toBe('Test comment 2');
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const commentBody = 'This is a new comment';

      const createdComment = {
        id: 3,
        body: commentBody,
        user: { login: config.github.owner },
        created_at: '2025-01-03T01:00:00Z',
        updated_at: '2025-01-03T01:00:00Z'
      };

      server.use(
        rest.post(
          'https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments',
          async (req, res, ctx) => {
            const { issue_number } = req.params;
            const body = await req.json();

            expect(issue_number).toBe('1');
            expect(body.body).toBe(commentBody);

            return res(
              ctx.status(201),
              ctx.json(createdComment)
            );
          }
        )
      );

      const comment = await githubClient.createComment(
        config.github.owner,
        config.github.repo,
        1,
        commentBody
      );

      expect(comment.body).toBe(commentBody);
      expect(comment.user.login).toBe(config.github.owner);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            return res(
              ctx.status(403),
              ctx.set('X-RateLimit-Remaining', '0'),
              ctx.set('X-RateLimit-Reset', String(Date.now() / 1000 + 60)),
              ctx.json({ message: 'API rate limit exceeded' })
            );
          }
        )
      );

      await expect(
        githubClient.getIssues(config.github.owner, config.github.repo)
      ).rejects.toThrow('rate limit');
    });
  });

  describe('Authentication', () => {
    it('should handle unauthorized responses', async () => {
      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            return res(
              ctx.status(401),
              ctx.json({ message: 'Bad credentials' })
            );
          }
        )
      );

      await expect(
        githubClient.getIssues(config.github.owner, config.github.repo)
      ).rejects.toThrow('Bad credentials');
    });

    it('should include authentication headers', async () => {
      let authHeader = '';

      server.use(
        rest.get(
          'https://api.github.com/repos/:owner/:repo/issues',
          (req, res, ctx) => {
            authHeader = req.headers.get('authorization') || '';
            return res(
              ctx.status(200),
              ctx.json([])
            );
          }
        )
      );

      await githubClient.getIssues(config.github.owner, config.github.repo);

      expect(authHeader).toContain('token');
      expect(authHeader).toContain(config.github.token);
    });
  });
});