/**
 * Provider Abstraction Types
 *
 * Defines a provider-agnostic interface for issue sources.
 * This allows the sync engine to work with GitHub, GitLab, Jira, or any other issue tracker.
 *
 * @deprecated Use WorkItemAdapter from @pwarnock/liaison instead.
 * This module is maintained for backwards compatibility but will be removed in v1.0.
 *
 * Migration:
 * - Replace IssueSourceProvider with WorkItemAdapter
 * - Replace NormalizedIssue with WorkItem
 * - Use AdapterBridge for backwards compatibility
 */

/**
 * Supported provider types
 */
export type IssueSourceType =
  | 'github'
  | 'gitlab'
  | 'jira'
  | 'linear'
  | 'local'
  | 'none';

/**
 * Normalized issue representation that works across all providers
 */
export interface NormalizedIssue {
  /** Provider-specific unique identifier */
  id: string;
  /** Human-readable issue number/key (e.g., "123" for GitHub, "PROJ-123" for Jira) */
  key: string;
  /** Issue title */
  title: string;
  /** Issue body/description */
  body: string;
  /** Current state */
  state: 'open' | 'closed';
  /** Labels/tags */
  labels: string[];
  /** Assignee usernames */
  assignees: string[];
  /** Milestone/sprint name */
  milestone?: string;
  /** Author username */
  author: string;
  /** Creation timestamp (ISO string) */
  createdAt: string;
  /** Last update timestamp (ISO string) */
  updatedAt: string;
  /** Closure timestamp (ISO string) */
  closedAt?: string;
  /** Web URL to view the issue */
  url: string;
  /** Comment count */
  commentCount: number;
  /** Whether this is a pull request / merge request */
  isPullRequest: boolean;
  /** Provider-specific metadata for round-trip fidelity */
  providerData?: Record<string, unknown>;
}

/**
 * Normalized comment representation
 */
export interface NormalizedComment {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
}

/**
 * Options for fetching issues
 */
export interface FetchIssuesOptions {
  /** Only fetch issues updated since this date */
  since?: Date;
  /** Filter by state */
  state?: 'open' | 'closed' | 'all';
  /** Filter by labels */
  labels?: string[];
  /** Maximum number of issues to fetch */
  limit?: number;
}

/**
 * Options for fetching pull requests / merge requests
 */
export interface FetchPullRequestsOptions {
  since?: Date;
  state?: 'open' | 'closed' | 'merged' | 'all';
  limit?: number;
}

/**
 * Input for creating a new issue
 */
export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: string;
}

/**
 * Input for updating an issue
 */
export interface UpdateIssueInput {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
  milestone?: string;
}

/**
 * Abstract interface for any issue source provider
 *
 * Implementations:
 * - GitHubProvider: GitHub Issues API
 * - GitLabProvider: GitLab Issues API (future)
 * - JiraProvider: Jira REST API (future)
 * - LinearProvider: Linear GraphQL API (future)
 * - LocalProvider: Local file-based issues (future)
 *
 * @deprecated Use WorkItemAdapter from @pwarnock/liaison instead.
 * This interface is maintained for backwards compatibility but will be removed in v1.0.
 *
 * Migration:
 * - Replace IssueSourceProvider with WorkItemAdapter
 * - Replace NormalizedIssue with WorkItem
 * - Use AdapterBridge for backwards compatibility
 */
export interface IssueSourceProvider {
  /** Provider type identifier */
  readonly type: IssueSourceType;

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Check if the provider is properly configured and accessible
   */
  healthCheck(): Promise<boolean>;

  /**
   * Fetch issues from the provider
   */
  getIssues(options?: FetchIssuesOptions): Promise<NormalizedIssue[]>;

  /**
   * Fetch pull requests / merge requests
   */
  getPullRequests(
    options?: FetchPullRequestsOptions
  ): Promise<NormalizedIssue[]>;

  /**
   * Fetch comments for an issue
   */
  getComments(issueKey: string): Promise<NormalizedComment[]>;

  /**
   * Create a new issue
   */
  createIssue(input: CreateIssueInput): Promise<NormalizedIssue>;

  /**
   * Update an existing issue
   */
  updateIssue(
    issueKey: string,
    update: UpdateIssueInput
  ): Promise<NormalizedIssue>;

  /**
   * Add a comment to an issue
   */
  createComment(issueKey: string, body: string): Promise<NormalizedComment>;

  /**
   * Update a comment
   */
  updateComment(
    issueKey: string,
    commentId: string,
    body: string
  ): Promise<NormalizedComment>;

  /**
   * Delete a comment
   */
  deleteComment(issueKey: string, commentId: string): Promise<void>;

  /**
   * Add a label to an issue
   */
  addLabel(issueKey: string, label: string): Promise<void>;

  /**
   * Remove a label from an issue
   */
  removeLabel(issueKey: string, label: string): Promise<void>;
}

/**
 * Configuration for GitHub provider
 */
export interface GitHubProviderConfig {
  type: 'github';
  owner: string;
  repo: string;
  token?: string;
  apiUrl?: string;
}

/**
 * Configuration for GitLab provider (future)
 */
export interface GitLabProviderConfig {
  type: 'gitlab';
  projectId: string;
  token?: string;
  apiUrl?: string;
}

/**
 * Configuration for Jira provider (future)
 */
export interface JiraProviderConfig {
  type: 'jira';
  host: string;
  projectKey: string;
  email: string;
  apiToken: string;
}

/**
 * Configuration for Linear provider (future)
 */
export interface LinearProviderConfig {
  type: 'linear';
  teamId: string;
  apiKey: string;
}

/**
 * Configuration for local file-based provider (future)
 */
export interface LocalProviderConfig {
  type: 'local';
  path: string;
}

/**
 * No issue source - only sync with Beads
 */
export interface NoProviderConfig {
  type: 'none';
}

/**
 * Union type of all provider configurations
 */
export type IssueSourceConfig =
  | GitHubProviderConfig
  | GitLabProviderConfig
  | JiraProviderConfig
  | LinearProviderConfig
  | LocalProviderConfig
  | NoProviderConfig;

/**
 * Factory function type for creating providers
 */
export type ProviderFactory = (
  config: IssueSourceConfig
) => IssueSourceProvider | null;
