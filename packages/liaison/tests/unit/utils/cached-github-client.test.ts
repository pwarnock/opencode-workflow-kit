/**
 * Cached GitHub Client Tests
 * Unit tests for the CachedGitHubClient implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CachedGitHubClient } from '../../../src/utils/github/CachedGitHubClient.js';
import { CacheManager } from '../../../src/core/cache/CacheManager.js';
import { Octokit } from '@octokit/rest';

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      repos: {
        get: vi.fn(),
        listContributors: vi.fn(),
        listBranches: vi.fn(),
        listReleases: vi.fn(),
        getContent: vi.fn()
      },
      issues: {
        listForRepo: vi.fn(),
        get: vi.fn(),
        listComments: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        createComment: vi.fn()
      },
      pulls: {
        list: vi.fn()
      },
      git: {
        getTree: vi.fn()
      }
    }
  }))
}));

describe('CachedGitHubClient', () => {
  let client: CachedGitHubClient;
  let cacheManager: CacheManager;
  let mockOctokit: any;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = `${process.cwd()}/.test-github-cache`;
    
    cacheManager = new CacheManager({
      backend: 'memory',
      maxMemoryEntries: 100,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });

    client = new CachedGitHubClient(
      'test-token',
      'test-owner',
      'test-repo',
      { backend: 'memory' }
    );

    // Get the mocked Octokit instance
    mockOctokit = (client as any).octokit;
  });

  afterEach(async () => {
    await cacheManager.clear();
    vi.clearAllMocks();
  });

  describe('Repository Information', () => {
    it('should cache repository information', async () => {
      const mockRepoData = {
        id: 123,
        name: 'test-repo',
        full_name: 'test-owner/test-repo',
        description: 'Test repository',
        private: false,
        fork: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        stargazers_count: 42,
        forks_count: 10,
        language: 'TypeScript',
        default_branch: 'main'
      };

      mockOctokit.rest.repos.get.mockResolvedValue({ data: mockRepoData });

      // First call should fetch from API
      const result1 = await client.getRepository();
      expect(result1).toEqual(mockRepoData);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await client.getRepository();
      expect(result2).toEqual(mockRepoData);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should refresh repository cache when invalidated', async () => {
      const mockRepoData1 = {
        id: 123,
        name: 'test-repo',
        stargazers_count: 42
      };

      const mockRepoData2 = {
        id: 123,
        name: 'test-repo',
        stargazers_count: 50 // Updated value
      };

      mockOctokit.rest.repos.get
        .mockResolvedValueOnce({ data: mockRepoData1 })
        .mockResolvedValueOnce({ data: mockRepoData2 });

      // First call
      await client.getRepository();
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(1);

      // Invalidate cache
      await client.invalidateRepositoryCache();

      // Second call should fetch fresh data
      const result = await client.getRepository();
      expect(result.stargazers_count).toBe(50);
      expect(mockOctokit.rest.repos.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Issues', () => {
    it('should cache issues list with options', async () => {
      const mockIssues = [
        {
          id: 1,
          number: 1,
          title: 'Issue 1',
          body: 'Body 1',
          state: 'open',
          labels: [{ name: 'bug', color: 'red' }],
          user: { login: 'user1', id: 101 },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/1'
        },
        {
          id: 2,
          number: 2,
          title: 'Issue 2',
          body: 'Body 2',
          state: 'closed',
          labels: [],
          user: { login: 'user2', id: 102 },
          created_at: '2023-01-03T00:00:00Z',
          updated_at: '2023-01-04T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/issues/2'
        }
      ];

      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: mockIssues });

      const options = {
        state: 'open' as const,
        labels: ['bug'],
        per_page: 50
      };

      // First call should fetch from API
      const result1 = await client.getIssues(options);
      expect(result1).toEqual(mockIssues);
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        state: 'open',
        labels: 'bug',
        sort: 'updated',
        direction: 'desc',
        per_page: 50
      });

      // Second call should use cache
      const result2 = await client.getIssues(options);
      expect(result2).toEqual(mockIssues);
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledTimes(1);
    });

    it('should cache issue with comments', async () => {
      const mockIssue = {
        id: 1,
        number: 1,
        title: 'Issue 1',
        body: 'Body 1',
        state: 'open',
        labels: [],
        user: { login: 'user1', id: 101 },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        html_url: 'https://github.com/test-owner/test-repo/issues/1'
      };

      const mockComments = [
        {
          id: 101,
          body: 'Comment 1',
          user: { login: 'user1', id: 101 },
          created_at: '2023-01-01T01:00:00Z'
        },
        {
          id: 102,
          body: 'Comment 2',
          user: { login: 'user2', id: 102 },
          created_at: '2023-01-01T02:00:00Z'
        }
      ];

      mockOctokit.rest.issues.get.mockResolvedValue({ data: mockIssue });
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: mockComments });

      // First call should fetch from API
      const result1 = await client.getIssueWithComments(1);
      expect(result1).toEqual({
        issue: mockIssue,
        comments: mockComments
      });
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1
      });
      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 1
      });

      // Second call should use cache
      const result2 = await client.getIssueWithComments(1);
      expect(result2).toEqual({
        issue: mockIssue,
        comments: mockComments
      });
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledTimes(1);
      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pull Requests', () => {
    it('should cache pull requests list', async () => {
      const mockPRs = [
        {
          id: 201,
          number: 1,
          title: 'PR 1',
          body: 'PR Body 1',
          state: 'open',
          user: { login: 'user1', id: 101 },
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
          head: { ref: 'feature-branch', sha: 'abc123' },
          base: { ref: 'main', sha: 'def456' }
        }
      ];

      mockOctokit.rest.pulls.list.mockResolvedValue({ data: mockPRs });

      // First call should fetch from API
      const result1 = await client.getPullRequests({ state: 'open' });
      expect(result1).toEqual(mockPRs);

      // Second call should use cache
      const result2 = await client.getPullRequests({ state: 'open' });
      expect(result2).toEqual(mockPRs);
      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('Repository Tree', () => {
    it('should cache repository tree structure', async () => {
      const mockTree = {
        tree: [
          { path: 'README.md', type: 'blob', sha: 'file1sha' },
          { path: 'src/', type: 'tree', sha: 'dir1sha' },
          { path: 'src/index.ts', type: 'blob', sha: 'file2sha' }
        ]
      };

      mockOctokit.rest.git.getTree.mockResolvedValue({ data: mockTree });

      // First call should fetch from API
      const result1 = await client.getRepositoryTree();
      expect(result1).toEqual(mockTree.tree);

      // Second call should use cache
      const result2 = await client.getRepositoryTree();
      expect(result2).toEqual(mockTree.tree);
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(1);
    });

    it('should cache tree for specific path and SHA', async () => {
      const mockTree = { tree: [{ path: 'nested/file.ts', type: 'blob', sha: 'nestedsha' }] };
      mockOctokit.rest.git.getTree.mockResolvedValue({ data: mockTree });

      await client.getRepositoryTree('abc123', 'src/');
      await client.getRepositoryTree('abc123', 'src/');

      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        tree_sha: 'abc123',
        path: 'src/',
        recursive: 'true'
      });
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Content', () => {
    it('should cache file content', async () => {
      const mockFileContent = Buffer.from('file content').toString('base64');
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: mockFileContent }
      });

      // First call should fetch from API
      const result1 = await client.getFileContent('README.md');
      expect(result1).toBe('file content');

      // Second call should use cache
      const result2 = await client.getFileContent('README.md');
      expect(result2).toBe('file content');
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledTimes(1);
    });

    it('should return null for non-existent files', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not Found'));

      const result = await client.getFileContent('nonexistent.md');
      expect(result).toBeNull();
    });
  });

  describe('Cache Invalidation on Write Operations', () => {
    it('should invalidate issues cache when creating issue', async () => {
      // Pre-populate cache
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
      await client.getIssues();

      mockOctokit.rest.issues.create.mockResolvedValue({
        data: { id: 1, number: 1, title: 'New Issue' }
      });

      await client.createIssue({ title: 'New Issue', body: 'Issue body' });

      // Next getIssues call should fetch from API again
      await client.getIssues();
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledTimes(2);
    });

    it('should invalidate specific issue cache when updating', async () => {
      // Pre-populate caches
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: { id: 1, number: 1, title: 'Original Title' }
      });
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });

      await client.getIssues();
      await client.getIssueWithComments(1);

      mockOctokit.rest.issues.update.mockResolvedValue({
        data: { id: 1, number: 1, title: 'Updated Title' }
      });

      await client.updateIssue(1, { title: 'Updated Title' });

      // Next calls should fetch from API again
      await client.getIssues();
      await client.getIssueWithComments(1);

      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalledTimes(2);
      expect(mockOctokit.rest.issues.get).toHaveBeenCalledTimes(2);
    });

    it('should invalidate issue comments cache when creating comment', async () => {
      // Pre-populate cache
      mockOctokit.rest.issues.get.mockResolvedValue({
        data: { id: 1, number: 1, title: 'Issue 1' }
      });
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });

      await client.getIssueWithComments(1);

      mockOctokit.rest.issues.createComment.mockResolvedValue({
        data: { id: 101, body: 'New Comment', user: { login: 'user1', id: 101 } }
      });

      await client.createComment(1, 'New Comment');

      // Next getIssueWithComments call should fetch from API again
      await client.getIssueWithComments(1);

      expect(mockOctokit.rest.issues.listComments).toHaveBeenCalledTimes(2);
    });
  });

  describe('Repository Operations', () => {
    it('should cache contributors list', async () => {
      const mockContributors = [
        { login: 'user1', id: 101, contributions: 10, type: 'User' },
        { login: 'user2', id: 102, contributions: 5, type: 'User' }
      ];

      mockOctokit.rest.repos.listContributors.mockResolvedValue({ data: mockContributors });

      // First call should fetch from API
      const result1 = await client.getContributors();
      expect(result1).toEqual(mockContributors);

      // Second call should use cache
      const result2 = await client.getContributors();
      expect(result2).toEqual(mockContributors);
      expect(mockOctokit.rest.repos.listContributors).toHaveBeenCalledTimes(1);
    });

    it('should cache branches list', async () => {
      const mockBranches = [
        { name: 'main', commit: { sha: 'abc123', url: 'url1' }, protected: true },
        { name: 'develop', commit: { sha: 'def456', url: 'url2' }, protected: false }
      ];

      mockOctokit.rest.repos.listBranches.mockResolvedValue({ data: mockBranches });

      // First call should fetch from API
      const result1 = await client.getBranches();
      expect(result1).toEqual(mockBranches);

      // Second call should use cache
      const result2 = await client.getBranches();
      expect(result2).toEqual(mockBranches);
      expect(mockOctokit.rest.repos.listBranches).toHaveBeenCalledTimes(1);
    });

    it('should cache releases list', async () => {
      const mockReleases = [
        {
          tag_name: 'v1.0.0',
          name: 'Release 1.0.0',
          body: 'Release notes',
          published_at: '2023-01-01T00:00:00Z',
          prerelease: false
        }
      ];

      mockOctokit.rest.repos.listReleases.mockResolvedValue({ data: mockReleases });

      // First call should fetch from API
      const result1 = await client.getReleases();
      expect(result1).toEqual(mockReleases);

      // Second call should use cache
      const result2 = await client.getReleases();
      expect(result2).toEqual(mockReleases);
      expect(mockOctokit.rest.repos.listReleases).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should return cache statistics', async () => {
      // Simulate some cache activity
      mockOctokit.rest.repos.get.mockResolvedValue({ 
        data: { id: 123, name: 'test-repo' } 
      });

      await client.getRepository();
      await client.getRepository(); // Cache hit

      const stats = await client.getCacheStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalSize');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache', async () => {
      // Pre-populate cache
      mockOctokit.rest.repos.get.mockResolvedValue({ 
        data: { id: 123, name: 'test-repo' } 
      });
      await client.getRepository();

      expect(await client.getCacheStats()).toHaveProperty('totalSize');

      await client.clearCache();

      const stats = await client.getCacheStats();
      expect(stats.totalSize).toBe(0);
    });

    it('should warm cache with common entries', async () => {
      mockOctokit.rest.repos.get.mockResolvedValue({ 
        data: { id: 123, name: 'test-repo' } 
      });
      mockOctokit.rest.issues.listForRepo.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.repos.listBranches.mockResolvedValue({ data: [] });

      await client.warmCache();

      expect(mockOctokit.rest.repos.get).toHaveBeenCalled();
      expect(mockOctokit.rest.issues.listForRepo).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.list).toHaveBeenCalled();
      expect(mockOctokit.rest.repos.listBranches).toHaveBeenCalled();
    });
  });

  describe('Export/Import Cache', () => {
    it('should export cache to file', async () => {
      // Pre-populate cache
      mockOctokit.rest.repos.get.mockResolvedValue({ 
        data: { id: 123, name: 'test-repo' } 
      });
      await client.getRepository();

      const exportPath = `${testCacheDir}/export.json`;
      
      // Mock cache export
      const exportSpy = vi.spyOn(cacheManager, 'exportCache').mockResolvedValue();
      
      await client.exportCache(exportPath);
      
      expect(exportSpy).toHaveBeenCalledWith(exportPath);
      exportSpy.mockRestore();
    });

    it('should import cache from file', async () => {
      const importPath = `${testCacheDir}/import.json`;
      
      // Mock cache import
      const importSpy = vi.spyOn(cacheManager, 'importCache').mockResolvedValue();
      
      await client.importCache(importPath);
      
      expect(importSpy).toHaveBeenCalledWith(importPath);
      importSpy.mockRestore();
    });
  });
});
