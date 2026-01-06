/**
 * Adapter Bridge
 *
 * Bridges the WorkItemAdapter interface from @pwarnock/liaison to the
 * IssueSourceProvider interface used by liaison-coordinator's sync engine.
 *
 * This enables gradual migration from IssueSourceProvider to WorkItemAdapter
 * while maintaining compatibility with existing sync logic.
 */

import type {
  WorkItemAdapter,
  WorkItem,
  WorkItemFilter,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  Comment,
  PullRequestFilter,
} from '@pwarnock/liaison';
import type {
  IssueSourceProvider,
  IssueSourceType,
  NormalizedIssue,
  NormalizedComment,
  FetchIssuesOptions,
  FetchPullRequestsOptions,
  CreateIssueInput,
  UpdateIssueInput,
} from '../providers/types.js';

/**
 * Bridge that wraps a WorkItemAdapter to implement IssueSourceProvider
 *
 * This allows the ProviderSyncEngine to work with WorkItemAdapter instances
 * while maintaining backward compatibility with existing sync logic.
 */
export class AdapterBridge implements IssueSourceProvider {
  constructor(private adapter: WorkItemAdapter) {}

  get type(): IssueSourceType {
    // Map WorkItemAdapterType to IssueSourceType
    const typeMap: Record<string, IssueSourceType> = {
      beads: 'local', // Beads is treated as local storage
      github: 'github',
      gitlab: 'gitlab',
      jira: 'jira',
      linear: 'linear',
    };
    return typeMap[this.adapter.type] || 'local';
  }

  get name(): string {
    return this.adapter.name();
  }

  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }

  async getIssues(options?: FetchIssuesOptions): Promise<NormalizedIssue[]> {
    const filter = this.convertToWorkItemFilter(options);
    const items = await this.adapter.listItems(filter);
    return items.map((item) => this.workItemToNormalizedIssue(item));
  }

  async getPullRequests(
    options?: FetchPullRequestsOptions
  ): Promise<NormalizedIssue[]> {
    // Check if adapter supports pull requests
    if (!this.adapter.listPullRequests) {
      return [];
    }

    const filter = this.convertToPullRequestFilter(options);
    const items = await this.adapter.listPullRequests(filter);
    return items.map((item) => this.workItemToNormalizedIssue(item, true));
  }

  async getComments(issueKey: string): Promise<NormalizedComment[]> {
    if (!this.adapter.getComments) {
      return [];
    }

    const comments = await this.adapter.getComments(issueKey);
    return comments.map((comment) => this.commentToNormalizedComment(comment));
  }

  async createIssue(input: CreateIssueInput): Promise<NormalizedIssue> {
    const workItemInput = this.createIssueInputToWorkItem(input);
    const created = await this.adapter.createItem(workItemInput);
    return this.workItemToNormalizedIssue(created);
  }

  async updateIssue(
    issueKey: string,
    update: UpdateIssueInput
  ): Promise<NormalizedIssue> {
    const workItemUpdate = this.updateIssueInputToWorkItem(update);
    const updated = await this.adapter.updateItem(issueKey, workItemUpdate);
    return this.workItemToNormalizedIssue(updated);
  }

  async createComment(
    issueKey: string,
    body: string
  ): Promise<NormalizedComment> {
    if (!this.adapter.addComment) {
      throw new Error(`${this.name} adapter does not support comments`);
    }

    const comment = await this.adapter.addComment(issueKey, body);
    return this.commentToNormalizedComment(comment);
  }

  async updateComment(
    _issueKey: string,
    _commentId: string,
    _body: string
  ): Promise<NormalizedComment> {
    // Most adapters don't support comment updates, provide fallback
    throw new Error(`${this.name} adapter does not support comment updates`);
  }

  async deleteComment(_issueKey: string, _commentId: string): Promise<void> {
    // Most adapters don't support comment deletion
    throw new Error(`${this.name} adapter does not support comment deletion`);
  }

  async addLabel(issueKey: string, label: string): Promise<void> {
    if (!this.adapter.addLabel) {
      throw new Error(`${this.name} adapter does not support labels`);
    }
    await this.adapter.addLabel(issueKey, label);
  }

  async removeLabel(issueKey: string, label: string): Promise<void> {
    if (!this.adapter.removeLabel) {
      throw new Error(`${this.name} adapter does not support label removal`);
    }
    await this.adapter.removeLabel(issueKey, label);
  }

  // === Conversion Helpers ===

  private convertToWorkItemFilter(
    options?: FetchIssuesOptions
  ): WorkItemFilter | undefined {
    if (!options) return undefined;

    const filter: WorkItemFilter = {};

    if (options.since) {
      filter.since = options.since;
    }

    if (options.state === 'open') {
      filter.status = 'open';
    } else if (options.state === 'closed') {
      filter.status = 'closed';
    }
    // 'all' state means no status filter

    if (options.labels && options.labels.length > 0) {
      filter.labels = options.labels;
    }

    return filter;
  }

  private convertToPullRequestFilter(
    options?: FetchPullRequestsOptions
  ): PullRequestFilter | undefined {
    if (!options) return undefined;

    const filter: PullRequestFilter = {};

    if (options.since) {
      filter.since = options.since;
    }

    if (options.state === 'open') {
      filter.status = 'open';
    } else if (options.state === 'closed' || options.state === 'merged') {
      filter.status = 'closed';
    }

    return filter;
  }

  private workItemToNormalizedIssue(
    item: WorkItem,
    isPullRequest = false
  ): NormalizedIssue {
    const result: NormalizedIssue = {
      id: item.id,
      key: item.id,
      title: item.title,
      body: item.description || '',
      state:
        item.status === 'open' || item.status === 'in_progress'
          ? 'open'
          : 'closed',
      labels: item.labels || [],
      assignees: item.assignee ? [item.assignee] : [],
      author: (item.metadata?.author as string) || '',
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      url: item.sourceUrl || '',
      commentCount: 0,
      isPullRequest,
      providerData: {
        sourceType: item.sourceType,
        priority: item.priority,
        ...item.metadata,
      },
    };

    // Only set closedAt if we have one
    if (item.closedAt) {
      result.closedAt = item.closedAt.toISOString();
    }

    // Only set milestone if we have one
    const milestone = item.metadata?.milestone as string | undefined;
    if (milestone) {
      result.milestone = milestone;
    }

    return result;
  }

  private commentToNormalizedComment(comment: Comment): NormalizedComment {
    return {
      id: comment.id,
      body: comment.content,
      author: comment.author || '',
      createdAt: comment.createdAt.toISOString(),
      updatedAt:
        comment.updatedAt?.toISOString() || comment.createdAt.toISOString(),
      url: '',
    };
  }

  private createIssueInputToWorkItem(
    input: CreateIssueInput
  ): CreateWorkItemInput {
    const result: CreateWorkItemInput = {
      title: input.title,
    };

    if (input.body) {
      result.description = input.body;
    }
    if (input.labels && input.labels.length > 0) {
      result.labels = input.labels;
    }
    if (input.assignees && input.assignees.length > 0) {
      result.assignee = input.assignees[0];
    }
    if (input.milestone) {
      result.metadata = { milestone: input.milestone };
    }

    return result;
  }

  private updateIssueInputToWorkItem(
    update: UpdateIssueInput
  ): UpdateWorkItemInput {
    const result: UpdateWorkItemInput = {};

    if (update.title !== undefined) {
      result.title = update.title;
    }
    if (update.body !== undefined) {
      result.description = update.body;
    }
    if (update.state !== undefined) {
      result.status = update.state === 'open' ? 'open' : 'closed';
    }
    if (update.labels !== undefined) {
      result.labels = update.labels;
    }
    if (update.assignees !== undefined) {
      result.assignee = update.assignees[0];
    }

    return result;
  }
}

/**
 * Create an AdapterBridge from a WorkItemAdapter
 */
export function createAdapterBridge(
  adapter: WorkItemAdapter
): IssueSourceProvider {
  return new AdapterBridge(adapter);
}

/**
 * Type guard to check if an object is a WorkItemAdapter
 */
export function isWorkItemAdapter(obj: unknown): obj is WorkItemAdapter {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.name === 'function' &&
    typeof candidate.healthCheck === 'function' &&
    typeof candidate.listItems === 'function' &&
    typeof candidate.createItem === 'function' &&
    typeof candidate.updateItem === 'function'
  );
}
