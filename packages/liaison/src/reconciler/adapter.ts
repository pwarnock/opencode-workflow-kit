/**
 * Task Backend Adapter Interface
 *
 * @deprecated This module is deprecated. Use the unified WorkItemAdapter from
 * './adapters/types' instead. The TaskBackendAdapter type is now an alias for
 * WorkItemAdapter for backwards compatibility.
 *
 * Migration guide:
 * - Import from './adapters' or './adapters/types' instead
 * - Replace TaskBackendAdapter with WorkItemAdapter
 * - Replace Task with WorkItem
 * - Replace getTask/listTasks/createTask/updateTaskStatus with getItem/listItems/createItem/updateItem
 */

import type { Task, TaskStatus, TaskFilter, CreateTaskInput } from './types';

// Re-export the new unified types for convenience
export type {
  WorkItemAdapter,
  WorkItem,
  WorkItemFilter,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemAdapterType,
  WorkItemStatus,
  AdapterCapabilities,
  Comment,
  PullRequestFilter,
} from './adapters/types';

/**
 * @deprecated Use WorkItemAdapter from './adapters/types' instead.
 * This interface is maintained for backwards compatibility only.
 */
export interface TaskBackendAdapter {
  getTask(id: string): Promise<Task | null>;
  listTasks(filters?: TaskFilter): Promise<Task[]>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<Task>;
  healthCheck(): Promise<boolean>;
  name(): string;
}
