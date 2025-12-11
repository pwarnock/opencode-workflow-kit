import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import { GitHubIssue, GitHubComment, GitHubClient } from '../types/index.js';

/**
 * GitHub API Client for Liaison integration
 */
export class GitHubClientImpl implements GitHubClient {
  private octokit: InstanceType<typeof Octokit>;

  constructor(token: string, options?: { apiUrl?: string }) {
    const octokitOptions: any = {
      auth: token,
      userAgent: 'liaison/0.5.0',
    };

    if (options?.apiUrl) {
      octokitOptions.baseUrl = options.apiUrl;
    }

    this.octokit = new Octokit(octokitOptions);
  }

  async getIssues(
    owner: string,
    repo: string,
    options?: { since?: Date }
  ): Promise<GitHubIssue[]> {
    try {
      console.log(chalk.gray(`📥 Fetching issues from ${owner}/${repo}...`));

      const params: any = {
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
      };

      if (options?.since) {
        params.since = options.since.toISOString();
      }

      const response = await this.octokit.rest.issues.listForRepo(params);
      return response.data.map(this.mapGitHubIssue);
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to fetch issues from ${owner}/${repo}:`),
        error
      );
      throw error;
    }
  }

  async getPullRequests(
    owner: string,
    repo: string,
    options?: { since?: Date }
  ): Promise<GitHubIssue[]> {
    try {
      console.log(chalk.gray(`📥 Fetching PRs from ${owner}/${repo}...`));

      const params: any = {
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
      };

      if (options?.since) {
        params.since = options.since.toISOString();
      }

      const response = await this.octokit.rest.pulls.list(params);
      return response.data.map(this.mapGitHubIssue);
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to fetch PRs from ${owner}/${repo}:`),
        error
      );
      throw error;
    }
  }

  async getComments(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubComment[]> {
    try {
      console.log(
        chalk.gray(`💬 Fetching comments for issue #${issueNumber}...`)
      );

      const response = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        sort: 'created',
        direction: 'desc',
      });

      return response.data.map(this.mapGitHubComment);
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to fetch comments for ${owner}/${repo}#${issueNumber}:`
        ),
        error
      );
      throw error;
    }
  }

  async createIssue(
    owner: string,
    repo: string,
    issue: Partial<GitHubIssue>
  ): Promise<GitHubIssue> {
    try {
      console.log(
        chalk.gray(`📝 Creating issue in ${owner}/${repo}: ${issue.title}`)
      );

      const response = await this.octokit.rest.issues.create({
        owner,
        repo,
        title: issue.title!,
        body: issue.body || '',
        labels:
          issue.labels?.map((label) =>
            typeof label === 'string' ? label : label.name
          ) || [],
        assignees:
          issue.assignees?.map((assignee) =>
            typeof assignee === 'string' ? assignee : assignee.login
          ) || [],
      });

      return this.mapGitHubIssue(response.data);
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to create issue in ${owner}/${repo}:`),
        error
      );
      throw error;
    }
  }

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    update: Partial<GitHubIssue>
  ): Promise<GitHubIssue> {
    try {
      console.log(
        chalk.gray(`📝 Updating issue #${issueNumber}: ${update.title}`)
      );

      const updateParams: any = {
        owner,
        repo,
        issue_number: issueNumber,
      };

      if (update.title !== undefined) updateParams.title = update.title;
      if (update.body !== undefined) updateParams.body = update.body;
      if (update.labels)
        updateParams.labels = update.labels.map((label) =>
          typeof label === 'string' ? label : label.name
        );
      if (update.assignees)
        updateParams.assignees = update.assignees.map((assignee) =>
          typeof assignee === 'string' ? assignee : assignee.login
        );

      const response = await this.octokit.rest.issues.update(updateParams);

      return this.mapGitHubIssue(response.data);
    } catch (error) {
      console.error(
        chalk.red(`❌ Failed to update issue ${owner}/${repo}#${issueNumber}:`),
        error
      );
      throw error;
    }
  }

  async createComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<GitHubComment> {
    try {
      console.log(
        chalk.gray(`💬 Adding comment to ${owner}/${repo}#${issueNumber}...`)
      );

      const response = await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });

      return this.mapGitHubComment(response.data);
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to create comment on ${owner}/${repo}#${issueNumber}:`
        ),
        error
      );
      throw error;
    }
  }

  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<GitHubComment> {
    try {
      console.log(
        chalk.gray(`💬 Updating comment ${commentId} on ${owner}/${repo}...`)
      );

      const response = await this.octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });

      return this.mapGitHubComment(response.data);
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to update comment ${commentId} on ${owner}/${repo}:`
        ),
        error
      );
      throw error;
    }
  }

  async deleteComment(
    owner: string,
    repo: string,
    commentId: number
  ): Promise<void> {
    try {
      console.log(
        chalk.gray(`🗑️  Deleting comment ${commentId} on ${owner}/${repo}...`)
      );

      await this.octokit.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: commentId,
      });
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to delete comment ${commentId} on ${owner}/${repo}:`
        ),
        error
      );
      throw error;
    }
  }

  async addLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    try {
      console.log(
        chalk.gray(`🏷️  Adding label "${label}" to issue #${issueNumber}...`)
      );

      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: issueNumber,
        labels: [label],
      });
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to add label "${label}" to ${owner}/${repo}#${issueNumber}:`
        ),
        error
      );
      throw error;
    }
  }

  async removeLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    label: string
  ): Promise<void> {
    try {
      console.log(
        chalk.gray(
          `🏷️  Removing label "${label}" from issue #${issueNumber}...`
        )
      );

      await this.octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: issueNumber,
        name: label,
      });
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Failed to remove label "${label}" from ${owner}/${repo}#${issueNumber}:`
        ),
        error
      );
      throw error;
    }
  }

  async getRepositories(): Promise<any[]> {
    try {
      console.log(chalk.gray('📥 Fetching repositories...'));

      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
      });

      return response.data;
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch repositories:'), error);
      throw error;
    }
  }

  private mapGitHubIssue(issue: any): GitHubIssue {
    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state === 'open' ? 'open' : 'closed',
      labels: (issue.labels || []).map((label: any) => ({
        name: typeof label === 'string' ? label : label.name,
      })),
      assignees: (issue.assignees || []).map((assignee: any) => ({
        login: typeof assignee === 'string' ? assignee : assignee.login,
      })),
      milestone: issue.milestone ? { title: issue.milestone.title } : undefined,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
      closed_at: issue.closed_at,
      html_url: issue.html_url,
      user: { login: issue.user.login },
      comments: issue.comments,
      pull_request: issue.pull_request,
    };
  }

  private mapGitHubComment(comment: any): GitHubComment {
    return {
      id: comment.id,
      body: comment.body || '',
      user: comment.user,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      html_url: comment.html_url,
    };
  }
}

// Factory function
export function createGitHubClient(
  token: string,
  options?: { apiUrl?: string }
): GitHubClient {
  return new GitHubClientImpl(token, options);
}
