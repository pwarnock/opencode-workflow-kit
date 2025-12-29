/**
 * Reconciler Adapters Module
 *
 * Re-exports all adapter types and implementations for work item backends.
 */

// Types
export type {
  WorkItemAdapterType,
  WorkItemStatus,
  WorkItem,
  WorkItemFilter,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  Comment,
  PullRequestFilter,
  AdapterCapabilities,
  WorkItemAdapter,
  TaskBackendAdapter,
  DependencyType,
  DependencyNode,
  ReadyOptions,
} from './types';

// Implementations
export { BeadsAdapter } from './beads-adapter';
export { GitHubAdapter, createGitHubAdapter } from './github-adapter';
export type { GitHubAdapterConfig } from './github-adapter';
