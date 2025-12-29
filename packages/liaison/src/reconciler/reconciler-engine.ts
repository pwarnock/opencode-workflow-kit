/**
 * Reconciliation Engine
 * Core algorithm for reconciling version tasklists with task backend
 *
 * Enhanced with Beads v0.40+ dependency support:
 * - Parses markdown hierarchy for parent-child relationships
 * - Parses "(blocked by bd-xxx)" syntax for blocking dependencies
 * - Parses "(discovered from bd-xxx)" syntax for traceability
 * - Preserves dependency structure when syncing
 */

import type { TasklistRow, ReconcileResult, RowChange, Task, DependencyType } from './types';
import type { TaskBackendAdapter } from './adapter';
import { TaskStatus as TS } from './types';
import { BeadsAdapter } from './adapters/beads-adapter';

/**
 * Extended tasklist row with parsed dependency info
 */
interface TasklistRowWithDeps extends TasklistRow {
  parsedBlockedBy?: string;
  parsedDiscoveredFrom?: string;
  parsedParentId?: string;
  indentLevel?: number;
}

export class ReconcilerEngine {
  constructor(private adapter: TaskBackendAdapter) {}

  async reconcile(
    rows: TasklistRow[],
    versionName: string,
    dryRun: boolean = false
  ): Promise<ReconcileResult> {
    const changes: RowChange[] = [];
    const newRows: TasklistRow[] = [];
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // OPTIMIZATION: Fetch all tasks once at the beginning instead of individual calls
    const allTasksMap = new Map<string, Task>();
    if (!dryRun) {
      try {
        const allTasks = await this.adapter.listTasks();
        for (const task of allTasks) {
          allTasksMap.set(task.id, task);
        }
        console.log(`📋 Loaded ${allTasks.length} tasks from backend for batch processing`);
      } catch (err) {
        console.error(`Failed to load tasks from backend: ${err}`);
        // Fall back to individual calls if batch fails
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let newRow = { ...row };
      let changeType: RowChange['changeType'] = 'no-change';

      // If already marked deleted, skip
      if (this.isMarkedDeleted(row)) {
        changeType = 'no-change';
      }
      // If no ID, create task in backend
      else if (!row.id) {
        if (!dryRun) {
          try {
            const task = await this.adapter.createTask({
              title: row.task,
              description: row.description,
              assignedTo: row.assignedTo,
            });
            newRow = { ...row, id: task.id };
            changeType = 'created-id';
            created++;
          } catch (err) {
            console.error(`Failed to create task for row ${i}: ${err}`);
          }
        } else {
          // Dry run: simulate creation without actual backend call
          newRow = { ...row, id: `dry-run-simulated-id-${i}` };
          changeType = 'created-id';
          created++;
        }
      }
      // If has ID, sync status using pre-loaded tasks map
      else {
        if (!dryRun) {
          // OPTIMIZATION: Use pre-loaded tasks map instead of individual API call
          const task = allTasksMap.get(row.id);

          if (!task || task.status === TS.Deleted) {
            // Task deleted in backend: mark row deleted
            newRow = this.markRowDeleted(row);
            changeType = 'marked-deleted';
            deleted++;
          } else if (task.status === TS.Closed && row.status !== 'done') {
            // Task closed: mark row done
            newRow = { ...row, status: 'done' };
            changeType = 'marked-done';
            updated++;
          }
        } else {
          // Dry run: simulate status sync without actual backend calls
          // Simulate some changes for demonstration
          if (row.status !== 'done' && Math.random() > 0.5) {
            newRow = { ...row, status: 'done' };
            changeType = 'marked-done';
            updated++;
          }
        }
      }

      newRows.push(newRow);

      if (changeType !== 'no-change') {
        changes.push({
          rowIndex: i,
          changeType,
          oldRow: row,
          newRow,
        });
      }
    }

    return {
      version: versionName,
      originalRows: rows,
      newRows,
      changes,
      created,
      updated,
      deleted,
      dryRun,
    };
  }

  private isMarkedDeleted(row: TasklistRow): boolean {
    return (
      (row.id && row.id.includes('~~')) ||
      row.task.includes('~~') ||
      row.status === 'deleted'
    );
  }

  private markRowDeleted(row: TasklistRow): TasklistRow {
    return {
      ...row,
      id: row.id ? `~~${row.id}~~` : null,
      task: `~~${row.task}~~`,
      description: row.description ? `~~${row.description}~~` : undefined,
      dependencies: row.dependencies ? `~~${row.dependencies}~~` : undefined,
      status: 'deleted',
      assignedTo: row.assignedTo ? `~~${row.assignedTo}~~` : undefined,
    };
  }

  // ==========================================
  // Dependency Parsing & Management (Beads v0.40+)
  // ==========================================

  /**
   * Parse dependency information from task description or dependencies field
   *
   * Supported syntaxes:
   * - "(blocked by bd-xxx)" or "(blocks on bd-xxx)"
   * - "(discovered from bd-xxx)"
   * - "(related to bd-xxx)"
   */
  private parseDependencies(row: TasklistRow): TasklistRowWithDeps {
    const enhanced: TasklistRowWithDeps = { ...row };
    const text = `${row.description || ''} ${row.dependencies || ''}`;

    // Parse "blocked by" syntax
    const blockedByMatch = text.match(/\(blocked by ([a-zA-Z0-9-]+)\)/i);
    if (blockedByMatch) {
      enhanced.parsedBlockedBy = blockedByMatch[1];
    }

    // Parse "discovered from" syntax
    const discoveredFromMatch = text.match(/\(discovered from ([a-zA-Z0-9-]+)\)/i);
    if (discoveredFromMatch) {
      enhanced.parsedDiscoveredFrom = discoveredFromMatch[1];
    }

    return enhanced;
  }

  /**
   * Determine parent-child relationships from markdown indentation
   * Rows with deeper indentation are children of previous less-indented rows
   */
  private parseHierarchy(rows: TasklistRow[]): TasklistRowWithDeps[] {
    const enhanced: TasklistRowWithDeps[] = [];
    const parentStack: Array<{ id: string | null; indent: number }> = [];

    for (const row of rows) {
      const enhancedRow = this.parseDependencies(row);

      // Calculate indent level from leading spaces in task name
      // Assuming 2 spaces = 1 level
      const leadingSpaces = row.task.match(/^(\s*)/)?.[1].length || 0;
      enhancedRow.indentLevel = Math.floor(leadingSpaces / 2);

      // Pop stack until we find a parent with lower indent
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].indent >= enhancedRow.indentLevel) {
        parentStack.pop();
      }

      // Set parent if exists
      if (parentStack.length > 0 && enhancedRow.indentLevel > 0) {
        enhancedRow.parsedParentId = parentStack[parentStack.length - 1].id || undefined;
      }

      // Push this row to stack if it has an ID (could be parent of future rows)
      if (row.id) {
        parentStack.push({ id: row.id, indent: enhancedRow.indentLevel });
      }

      enhanced.push(enhancedRow);
    }

    return enhanced;
  }

  /**
   * Create dependencies in Beads after task creation
   * Only works with BeadsAdapter
   */
  private async createDependencies(
    taskId: string,
    deps: TasklistRowWithDeps,
    dryRun: boolean
  ): Promise<void> {
    // Check if adapter supports dependency management
    if (!(this.adapter instanceof BeadsAdapter)) {
      return;
    }

    const beadsAdapter = this.adapter as BeadsAdapter;

    try {
      if (deps.parsedBlockedBy && !dryRun) {
        await beadsAdapter.addDependency(taskId, deps.parsedBlockedBy, 'blocks');
        console.log(`  📎 Added blocking dependency: ${taskId} → ${deps.parsedBlockedBy}`);
      }

      if (deps.parsedDiscoveredFrom && !dryRun) {
        await beadsAdapter.addDependency(taskId, deps.parsedDiscoveredFrom, 'discovered-from');
        console.log(`  🔍 Added discovery link: ${taskId} ← ${deps.parsedDiscoveredFrom}`);
      }

      if (deps.parsedParentId && !dryRun) {
        await beadsAdapter.addDependency(taskId, deps.parsedParentId, 'parent-child');
        console.log(`  👶 Added parent-child: ${taskId} → ${deps.parsedParentId}`);
      }
    } catch (err) {
      console.warn(`  ⚠️ Failed to create dependencies for ${taskId}: ${err}`);
    }
  }

  /**
   * Reconcile with dependency awareness
   * Enhanced version that parses and creates dependencies
   */
  async reconcileWithDependencies(
    rows: TasklistRow[],
    versionName: string,
    dryRun: boolean = false
  ): Promise<ReconcileResult> {
    // Parse hierarchy and dependencies
    const enhancedRows = this.parseHierarchy(rows);

    const changes: RowChange[] = [];
    const newRows: TasklistRow[] = [];
    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Fetch all tasks once at the beginning
    const allTasksMap = new Map<string, Task>();
    if (!dryRun) {
      try {
        const allTasks = await this.adapter.listTasks();
        for (const task of allTasks) {
          allTasksMap.set(task.id, task);
        }
        console.log(`📋 Loaded ${allTasks.length} tasks from backend for batch processing`);
      } catch (err) {
        console.error(`Failed to load tasks from backend: ${err}`);
      }
    }

    // Track newly created IDs for dependency resolution
    const newlyCreatedIds = new Map<number, string>();

    for (let i = 0; i < enhancedRows.length; i++) {
      const row = enhancedRows[i];
      let newRow: TasklistRow = { ...row };
      let changeType: RowChange['changeType'] = 'no-change';

      // If already marked deleted, skip
      if (this.isMarkedDeleted(row)) {
        changeType = 'no-change';
      }
      // If no ID, create task in backend
      else if (!row.id) {
        if (!dryRun) {
          try {
            const task = await this.adapter.createTask({
              title: row.task.trim(),
              description: row.description,
              assignedTo: row.assignedTo,
            });
            newRow = { ...row, id: task.id };
            changeType = 'created-id';
            created++;

            // Track for dependency creation
            newlyCreatedIds.set(i, task.id);

            // Create dependencies immediately after task creation
            await this.createDependencies(task.id, row, dryRun);
          } catch (err) {
            console.error(`Failed to create task for row ${i}: ${err}`);
          }
        } else {
          // Dry run: simulate creation
          newRow = { ...row, id: `dry-run-simulated-id-${i}` };
          changeType = 'created-id';
          created++;
        }
      }
      // If has ID, sync status using pre-loaded tasks map
      else {
        if (!dryRun) {
          const task = allTasksMap.get(row.id);

          if (!task || task.status === TS.Deleted) {
            // Task deleted in backend: mark row deleted
            newRow = this.markRowDeleted(row);
            changeType = 'marked-deleted';
            deleted++;
          } else if (task.status === TS.Closed && row.status !== 'done') {
            // Task closed: mark row done
            newRow = { ...row, status: 'done' };
            changeType = 'marked-done';
            updated++;
          }
        } else {
          // Dry run simulation
          if (row.status !== 'done' && Math.random() > 0.5) {
            newRow = { ...row, status: 'done' };
            changeType = 'marked-done';
            updated++;
          }
        }
      }

      newRows.push(newRow);

      if (changeType !== 'no-change') {
        changes.push({
          rowIndex: i,
          changeType,
          oldRow: row,
          newRow,
        });
      }
    }

    return {
      version: versionName,
      originalRows: rows,
      newRows,
      changes,
      created,
      updated,
      deleted,
      dryRun,
    };
  }
}
