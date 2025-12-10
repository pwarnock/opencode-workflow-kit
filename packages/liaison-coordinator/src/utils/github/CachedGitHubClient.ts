/**
 * Cached GitHub Client
 * GitHub API client with intelligent caching
 */

import { Octokit } from '@octokit/rest';
import { CacheManager } from '../../core/cache/CacheManager.js';

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  user: {
    login: string;
    id: number;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  default_branch: string;
}

export class CachedGitHubClient {
  private octokit: Octokit;
  private cache: CacheManager;
  private owner: string;
  private repo: string;

  constructor(
    token: string,
    owner: string,
    repo: string,
    cacheConfig?: any
  ) {
    this.octokit = new Octokit({ auth: token });
    this.cache = new CacheManager(cacheConfig);
    this.owner = owner;
    this.repo = repo;
  }

  // Repository information
  async getRepository(): Promise<GitHubRepository> {
    const cacheKey = `github:repo:${this.owner}/${this.repo}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.repos.get({
          owner: this.owner,
          repo: this.repo
        });
        
        return data as GitHubRepository;
      }
    );
  }

  // Issues with filtering and caching
  async getIssues(options: {
    state?: 'open' | 'closed' | 'all';
    labels?: string[];
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubIssue[]> {
    const cacheKey = `github:issues:${this.owner}/${this.repo}:${JSON.stringify(options)}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: options.state || 'open',
          labels: options.labels?.join(','),
          sort: options.sort || 'updated',
          direction: options.direction || 'desc',
          per_page: options.per_page || 100
        });
        
        return data as GitHubIssue[];
      }
    );
  }

  // Single issue with comments
  async getIssueWithComments(issueNumber: number): Promise<{
    issue: GitHubIssue;
    comments: Array<{
      id: number;
      body: string;
      user: { login: string; id: number };
      created_at: string;
    }>;
  }> {
    const cacheKey = `github:issue:${this.owner}/${this.repo}:${issueNumber}:full`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        // Get issue and comments in parallel
        const [issueResponse, commentsResponse] = await Promise.all([
          this.octokit.rest.issues.get({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber
          }),
          this.octokit.rest.issues.listComments({
            owner: this.owner,
            repo: this.repo,
            issue_number: issueNumber
          })
        ]);
        
        return {
          issue: issueResponse.data as GitHubIssue,
          comments: commentsResponse.data as Array<{
            id: number;
            body: string;
            user: { login: string; id: number };
            created_at: string;
          }>
        };
      }
    );
  }

  // Pull requests with filtering
  async getPullRequests(options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
    per_page?: number;
  } = {}): Promise<GitHubPullRequest[]> {
    const cacheKey = `github:prs:${this.owner}/${this.repo}:${JSON.stringify(options)}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.pulls.list({
          owner: this.owner,
          repo: this.repo,
          state: options.state || 'open',
          sort: options.sort || 'updated',
          direction: options.direction || 'desc',
          per_page: options.per_page || 100
        });
        
        return data as GitHubPullRequest[];
      }
    );
  }

  // Repository tree structure
  async getRepositoryTree(sha?: string, path: string = ''): Promise<any[]> {
    const cacheKey = `github:tree:${this.owner}/${this.repo}:${sha || 'HEAD'}:${path}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.git.getTree({
          owner: this.owner,
          repo: this.repo,
          tree_sha: sha || 'HEAD',
          path: path,
          recursive: 'true'
        });
        
        return (data as any).tree || [];
      }
    );
  }

  // File content
  async getFileContent(path: string, ref?: string): Promise<string | null> {
    const cacheKey = `github:file:${this.owner}/${this.repo}:${path}:${ref || 'HEAD'}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        try {
          const requestParams: any = {
            owner: this.owner,
            repo: this.repo,
            path: path
          };
          if (ref !== undefined) {
            requestParams.ref = ref;
          }
          
          const { data } = await this.octokit.rest.repos.getContent(requestParams);
          
          if ('content' in data && typeof data.content === 'string') {
            return Buffer.from(data.content, 'base64').toString('utf-8');
          }
          
          return null;
        } catch (error) {
          // File not found or access denied
          return null;
        }
      }
    );
  }

  // Repository contributors
  async getContributors(): Promise<Array<{
    login: string;
    id: number;
    contributions: number;
    type: string;
  }>> {
    const cacheKey = `github:contributors:${this.owner}/${this.repo}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.repos.listContributors({
          owner: this.owner,
          repo: this.repo
        });
        
        return data as Array<{
          login: string;
          id: number;
          contributions: number;
          type: string;
        }>;
      }
    );
  }

  // Repository branches
  async getBranches(): Promise<Array<{
    name: string;
    commit: {
      sha: string;
      url: string;
    };
    protected: boolean;
  }>> {
    const cacheKey = `github:branches:${this.owner}/${this.repo}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.repos.listBranches({
          owner: this.owner,
          repo: this.repo
        });
        
        return data as Array<{
          name: string;
          commit: {
            sha: string;
            url: string;
          };
          protected: boolean;
        }>;
      }
    );
  }

  // Repository tags/releases
  async getReleases(): Promise<Array<{
    tag_name: string;
    name: string;
    body: string | null;
    published_at: string;
    prerelease: boolean;
  }>> {
    const cacheKey = `github:releases:${this.owner}/${this.repo}`;
    
    return await this.cache.getCachedGitHubData(
      cacheKey,
      async () => {
        const { data } = await this.octokit.rest.repos.listReleases({
          owner: this.owner,
          repo: this.repo
        });
        
        return data as Array<{
          tag_name: string;
          name: string;
          body: string | null;
          published_at: string;
          prerelease: boolean;
        }>;
      }
    );
  }

  // Create issue (with cache invalidation)
  async createIssue(issue: {
    title: string;
    body: string;
    labels?: string[];
  }): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.create({
      owner: this.owner,
      repo: this.repo,
      ...issue
    });
    
    // Invalidate relevant cache entries
    await this.invalidateIssuesCache();
    
    return data as GitHubIssue;
  }

  // Update issue (with cache invalidation)
  async updateIssue(
    issueNumber: number,
    updates: {
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
    }
  ): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      ...updates
    });
    
    // Invalidate relevant cache entries
    await Promise.all([
      this.invalidateIssuesCache(),
      this.cache.delete(`github:issue:${this.owner}/${this.repo}:${issueNumber}:full`)
    ]);
    
    return data as GitHubIssue;
  }

  // Create comment (with cache invalidation)
  async createComment(
    issueNumber: number,
    body: string
  ): Promise<{
    id: number;
    body: string;
    user: { login: string; id: number };
    created_at: string;
  }> {
    const { data } = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body
    });
    
    // Invalidate issue comments cache
    await this.cache.delete(`github:issue:${this.owner}/${this.repo}:${issueNumber}:full`);
    
    return data as {
      id: number;
      body: string;
      user: { login: string; id: number };
      created_at: string;
    };
  }

  // Cache invalidation methods
  private async invalidateIssuesCache(): Promise<void> {
    await this.cache.invalidatePattern(/^github:issues:.*$/);
    await this.cache.invalidatePattern(/^github:repo:.*$/);
  }

  private async invalidatePRCache(): Promise<void> {
    await this.cache.invalidatePattern(/^github:prs:.*$/);
  }

  private async invalidateTreeCache(): Promise<void> {
    await this.cache.invalidatePattern(/^github:tree:.*$/);
  }

  private async invalidateFileCache(): Promise<void> {
    await this.cache.invalidatePattern(/^github:file:.*$/);
  }

  // Batch cache invalidation for repository changes
  async invalidateRepositoryCache(): Promise<void> {
    await Promise.all([
      this.cache.invalidatePattern(/^github:repo:.*$/),
      this.invalidateIssuesCache(),
      this.invalidatePRCache(),
      this.invalidateTreeCache(),
      this.invalidateFileCache(),
      this.cache.invalidatePattern(/^github:contributors:.*$/),
      this.cache.invalidatePattern(/^github:branches:.*$/),
      this.cache.invalidatePattern(/^github:releases:.*$/)
    ]);
  }

  // Cache statistics
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    totalSize: number;
  }> {
    const stats = await this.cache.getStats();
    const total = stats.hits + stats.misses;
    
    return {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
      totalSize: stats.totalSize
    };
  }

  // Cache management
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  async warmCache(): Promise<void> {
    // Pre-warm common cache entries
    await Promise.all([
      this.getRepository(),
      this.getIssues({ state: 'open', per_page: 10 }),
      this.getPullRequests({ state: 'open', per_page: 10 }),
      this.getBranches()
    ]);
  }

  // Export/import cache for backup/restore
  async exportCache(filePath: string): Promise<void> {
    await this.cache.exportCache(filePath);
  }

  async importCache(filePath: string): Promise<void> {
    await this.cache.importCache(filePath);
  }
}
