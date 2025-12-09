import { BeadsClientImpl } from "../utils/beads.js";
import { BeadsIssue } from "../types/index.js";
import { BatchProcessor } from "../utils/BatchProcessor.js";

// Local types for sync operations - aligned with core types but with extra fields
export interface SyncOptions {
  force?: boolean;
  dryRun?: boolean;
  direction?: "bidirectional" | "cody-to-beads" | "beads-to-cody";
  since?: Date;
  batchSize?: number;
}

export interface SyncConflict {
  id: string;
  type: "data" | "timestamp" | "deletion" | "dependency";
  source: any;
  target: any;
  resolution?: "source" | "target" | "merge" | "manual";
}

export interface SyncResult {
  success: boolean;
  changes: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
  timestamp?: Date;
  issuesSynced?: number;
  prsSynced?: number;
  message?: string;
}

export interface SyncEvent {
  type: "sync.started" | "sync.completed" | "conflict.detected" | "sync.failed";
  timestamp: Date;
  data?: any;
}

export interface OpenCodeError extends Error {
  code: string;
  details?: any;
}

export const ErrorCodes = {
  SYNC_FAILED: "SYNC_FAILED",
  SYNC_IN_PROGRESS: "SYNC_IN_PROGRESS",
  CONFIG_INVALID: "CONFIG_INVALID",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",
};

// Helper function to create errors
export function createOpenCodeError(
  code: string,
  message: string,
  details?: any,
): OpenCodeError {
  const error = new Error(message) as OpenCodeError;
  error.code = code;
  error.details = details;
  return error;
}

// Real implementations using Beads

class RealEventBus {
  private listeners: Map<string, Function[]> = new Map();

  emit(event: string, data: any): void {
    const handlers = this.listeners.get(event) || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
      }
    });
  }

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}

// Simple error handler
class ErrorHandler {
  static handle(error: any, context: string): OpenCodeError {
    if (error instanceof Error && "code" in error) {
      return error as OpenCodeError;
    }
    return createOpenCodeError(
      ErrorCodes.SYNC_FAILED,
      `${context}: ${error?.message || "Unknown error"}`,
    );
  }
}

/**
 * Real Async Sync Engine with Beads Integration
 */
export class AsyncSyncEngine {
  private isRunning = false;
  private currentSync: Promise<any> | null = null;
  private beadsClient: BeadsClientImpl;
  private eventBus: any;
  private projectPath: string;
  private batchProcessor: BatchProcessor;

  constructor(config: any) {
    // Allow injection of eventBus, otherwise use default
    this.eventBus = config.eventBus || new RealEventBus();
    this.projectPath = config.beads?.projectPath || process.cwd();
    // Allow injection of beadsClient, otherwise use default
    this.beadsClient =
      config.beadsClient ||
      new BeadsClientImpl({
        projectPath: this.projectPath,
      });
    // Initialize batch processor with configurable batch size
    const batchSize = config.batchSize || 100;
    this.batchProcessor =
      config.batchProcessor ||
      new BatchProcessor(batchSize, {
        concurrency: config.concurrency || 10,
        maxRetries: config.maxRetries || 3,
        retryDelay: config.retryDelay || 1000,
      });
  }

  /**
   * Execute sync with real Beads integration
   */
  async executeSync(options: SyncOptions): Promise<SyncResult> {
    if (this.isRunning) {
      throw createOpenCodeError(
        ErrorCodes.SYNC_IN_PROGRESS,
        "Sync already in progress",
      );
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Emit sync start event
      this.eventBus.emit("sync.started", { options, timestamp: new Date() });

      // Validate options
      this.validateSyncOptions(options);

      // Execute sync based on direction
      let result: SyncResult;

      switch (options.direction || "bidirectional") {
        case "bidirectional":
          result = await this.executeBidirectionalSync(options);
          break;
        case "cody-to-beads":
          result = await this.executeCodyToBeadsSync(options);
          break;
        case "beads-to-cody":
          result = await this.executeBeadsToCodySync(options);
          break;
        default:
          throw createOpenCodeError(
            ErrorCodes.VALIDATION_ERROR,
            `Invalid sync direction: ${options.direction}`,
          );
      }

      // Add timing information
      result.duration = Date.now() - startTime;
      result.timestamp = new Date();

      // Emit sync completed event
      this.eventBus.emit("sync.completed", { result, timestamp: new Date() });

      return result;
    } catch (error) {
      const syncError = ErrorHandler.handle(
        error,
        "AsyncSyncEngine.executeSync",
      );

      this.eventBus.emit("sync.failed", {
        error: syncError,
        timestamp: new Date(),
      });

      return {
        success: false,
        changes: 0,
        issuesSynced: 0,
        prsSynced: 0,
        conflicts: [],
        errors: [syncError.message],
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Validate sync options
   */
  private validateSyncOptions(options: SyncOptions): void {
    if (!options.direction) {
      throw createOpenCodeError(
        ErrorCodes.VALIDATION_ERROR,
        "Sync direction is required",
      );
    }

    if (options.since && !(options.since instanceof Date)) {
      throw createOpenCodeError(
        ErrorCodes.VALIDATION_ERROR,
        "Since option must be a valid Date",
      );
    }

    if (
      options.batchSize !== undefined &&
      (options.batchSize < 1 || options.batchSize > 1000)
    ) {
      throw createOpenCodeError(
        ErrorCodes.VALIDATION_ERROR,
        "Batch size must be between 1 and 1000",
      );
    }
  }

  /**
   * Execute bidirectional sync between Cody and Beads
   */
  private async executeBidirectionalSync(
    options: SyncOptions,
  ): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      const getIssuesOptions = options.since
        ? { since: options.since }
        : undefined;

      // Get issues from both systems
      const [beadsIssues, codyIssues] = await Promise.all([
        this.beadsClient.getIssues(
          this.beadsClient.projectPath,
          getIssuesOptions,
        ),
        this.getCodyIssues(options), // Mock implementation for now
      ]);

      // Sync issues from Cody to Beads
      const codyToBeadsResults = await this.syncCodyToBeads(
        codyIssues,
        options,
      );

      // Sync issues from Beads to Cody
      const beadsToCodyResults = await this.syncBeadsToCody(
        beadsIssues,
        options,
      );

      const totalChanges =
        codyToBeadsResults.changes + beadsToCodyResults.changes;
      const allConflicts = [
        ...codyToBeadsResults.conflicts,
        ...beadsToCodyResults.conflicts,
      ];

      return {
        success: true,
        changes: totalChanges,
        conflicts: allConflicts,
        errors: [],
        issuesSynced:
          codyToBeadsResults.issuesSynced + beadsToCodyResults.issuesSynced,
        prsSynced: 0, // Beads doesn't track PRs separately
        duration: Date.now() - startTime,
        timestamp: new Date(),
        message: `Bidirectional sync completed: ${totalChanges} changes, ${allConflicts.length} conflicts`,
      };
    } catch (error) {
      return {
        success: false,
        changes: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
        issuesSynced: 0,
        prsSynced: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute sync from Cody to Beads
   */
  private async executeCodyToBeadsSync(
    options: SyncOptions,
  ): Promise<SyncResult> {
    try {
      const codyIssues = await this.getCodyIssues(options);
      const results = await this.syncCodyToBeads(codyIssues, options);

      return {
        success: true,
        changes: results.changes,
        conflicts: results.conflicts,
        errors: [],
        issuesSynced: results.issuesSynced,
        prsSynced: 0,
        duration: results.duration,
        timestamp: new Date(),
        message: `Cody to Beads sync completed: ${results.issuesSynced} issues synced`,
      };
    } catch (error) {
      return {
        success: false,
        changes: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
        issuesSynced: 0,
        prsSynced: 0,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute sync from Beads to Cody
   */
  private async executeBeadsToCodySync(
    options: SyncOptions,
  ): Promise<SyncResult> {
    try {
      const getIssuesOptions = options.since
        ? { since: options.since }
        : undefined;
      const beadsIssues = await this.beadsClient.getIssues(
        this.beadsClient.projectPath,
        getIssuesOptions,
      );
      const results = await this.syncBeadsToCody(beadsIssues, options);

      return {
        success: true,
        changes: results.changes,
        conflicts: results.conflicts,
        errors: [],
        issuesSynced: results.issuesSynced,
        prsSynced: 0,
        duration: results.duration,
        timestamp: new Date(),
        message: `Beads to Cody sync completed: ${results.issuesSynced} issues synced`,
      };
    } catch (error) {
      return {
        success: false,
        changes: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : "Unknown error"],
        issuesSynced: 0,
        prsSynced: 0,
        duration: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sync Cody issues to Beads using batch processing
   */
  private async syncCodyToBeads(
    codyIssues: any[],
    options: SyncOptions,
  ): Promise<{
    changes: number;
    conflicts: SyncConflict[];
    issuesSynced: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const conflicts: SyncConflict[] = [];

    // Use batch processor for efficient handling of large datasets
    const batchResult = await this.batchProcessor.process(
      codyIssues,
      async (issue: any) => {
        try {
          // Check if issue already exists in Beads
          const existingIssues = await this.beadsClient.getIssues(
            this.projectPath,
          );

          const existingIssue = existingIssues.find(
            (existing) =>
              existing.title.toLowerCase() === issue.title.toLowerCase(),
          );

          if (existingIssue) {
            // Handle conflict
            conflicts.push({
              id: `conflict-${issue.id}-${existingIssue.id}`,
              type: "data",
              source: issue,
              target: existingIssue,
              resolution: "manual",
            });
            console.log(
              `Conflict detected: ${issue.title} already exists in Beads`,
            );
            return { success: false, conflict: true };
          } else if (!options.dryRun) {
            // Create new issue in Beads
            await this.beadsClient.createIssue(this.beadsClient.projectPath, {
              title: issue.title,
              description: issue.description,
              status: issue.status,
              priority: issue.priority,
              labels: issue.labels,
              metadata: {
                source: "cody",
                cody_id: issue.id,
                synced_at: new Date().toISOString(),
              },
            });
            return { success: true, conflict: false };
          }
        } catch (error) {
          console.error(`Error syncing issue ${issue.title}:`, error);
          throw error; // Will be handled by batch processor retry logic
        }
      },
    );

    // Calculate results from batch processing
    const changes = batchResult.successes.filter(
      (result: any) => !result.conflict,
    ).length;
    const issuesSynced = batchResult.successes.filter(
      (result: any) => !result.conflict,
    ).length;

    return {
      changes,
      conflicts,
      issuesSynced,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Sync Beads issues to Cody using batch processing
   */
  private async syncBeadsToCody(
    beadsIssues: BeadsIssue[],
    options: SyncOptions,
  ): Promise<{
    changes: number;
    conflicts: SyncConflict[];
    issuesSynced: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const conflicts: SyncConflict[] = [];

    // Use batch processor for efficient handling of large datasets
    const batchResult = await this.batchProcessor.process(
      beadsIssues,
      async (issue: BeadsIssue) => {
        try {
          // Mock Cody issue creation/update
          // In real implementation, this would call Cody API
          if (!options.dryRun) {
            console.log(`Syncing Beads issue to Cody: ${issue.title}`);
            return { success: true };
          }
          return { success: false };
        } catch (error) {
          console.error(`Error syncing issue ${issue.title} to Cody:`, error);
          throw error; // Will be handled by batch processor retry logic
        }
      },
    );

    // Calculate results from batch processing
    const changes = batchResult.successes.length;
    const issuesSynced = batchResult.successes.length;

    return {
      changes,
      conflicts,
      issuesSynced,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get Cody issues (mock implementation)
   */
  private async getCodyIssues(_options: SyncOptions): Promise<any[]> {
    // Mock implementation - in real system, this would call Cody API
    return [
      {
        id: "cody-1",
        title: "Implement user authentication",
        description: "Add login functionality with OAuth2",
        status: "in_progress",
        priority: 1,
        labels: ["feature", "backend"],
      },
      {
        id: "cody-2",
        title: "Fix responsive design issues",
        description: "Mobile layout breaks on small screens",
        status: "open",
        priority: 2,
        labels: ["bug", "frontend"],
      },
    ];
  }

  /**
   * Stop sync
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.currentSync = null;
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      currentSync: this.currentSync,
    };
  }
}
