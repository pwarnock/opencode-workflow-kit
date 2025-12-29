/**
 * Reconciler type definitions
 * Shared types for task backend adapter, version tasklists, and reconciliation results
 */

export enum TaskStatus {
  Open = 'open',
  Closed = 'closed',
  Deleted = 'deleted',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: Date;
  closedAt?: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TasklistRow {
  id: string | null;
  task: string;
  description?: string;
  dependencies?: string;
  status: 'todo' | 'done' | 'deleted';
  assignedTo?: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  assignedTo?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface VersionConfig {
  path: string;
  version: string;
  tasklistPath: string;
  exists: boolean;
}

export interface RowChange {
  rowIndex: number;
  changeType: 'created-id' | 'marked-done' | 'marked-deleted' | 'no-change';
  oldRow: TasklistRow;
  newRow: TasklistRow;
}

export interface ReconcileResult {
  version: string;
  originalRows: TasklistRow[];
  newRows: TasklistRow[];
  changes: RowChange[];
  created: number;
  updated: number;
  deleted: number;
  dryRun: boolean;
}

export interface VersionMetadata {
  version: string;
  description?: string;
  createdAt?: Date;
}

// ==========================================
// Beads v0.40+ Dependency Types
// ==========================================

/**
 * Dependency types supported by Beads
 * - blocks: Task A blocks Task B from starting
 * - related: Soft relationship, no blocking
 * - parent-child: Hierarchical (epic → tasks)
 * - discovered-from: Traceability for bugs/issues found during work
 */
export type DependencyType = 'blocks' | 'related' | 'parent-child' | 'discovered-from';

/**
 * Node in a dependency tree
 */
export interface DependencyNode {
  id: string;
  title: string;
  status: string;
  priority?: number;
  dependencyType?: DependencyType;
  children: DependencyNode[];
}

/**
 * Options for getting ready tasks
 */
export interface ReadyOptions {
  /** Filter by priority level (0=critical, 1=high, 2=medium, 3=low, 4=backlog) */
  priority?: number;
  /** Maximum number of tasks to return */
  limit?: number;
  /** Sort order: 'priority' (strict) or 'hybrid' (recent by priority, old by age) */
  sort?: 'priority' | 'hybrid';
}

/**
 * Extended task with dependency information
 */
export interface TaskWithDependencies extends Task {
  /** Tasks that block this task */
  blockedBy?: string[];
  /** Tasks that this task blocks */
  blocks?: string[];
  /** Related tasks (soft relationship) */
  relatedTo?: string[];
  /** Task this was discovered from */
  discoveredFrom?: string;
  /** Child task IDs (for parent-child relationships) */
  children?: string[];
}

// ==========================================
// Agent Mail Types (Future Multi-Agent Support)
// ==========================================

/**
 * Configuration for Agent Mail coordination
 */
export interface AgentMailConfig {
  /** Agent Mail server URL (e.g., http://127.0.0.1:8765) */
  url?: string;
  /** Unique agent identifier */
  agentName?: string;
  /** Project namespace */
  projectId?: string;
  /** Whether Agent Mail is enabled */
  enabled: boolean;
}

/**
 * Result of a task reservation attempt
 */
export interface ReservationResult {
  success: boolean;
  taskId: string;
  reservedBy?: string;
  reservedAt?: Date;
  error?: string;
}

/**
 * Active task reservation
 */
export interface Reservation {
  taskId: string;
  agentName: string;
  projectId: string;
  reservedAt: Date;
  expiresAt?: Date;
}
