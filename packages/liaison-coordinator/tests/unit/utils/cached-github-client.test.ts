/**
 * Cached GitHub Client Tests
 * Unit tests for the CachedGitHubClient implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock Octokit before importing CachedGitHubClient
const mockOctokit = {
  rest: {
    repos: {
      get: vi.fn(),
      listContributors: vi.fn(),
      listBranches: vi.fn(),
      listReleases: vi.fn(),
      getContent: vi.fn(),
    },
    issues: {
      listForRepo: vi.fn(),
      get: vi.fn(),
      listComments: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      createComment: vi.fn(),
    },
    pulls: {
      list: vi.fn(),
    },
    git: {
      getTree: vi.fn(),
    },
  },
};

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn(() => mockOctokit),
}));

// Import after mocking
import { CachedGitHubClient } from "../../../src/utils/github/CachedGitHubClient.js";
import { CacheManager } from "../../../src/core/cache/CacheManager.js";

describe("CachedGitHubClient", () => {
  let client: CachedGitHubClient;
  let cacheManager: CacheManager;
  let mockOctokit: any;
  let testCacheDir: string;

  beforeEach(async () => {
    testCacheDir = `${process.cwd()}/.test-github-cache`;

    cacheManager = new CacheManager({
      backend: "memory",
      maxMemoryEntries: 100,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false,
    });

    client = new CachedGitHubClient("test-token", "test-owner", "test-repo", {
      backend: "memory",
    });

    // Get the mocked Octokit instance
    mockOctokit = (client as any).octokit;
  });

  afterEach(async () => {
    await cacheManager.clear();
    vi.clearAllMocks();
  });

  describe("Repository Information", () => {
    it("should cache repository information", async () => {
      const mockRepoData = {
        id: 123,
        name: "test-repo",
        full_name: "test-owner/test-repo",
        description: "Test repository",
        private: false,
        fork: false,
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2023-01-02T00:00:00Z",
        stargazers_count: 42,
        forks_count: 10,
        language: "TypeScript",
        default_branch: "main",
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
  });
});
