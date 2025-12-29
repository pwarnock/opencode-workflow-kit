/**
 * GitHub Work Item Adapter
 *
 * Implements WorkItemAdapter for GitHub Issues and Pull Requests.
 * Uses Octokit for GitHub API communication.
 */

import { Octokit } from '@octokit/rest';
import type {
  WorkItemAdapter,
  WorkItem,
  WorkItemFilter,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  AdapterCapabilities,
  Comment,
  PullRequestFilter,
  WorkItemAdapterType,
} from './types';

/**
 * Configuration for the GitHub adapter
 */
export interface GitHubAdapterConfig {
  /** GitHub personal access token or app token */
  token: string;
  /** Repository owner (user or organization) */
  owner: string;
  /** Repository name */
  repo: string;
  /** Optional API URL for GitHub Enterprise */
  apiUrl?: string;
}

/**
 * GitHub adapter implementing WorkItemAdapter
 */
export class GitHubAdapter implements WorkItemAdapter {
  readonly type: WorkItemAdapterType = 'github';

  private octokit: InstanceType<typeof Octokit>;
  private owner: string;
  private repo: string;

  constructor(config: GitHubAdapterConfig) {
    this.owner = config.owner;
    this.repo = config.repo;

    const octokitOptions: Record<string, unknown> = {
      auth: config.token,
      userAgent: 'liaison/0.1.0',
    };

    if (config.apiUrl) {
      octokitOptions.baseUrl = config.apiUrl;
    }

    this.octokit = new Octokit(octokitOptions);
  }

  // ==========================================
  // Identity Methods
  // ==========================================

  name(): string {
    return `github:${this.owner}/${this.repo}`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================
  // Core CRUD Methods
  // ==========================================

  async getItem(id: string): Promise<WorkItem | null> {
    try {
      const issueNumber = parseInt(id, 10);
      const response = await this.octokit.rest.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });
      return this.issueToWorkItem(response.data);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listItems(filters?: WorkItemFilter): Promise<WorkItem[]> {
    const params: {
      owner: string;
      repo: string;
      state: 'open' | 'closed' | 'all';
      sort: 'updated' | 'created' | 'comments';
      direction: 'desc' | 'asc';
      per_page: number;
      since?: string;
      labels?: string;
      assignee?: string;
    } = {
      owner: this.owner,
      repo: this.repo,
      state: this.mapStatusToGitHubState(filters?.status),
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    };

    if (filters?.since) {
      params.since = filters.since.toISOString();
    }

    if (filters?.labels && filters.labels.length > 0) {
      params.labels = filters.labels.join(',');
    }

    if (filters?.assignee) {
      params.assignee = filters.assignee;
    }

    const response = await this.octokit.rest.issues.listForRepo(params);

    // Filter out pull requests (they show up in issues API)
    const issues = response.data.filter((issue: any) => !issue.pull_request);

    return issues.map((issue: any) => this.issueToWorkItem(issue));
  }

  async createItem(input: CreateWorkItemInput): Promise<WorkItem> {
    const params: {
      owner: string;
      repo: string;
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    } = {
      owner: this.owner,
      repo: this.repo,
      title: input.title,
      body: input.description || '',
      labels: input.labels || [],
    };

    if (input.assignee) {
      params.assignees = [input.assignee];
    }

    const response = await this.octokit.rest.issues.create(params);
    return this.issueToWorkItem(response.data);
  }

  async updateItem(id: string, update: UpdateWorkItemInput): Promise<WorkItem> {
    const issueNumber = parseInt(id, 10);

    const params: {
      owner: string;
      repo: string;
      issue_number: number;
      title?: string;
      body?: string;
      state?: 'open' | 'closed';
      labels?: string[];
      assignees?: string[];
    } = {
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    };

    if (update.title !== undefined) params.title = update.title;
    if (update.description !== undefined) params.body = update.description;
    if (update.status !== undefined) {
      params.state = update.status === 'open' || update.status === 'in_progress' ? 'open' : 'closed';
    }
    if (update.labels !== undefined) params.labels = update.labels;
    if (update.assignee !== undefined) params.assignees = update.assignee ? [update.assignee] : [];

    const response = await this.octokit.rest.issues.update(params);
    return this.issueToWorkItem(response.data);
  }

  // ==========================================
  // Capability Discovery
  // ==========================================

  capabilities(): AdapterCapabilities {
    return {
      supportsComments: true,
      supportsLabels: true,
      supportsMilestones: true,
      supportsAssignees: true,
      supportsPullRequests: true,
      supportsDependencies: false,
      supportsReadyQueue: false,
      supportsBulkOperations: false,
    };
  }

  // ==========================================
  // Optional Extended Operations
  // ==========================================

  async getComments(itemId: string): Promise<Comment[]> {
    const issueNumber = parseInt(itemId, 10);

    const response = await this.octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      sort: 'created',
      direction: 'asc',
    });

    return response.data.map((comment: any) => this.commentToComment(comment));
  }

  async addComment(itemId: string, content: string): Promise<Comment> {
    const issueNumber = parseInt(itemId, 10);

    const response = await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      body: content,
    });

    return this.commentToComment(response.data);
  }

  async getLabels(itemId: string): Promise<string[]> {
    const issueNumber = parseInt(itemId, 10);

    const response = await this.octokit.rest.issues.listLabelsOnIssue({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });

    return response.data.map((label: any) => label.name);
  }

  async addLabel(itemId: string, label: string): Promise<void> {
    const issueNumber = parseInt(itemId, 10);

    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      labels: [label],
    });
  }

  async removeLabel(itemId: string, label: string): Promise<void> {
    const issueNumber = parseInt(itemId, 10);

    await this.octokit.rest.issues.removeLabel({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      name: label,
    });
  }

  // ==========================================
  // Pull Requests
  // ==========================================

  async listPullRequests(filters?: PullRequestFilter): Promise<WorkItem[]> {
    // Map filter state to GitHub API state
    let githubState: 'open' | 'closed' | 'all' = 'all';
    if (filters?.state === 'open') {
      githubState = 'open';
    } else if (filters?.state === 'closed' || filters?.state === 'merged') {
      githubState = 'closed';
    }

    const params: {
      owner: string;
      repo: string;
      state: 'open' | 'closed' | 'all';
      sort: 'updated' | 'created' | 'popularity' | 'long-running';
      direction: 'desc' | 'asc';
      per_page: number;
    } = {
      owner: this.owner,
      repo: this.repo,
      state: githubState,
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    };

    const response = await this.octokit.rest.pulls.list(params);

    let prs = response.data;

    // Filter by since date if provided
    if (filters?.since) {
      const sinceTime = filters.since.getTime();
      prs = prs.filter((pr: any) => new Date(pr.updated_at).getTime() >= sinceTime);
    }

    // Filter merged PRs if specifically requested
    if (filters?.state === 'merged') {
      prs = prs.filter((pr: any) => pr.merged_at !== null);
    }

    return prs.map((pr: any) => this.pullRequestToWorkItem(pr));
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Convert GitHub issue to WorkItem
   */
  private issueToWorkItem(issue: any): WorkItem {
    return {
      id: String(issue.number),
      title: issue.title,
      description: issue.body || undefined,
      status: issue.state === 'open' ? 'open' : 'closed',
      priority: this.extractPriority(issue.labels),
      assignee: issue.assignee?.login,
      labels: issue.labels?.map((l: any) => typeof l === 'string' ? l : l.name) || [],
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      sourceType: 'github',
      sourceUrl: issue.html_url,
      metadata: {
        githubId: issue.id,
        githubNumber: issue.number,
        milestone: issue.milestone?.title,
        author: issue.user?.login,
        commentCount: issue.comments || 0,
      },
    };
  }

  /**
   * Convert GitHub PR to WorkItem
   */
  private pullRequestToWorkItem(pr: any): WorkItem {
    return {
      id: String(pr.number),
      title: pr.title,
      description: pr.body || undefined,
      status: pr.state === 'open' ? 'open' : 'closed',
      priority: this.extractPriority(pr.labels),
      assignee: pr.assignee?.login,
      labels: pr.labels?.map((l: any) => typeof l === 'string' ? l : l.name) || [],
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
      sourceType: 'github',
      sourceUrl: pr.html_url,
      metadata: {
        githubId: pr.id,
        githubNumber: pr.number,
        isPullRequest: true,
        draft: pr.draft,
        merged: pr.merged_at !== null,
        mergedAt: pr.merged_at,
        author: pr.user?.login,
        head: pr.head?.ref,
        base: pr.base?.ref,
      },
    };
  }

  /**
   * Convert GitHub comment to Comment
   */
  private commentToComment(comment: any): Comment {
    return {
      id: String(comment.id),
      content: comment.body || '',
      author: comment.user?.login,
      createdAt: new Date(comment.created_at),
      updatedAt: comment.updated_at ? new Date(comment.updated_at) : undefined,
    };
  }

  /**
   * Extract priority from issue labels
   */
  private extractPriority(labels: any[]): 'low' | 'medium' | 'high' | 'critical' | undefined {
    if (!labels) return undefined;

    const labelNames = labels.map((l: any) => (typeof l === 'string' ? l : l.name).toLowerCase());

    if (labelNames.some(l => l.includes('critical') || l.includes('urgent') || l.includes('p0'))) {
      return 'critical';
    }
    if (labelNames.some(l => l.includes('high') || l.includes('p1') || l.includes('important'))) {
      return 'high';
    }
    if (labelNames.some(l => l.includes('medium') || l.includes('p2'))) {
      return 'medium';
    }
    if (labelNames.some(l => l.includes('low') || l.includes('p3') || l.includes('minor'))) {
      return 'low';
    }

    return undefined;
  }

  /**
   * Map WorkItemStatus to GitHub state
   */
  private mapStatusToGitHubState(status?: string): 'open' | 'closed' | 'all' {
    if (!status) return 'all';
    if (status === 'open' || status === 'in_progress') return 'open';
    if (status === 'closed' || status === 'deleted') return 'closed';
    return 'all';
  }
}

/**
 * Factory function to create a GitHub adapter
 */
export function createGitHubAdapter(config: GitHubAdapterConfig): GitHubAdapter {
  return new GitHubAdapter(config);
}
