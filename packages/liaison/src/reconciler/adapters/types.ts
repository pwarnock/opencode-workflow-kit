/**
 * Unified Work Item Adapter Types
 *
 * These types unify TaskBackendAdapter (liaison) and IssueSourceProvider (liaison-coordinator)
 * into a single abstraction for all work item backends.
 */

// Import dependency types from existing types.ts
import type { DependencyType, DependencyNode, ReadyOptions } from '../types';

export type WorkItemAdapterType = 'beads' | 'github' | 'gitlab' | 'jira' | 'linear';

export type WorkItemStatus = 'open' | 'in_progress' | 'closed' | 'deleted';

export interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  metadata?: Record<string, unknown>;
  // Source tracking
  sourceType: WorkItemAdapterType;
  sourceUrl?: string;
}

export interface WorkItemFilter {
  status?: WorkItemStatus;
  assignee?: string;
  labels?: string[];
  since?: Date;
}

export interface CreateWorkItemInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkItemInput {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface Comment {
  id: string;
  content: string;
  author?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PullRequestFilter extends WorkItemFilter {
  state?: 'open' | 'closed' | 'merged';
}

export interface AdapterCapabilities {
  supportsComments: boolean;
  supportsLabels: boolean;
  supportsMilestones: boolean;
  supportsAssignees: boolean;
  supportsPullRequests: boolean;
  supportsDependencies: boolean;
  supportsReadyQueue: boolean;
  supportsBulkOperations: boolean;
  maxBatchSize?: number;
}

export interface WorkItemAdapter {
  // === Identity ===
  readonly type: WorkItemAdapterType;
  name(): string;
  healthCheck(): Promise<boolean>;

  // === Core CRUD (required) ===
  getItem(id: string): Promise<WorkItem | null>;
  listItems(filters?: WorkItemFilter): Promise<WorkItem[]>;
  createItem(input: CreateWorkItemInput): Promise<WorkItem>;
  updateItem(id: string, update: UpdateWorkItemInput): Promise<WorkItem>;

  // === Capability Discovery ===
  capabilities(): AdapterCapabilities;

  // === Optional Extended Operations ===
  getComments?(itemId: string): Promise<Comment[]>;
  addComment?(itemId: string, content: string): Promise<Comment>;
  getLabels?(itemId: string): Promise<string[]>;
  addLabel?(itemId: string, label: string): Promise<void>;
  removeLabel?(itemId: string, label: string): Promise<void>;

  // === Pull Requests (issue trackers only) ===
  listPullRequests?(filters?: PullRequestFilter): Promise<WorkItem[]>;

  // === Dependencies (Beads v0.40+) ===
  addDependency?(childId: string, parentId: string, type: DependencyType): Promise<void>;
  removeDependency?(childId: string, parentId: string): Promise<void>;
  getDependencyTree?(itemId: string): Promise<DependencyNode | null>;
  getReadyItems?(options?: ReadyOptions): Promise<WorkItem[]>;
  getBlockedItems?(): Promise<WorkItem[]>;
}

// Re-export dependency types for convenience
export type { DependencyType, DependencyNode, ReadyOptions };

// Backwards compatibility alias
/** @deprecated Use WorkItemAdapter instead */
export type TaskBackendAdapter = WorkItemAdapter;
