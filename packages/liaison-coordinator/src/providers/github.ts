/**
 * GitHub Provider Implementation
 *
 * Implements IssueSourceProvider for GitHub Issues/PRs.
 * Wraps the existing GitHubClientImpl to provide the normalized interface.
 */

import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import type {
  IssueSourceProvider,
  IssueSourceType,
  NormalizedIssue,
  NormalizedComment,
  FetchIssuesOptions,
  FetchPullRequestsOptions,
  CreateIssueInput,
  UpdateIssueInput,
  GitHubProviderConfig,
} from './types.js';

/**
 * GitHub provider for issue synchronization
 */
export class GitHubProvider implements IssueSourceProvider {
  readonly type: IssueSourceType = 'github';
  readonly name: string;

  private octokit: InstanceType<typeof Octokit>;
  private owner: string;
  private repo: string;

  constructor(config: GitHubProviderConfig) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.name = `GitHub (${config.owner}/${config.repo})`;

    const octokitOptions: Record<string, unknown> = {
      auth: config.token,
      userAgent: 'liaison/0.5.0',
    };

    if (config.apiUrl) {
      octokitOptions.baseUrl = config.apiUrl;
    }

    this.octokit = new Octokit(octokitOptions);
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

  async getIssues(options?: FetchIssuesOptions): Promise<NormalizedIssue[]> {
    try {
      console.log(chalk.gray(`📥 Fetching issues from ${this.owner}/${this.repo}...`));

      const params: {
        owner: string;
        repo: string;
        state: 'open' | 'closed' | 'all';
        sort: 'updated' | 'created' | 'comments';
        direction: 'desc' | 'asc';
        per_page: number;
        since?: string;
        labels?: string;
      } = {
        owner: this.owner,
        repo: this.repo,
        state: options?.state === 'all' ? 'all' : (options?.state || 'all'),
        sort: 'updated',
        direction: 'desc',
        per_page: options?.limit || 100,
      };

      if (options?.since) {
        params.since = options.since.toISOString();
      }

      if (options?.labels && options.labels.length > 0) {
        params.labels = options.labels.join(',');
      }

      const response = await this.octokit.rest.issues.listForRepo(params);

      // Filter out pull requests (they show up in issues API)
      const issues = response.data.filter((issue: any) => !issue.pull_request);

      return issues.map((issue: any) => this.normalizeIssue(issue, false));
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to fetch issues from ${this.owner}/${this.repo}:`),
        error
      );
      throw error;
    }
  }

  async getPullRequests(options?: FetchPullRequestsOptions): Promise<NormalizedIssue[]> {
    try {
      console.log(chalk.gray(`📥 Fetching PRs from ${this.owner}/${this.repo}...`));

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
        state: options?.state === 'merged' ? 'closed' : (options?.state === 'all' ? 'all' : (options?.state || 'all')),
        sort: 'updated',
        direction: 'desc',
        per_page: options?.limit || 100,
      };

      const response = await this.octokit.rest.pulls.list(params);

      let prs = response.data;

      // Filter by since date if provided
      if (options?.since) {
        const sinceTime = options.since.getTime();
        prs = prs.filter((pr: any) => new Date(pr.updated_at).getTime() >= sinceTime);
      }

      // Filter merged PRs if specifically requested
      if (options?.state === 'merged') {
        prs = prs.filter((pr: any) => pr.merged_at !== null);
      }

      return prs.map((pr: any) => this.normalizeIssue(pr, true));
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to fetch PRs from ${this.owner}/${this.repo}:`),
        error
      );
      throw error;
    }
  }

  async getComments(issueKey: string): Promise<NormalizedComment[]> {
    const issueNumber = parseInt(issueKey, 10);

    try {
      console.log(chalk.gray(`💬 Fetching comments for issue #${issueNumber}...`));

      const response = await this.octokit.rest.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        sort: 'created',
        direction: 'asc',
      });

      return response.data.map((comment: any) => this.normalizeComment(comment));
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to fetch comments for #${issueNumber}:`),
        error
      );
      throw error;
    }
  }

  async createIssue(input: CreateIssueInput): Promise<NormalizedIssue> {
    try {
      console.log(chalk.gray(`📝 Creating issue: ${input.title}`));

      const params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        labels: string[];
        assignees: string[];
        milestone?: number;
      } = {
        owner: this.owner,
        repo: this.repo,
        title: input.title,
        body: input.body || '',
        labels: input.labels || [],
        assignees: input.assignees || [],
      };

      if (input.milestone) {
        params.milestone = parseInt(input.milestone, 10);
      }

      const response = await this.octokit.rest.issues.create(params);

      return this.normalizeIssue(response.data, false);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create issue:`), error);
      throw error;
    }
  }

  async updateIssue(issueKey: string, update: UpdateIssueInput): Promise<NormalizedIssue> {
    const issueNumber = parseInt(issueKey, 10);

    try {
      console.log(chalk.gray(`📝 Updating issue #${issueNumber}`));

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
      if (update.body !== undefined) params.body = update.body;
      if (update.state !== undefined) params.state = update.state;
      if (update.labels !== undefined) params.labels = update.labels;
      if (update.assignees !== undefined) params.assignees = update.assignees;

      const response = await this.octokit.rest.issues.update(params);

      return this.normalizeIssue(response.data, false);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update issue #${issueNumber}:`), error);
      throw error;
    }
  }

  async createComment(issueKey: string, body: string): Promise<NormalizedComment> {
    const issueNumber = parseInt(issueKey, 10);

    try {
      console.log(chalk.gray(`💬 Adding comment to #${issueNumber}...`));

      const response = await this.octokit.rest.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body,
      });

      return this.normalizeComment(response.data);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create comment on #${issueNumber}:`), error);
      throw error;
    }
  }

  async updateComment(_issueKey: string, commentId: string, body: string): Promise<NormalizedComment> {
    try {
      console.log(chalk.gray(`💬 Updating comment ${commentId}...`));

      const response = await this.octokit.rest.issues.updateComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: parseInt(commentId, 10),
        body,
      });

      return this.normalizeComment(response.data);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update comment ${commentId}:`), error);
      throw error;
    }
  }

  async deleteComment(_issueKey: string, commentId: string): Promise<void> {
    try {
      console.log(chalk.gray(`🗑️  Deleting comment ${commentId}...`));

      await this.octokit.rest.issues.deleteComment({
        owner: this.owner,
        repo: this.repo,
        comment_id: parseInt(commentId, 10),
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to delete comment ${commentId}:`), error);
      throw error;
    }
  }

  async addLabel(issueKey: string, label: string): Promise<void> {
    const issueNumber = parseInt(issueKey, 10);

    try {
      console.log(chalk.gray(`🏷️  Adding label "${label}" to #${issueNumber}...`));

      await this.octokit.rest.issues.addLabels({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: [label],
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to add label "${label}" to #${issueNumber}:`), error);
      throw error;
    }
  }

  async removeLabel(issueKey: string, label: string): Promise<void> {
    const issueNumber = parseInt(issueKey, 10);

    try {
      console.log(chalk.gray(`🏷️  Removing label "${label}" from #${issueNumber}...`));

      await this.octokit.rest.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch (error) {
      console.error(chalk.red(`❌ Failed to remove label "${label}" from #${issueNumber}:`), error);
      throw error;
    }
  }

  /**
   * Convert GitHub issue/PR to normalized format
   */
  private normalizeIssue(issue: any, isPullRequest: boolean): NormalizedIssue {
    return {
      id: String(issue.id),
      key: String(issue.number),
      title: issue.title,
      body: issue.body || '',
      state: issue.state === 'open' ? 'open' : 'closed',
      labels: (issue.labels || []).map((label: any) =>
        typeof label === 'string' ? label : label.name
      ),
      assignees: (issue.assignees || []).map((assignee: any) =>
        typeof assignee === 'string' ? assignee : assignee.login
      ),
      milestone: issue.milestone?.title,
      author: issue.user?.login || 'unknown',
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at || undefined,
      url: issue.html_url,
      commentCount: issue.comments || 0,
      isPullRequest,
      providerData: {
        githubId: issue.id,
        githubNumber: issue.number,
        pullRequest: issue.pull_request,
      },
    };
  }

  /**
   * Convert GitHub comment to normalized format
   */
  private normalizeComment(comment: any): NormalizedComment {
    return {
      id: String(comment.id),
      body: comment.body || '',
      author: comment.user?.login || 'unknown',
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      url: comment.html_url,
    };
  }
}

/**
 * Factory function to create a GitHub provider
 */
export function createGitHubProvider(config: GitHubProviderConfig): GitHubProvider {
  return new GitHubProvider(config);
}
