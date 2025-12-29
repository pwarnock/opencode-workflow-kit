/**
 * Beads Task Backend Adapter
 * Wrapper around the bd CLI tool
 */

import { spawn } from 'child_process';
import type { Task, TaskStatus, TaskFilter, CreateTaskInput, DependencyType, DependencyNode, ReadyOptions } from '../types';
import { TaskStatus as TS } from '../types';
import type { TaskBackendAdapter } from '../adapter';

/**
 * Extended Beads task data including dependency info
 */
interface BeadsTaskDataExtended extends BeadsTaskData {
  blocked_by?: string[];
  blocks?: string[];
  related_to?: string[];
  discovered_from?: string;
  children?: string[];
}

interface BeadsTaskData {
  id: string;
  title: string;
  description: string;
  notes?: string;
  status: string;
  priority: number;
  issue_type: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  labels?: string[];
}

// Helper to spawn a command and return its output
export async function spawnPromise(
  command: string,
  args: string[],
  options: { timeoutMs?: number; cwd?: string } = {}
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Add timeout if specified
    if (options.timeoutMs) {
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, options.timeoutMs);

      child.on('close', () => clearTimeout(timeout));
    }
  });
}

export class BeadsAdapter implements TaskBackendAdapter {
  private commandPrefix: string[] = [];

  constructor(useBunX: boolean = false) {
    this.commandPrefix = useBunX ? ['bun', 'x', 'bd'] : ['bd'];
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      const { stdout } = await spawnPromise(this.commandPrefix[0], [
        ...this.commandPrefix.slice(1),
        'list',
        `--id=${id}`,
        '--json',
      ]);
      const tasks: Array<Record<string, unknown>> = JSON.parse(stdout);
      if (tasks.length === 0) return null;
      return this.parseTask(tasks[0] as unknown as BeadsTaskData);
    } catch (err) {
      console.error(`BeadsAdapter.getTask(${id}):`, err);
      return null;
    }
  }

  async listTasks(filters?: TaskFilter): Promise<Task[]> {
    try {
      const args = ['list', '--json'];
      if (filters?.status) {
        args.push(`--status=${filters.status}`);
      }
      if (filters?.assignedTo) {
        args.push(`--assigned-to=${filters.assignedTo}`);
      }

      const { stdout } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), ...args],
        { timeoutMs: 10000 }
      );
      const tasks: Array<Record<string, unknown>> = JSON.parse(stdout);
      return tasks.map((t) => this.parseTask(t as unknown as BeadsTaskData));
    } catch (err) {
      console.error('BeadsAdapter.listTasks():', err);
      return [];
    }
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    try {
      const args = ['create', `--title=${input.title}`];
      if (input.description) {
        args.push(`--description=${this.buildDescription(input)}`);
      }
      if (input.assignedTo) {
        args.push(`--assigned-to=${input.assignedTo}`);
      }
      if (input.priority) {
        args.push(`--priority=${this.mapPriority(input.priority)}`);
      }
      if (input.tags && input.tags.length > 0) {
        args.push(`--labels=${input.tags.join(',')}`);
      }
      args.push('--json');

      const { stdout } = await spawnPromise(this.commandPrefix[0], [
        ...this.commandPrefix.slice(1),
        ...args,
      ]);
      const task = JSON.parse(stdout);
      return this.parseTask(task as unknown as BeadsTaskData);
    } catch (err) {
      throw new Error(`Failed to create task: ${err}`);
    }
  }

  async updateTaskStatus(id: string, status: TaskStatus, notes?: string): Promise<Task> {
    try {
      const args = ['update', id, `--status=${status}`];
      if (notes) {
        args.push(`--notes=${notes}`);
      }
      args.push('--json');

      const { stdout } = await spawnPromise(this.commandPrefix[0], [
        ...this.commandPrefix.slice(1),
        ...args,
      ]);
      const tasks = JSON.parse(stdout);
      // bd returns array for update command
      if (Array.isArray(tasks) && tasks.length > 0) {
        return this.parseTask(tasks[0] as unknown as BeadsTaskData);
      }
      return this.parseTask(tasks as unknown as BeadsTaskData);
    } catch (err) {
      throw new Error(`Failed to update task: ${err}`);
    }
  }

  /**
   * Build description with metadata encoding
   */
  private buildDescription(input: CreateTaskInput): string {
    let description = input.description || '';
    
    // Encode metadata in description if present
    if (input.metadata && Object.keys(input.metadata).length > 0) {
      const metadataJson = JSON.stringify(input.metadata);
      description += `\n\n<!-- METADATA: ${metadataJson} -->`;
    }
    
    return description;
  }

  /**
   * Map priority levels to BD format
   */
  private mapPriority(priority: 'low' | 'medium' | 'high' | 'critical'): string {
    const priorityMap = {
      'low': '4',
      'medium': '2', 
      'high': '1',
      'critical': '0'
    };
    return priorityMap[priority] || '2';
  }

  /**
   * Extract metadata from task description
   */
  private extractMetadata(description: string): Record<string, any> {
    // Use 's' flag to match across newlines
    const metadataMatch = description.match(/<!-- METADATA: ([\s\S]*?) -->/);
    if (metadataMatch) {
      try {
        return JSON.parse(metadataMatch[1]);
      } catch {
        return {};
      }
    }
    return {};
  }

  /**
   * Map BD status to TaskStatus enum
   */
  private mapStatus(status: string): TaskStatus {
    const statusMap: Record<string, TaskStatus> = {
      'open': TS.Open,
      'closed': TS.Closed,
      'deleted': TS.Deleted
    };
    return statusMap[status] || TS.Open;
  }

  /**
   * Map BD priority to our priority format
   */
  private mapPriorityFromBeads(priority: number): 'low' | 'medium' | 'high' | 'critical' {
    if (priority === 0) return 'critical';
    if (priority === 1) return 'high';
    if (priority === 2) return 'medium';
    return 'low';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { stdout } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), '--version'],
        { timeoutMs: 5000 }
      );
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  name(): string {
    return 'beads';
  }

  // ==========================================
  // Ready Work Methods (Beads v0.40+)
  // ==========================================

  /**
   * Get tasks that are ready to work on (no blockers)
   * Uses `bd ready` command for dependency-aware task queuing
   */
  async getReadyTasks(options?: ReadyOptions): Promise<Task[]> {
    try {
      const args = ['ready', '--json'];

      if (options?.priority !== undefined) {
        args.push(`--priority=${options.priority}`);
      }
      if (options?.limit !== undefined) {
        args.push(`--limit=${options.limit}`);
      }
      if (options?.sort) {
        args.push(`--sort=${options.sort}`);
      }

      const { stdout, exitCode } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), ...args],
        { timeoutMs: 10000 }
      );

      if (exitCode !== 0) {
        console.error('BeadsAdapter.getReadyTasks(): bd ready failed');
        return [];
      }

      const tasks: BeadsTaskData[] = JSON.parse(stdout);
      return tasks.map((t) => this.parseTask(t));
    } catch (err) {
      console.error('BeadsAdapter.getReadyTasks():', err);
      return [];
    }
  }

  /**
   * Get tasks that are currently blocked by other tasks
   * Uses `bd list` with blocked status filter
   */
  async getBlockedTasks(): Promise<Task[]> {
    try {
      const { stdout } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'list', '--status=blocked', '--json'],
        { timeoutMs: 10000 }
      );

      const tasks: BeadsTaskData[] = JSON.parse(stdout);
      return tasks.map((t) => this.parseTask(t));
    } catch (err) {
      console.error('BeadsAdapter.getBlockedTasks():', err);
      return [];
    }
  }

  // ==========================================
  // Dependency Management Methods (Beads v0.40+)
  // ==========================================

  /**
   * Add a dependency between two tasks
   * @param childId - The task that depends on another
   * @param parentId - The task being depended on
   * @param type - Type of dependency (blocks, related, parent-child, discovered-from)
   */
  async addDependency(childId: string, parentId: string, type: DependencyType = 'blocks'): Promise<void> {
    try {
      const { exitCode, stderr } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'dep', 'add', childId, parentId, '--type', type],
        { timeoutMs: 5000 }
      );

      if (exitCode !== 0) {
        throw new Error(`Failed to add dependency: ${stderr}`);
      }
    } catch (err) {
      throw new Error(`Failed to add dependency ${childId} -> ${parentId}: ${err}`);
    }
  }

  /**
   * Remove a dependency between two tasks
   */
  async removeDependency(childId: string, parentId: string): Promise<void> {
    try {
      const { exitCode, stderr } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'dep', 'remove', childId, parentId],
        { timeoutMs: 5000 }
      );

      if (exitCode !== 0) {
        throw new Error(`Failed to remove dependency: ${stderr}`);
      }
    } catch (err) {
      throw new Error(`Failed to remove dependency ${childId} -> ${parentId}: ${err}`);
    }
  }

  /**
   * Get the dependency tree for a task
   */
  async getDependencyTree(taskId: string): Promise<DependencyNode | null> {
    try {
      const { stdout, exitCode } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'dep', 'tree', taskId, '--json'],
        { timeoutMs: 10000 }
      );

      if (exitCode !== 0) {
        return null;
      }

      return JSON.parse(stdout) as DependencyNode;
    } catch (err) {
      console.error(`BeadsAdapter.getDependencyTree(${taskId}):`, err);
      return null;
    }
  }

  /**
   * Detect circular dependencies in the task graph
   */
  async detectCycles(): Promise<Array<{ cycle: string[]; message: string }>> {
    try {
      const { stdout, exitCode } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'dep', 'cycles', '--json'],
        { timeoutMs: 10000 }
      );

      if (exitCode !== 0) {
        return [];
      }

      return JSON.parse(stdout) || [];
    } catch (err) {
      console.error('BeadsAdapter.detectCycles():', err);
      return [];
    }
  }

  /**
   * Create a task with dependency information
   */
  async createTaskWithDependencies(
    input: CreateTaskInput & {
      blockedBy?: string;
      discoveredFrom?: string;
      parentId?: string;
    }
  ): Promise<Task> {
    // First create the task
    const task = await this.createTask(input);

    // Then add dependencies if specified
    if (input.blockedBy) {
      await this.addDependency(task.id, input.blockedBy, 'blocks');
    }
    if (input.discoveredFrom) {
      await this.addDependency(task.id, input.discoveredFrom, 'discovered-from');
    }
    if (input.parentId) {
      await this.addDependency(task.id, input.parentId, 'parent-child');
    }

    return task;
  }

  // ==========================================
  // Daemon & Info Methods (Beads v0.40+)
  // ==========================================

  /**
   * Get Beads system information including daemon status
   */
  async getInfo(): Promise<{
    version: string;
    daemonRunning: boolean;
    socketPath?: string;
    databasePath?: string;
  } | null> {
    try {
      const { stdout, exitCode } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), 'info', '--json'],
        { timeoutMs: 5000 }
      );

      if (exitCode !== 0) {
        return null;
      }

      const info = JSON.parse(stdout);
      return {
        version: info.version || 'unknown',
        daemonRunning: info.daemon_running || false,
        socketPath: info.socket_path,
        databasePath: info.database_path,
      };
    } catch (err) {
      console.error('BeadsAdapter.getInfo():', err);
      return null;
    }
  }

  /**
   * Get version information
   */
  async getVersion(): Promise<string> {
    try {
      const { stdout } = await spawnPromise(
        this.commandPrefix[0],
        [...this.commandPrefix.slice(1), '--version'],
        { timeoutMs: 5000 }
      );
      return stdout.trim();
    } catch {
      return 'unknown';
    }
  }

  private parseTask(data: BeadsTaskData): Task {
    const metadata = this.extractMetadata(data.description || '');
    // Use 's' flag for multiline matching, properly clean metadata comment
    const cleanDescription = data.description?.replace(/<!-- METADATA: [\s\S]*? -->\s*/, '').trim() || '';
    
    return {
      id: data.id,
      title: data.title,
      description: cleanDescription,
      status: this.mapStatus(data.status),
      createdAt: new Date(data.created_at),
      closedAt: data.closed_at ? new Date(data.closed_at) : undefined,
      priority: this.mapPriorityFromBeads(data.priority),
      tags: data.labels || [],
      metadata
    };
  }

  private parseStatus(status: string): TaskStatus {
    if (!status) return TS.Open;
    const normalized = status.toLowerCase();
    if (normalized === 'closed' || normalized === 'done') {
      return TS.Closed;
    }
    if (normalized === 'deleted') {
      return TS.Deleted;
    }
    return TS.Open;
  }
}
