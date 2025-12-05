#!/usr/bin/env bun
/**
 * Modern Bun-based Automated Beads-Cody Sync System
 * Replaces the old Python version with faster, more reliable Bun implementation
 */

import { $, file, glob, path, process } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Configuration
const PROJECT_ROOT: string = '.';
const BEADS_FILE: string = join(PROJECT_ROOT, ".beads", "issues.jsonl");
const CODY_BACKLOG: string = join(PROJECT_ROOT, ".cody", "project", "build", "feature-backlog.md");
const STATE_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync-state.json");
const LOG_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync.log");

interface SyncState {
  last_sync: string | null;
  beads_hash: string;
  cody_hash: string;
  last_sync_commit: string;
  conflicts_resolved: string[];
}

interface BeadsIssue {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: string;
  priority: number;
  issue_type: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  dependencies?: any[];
}

interface CodyTask {
  id: string;
  title: string;
  description: string;
  phase: string;
  version: string;
  status: string;
  priority: string;
  dependencies: string[];
  assigned_to: string;
}

interface CommandResult {
  success: boolean;
  output: string;
  error: string;
}

class AutomatedSync {
  private projectRoot: string;

  constructor(projectRoot: string = PROJECT_ROOT) {
    this.projectRoot = projectRoot;
  }

  private log(message: string, level: "info" | "error" | "warn" = "info"): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console[level](logMessage);
    try {
      writeFileSync(LOG_FILE, logMessage, { flag: "a" });
    } catch (error: unknown) {
      console.error("Failed to write to log file:", error);
    }
  }

  private async runCommand(command: string, args: string[] = []): Promise<CommandResult> {
    try {
      const result = await $`${command} ${args.join(" ")}`.quiet();
      return {
        success: true,
        output: result.stdout.toString(),
        error: result.stderr.toString()
      };
    } catch (error: unknown) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getFileHash(filePath: string): string {
    if (!existsSync(filePath)) return "";

    try {
      const content = readFileSync(filePath);
      // Use Node.js crypto instead of Bun.hash for better compatibility
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error: unknown) {
      this.log(`Failed to hash ${filePath}: ${error}`, "error");
      return "";
    }
  }

  private loadState(): SyncState {
    if (!existsSync(STATE_FILE)) {
      return {
        last_sync: null,
        beads_hash: "",
        cody_hash: "",
        last_sync_commit: "",
        conflicts_resolved: [],
      };
    }

    try {
      const content: string = readFileSync(STATE_FILE, "utf-8");
      return JSON.parse(content) as SyncState;
    } catch (error: unknown) {
      this.log(`Failed to load state: ${error}`, "error");
      return {
        last_sync: null,
        beads_hash: "",
        cody_hash: "",
        last_sync_commit: "",
        conflicts_resolved: [],
      };
    }
  }

  private saveState(state: SyncState): void {
    try {
      writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error: unknown) {
      this.log(`Failed to save state: ${error}`, "error");
    }
  }

  private detectChanges(): { beadsChanged: boolean; codyChanged: boolean } {
    const state: SyncState = this.loadState();
    const currentBeadsHash: string = this.getFileHash(BEADS_FILE);
    const currentCodyHash: string = this.getFileHash(CODY_BACKLOG);

    const beadsChanged: boolean = currentBeadsHash !== state.beads_hash;
    const codyChanged: boolean = currentCodyHash !== state.cody_hash;

    this.log(`Change detection: Beads=${beadsChanged}, Cody=${codyChanged}`);
    return { beadsChanged, codyChanged };
  }

  private async validateSyncPreconditions(): Promise<{ valid: boolean; message: string }> {
    // Check if we're in a git repo
    const gitCheck: CommandResult = await this.runCommand("git", ["rev-parse", "--git-dir"]);
    if (!gitCheck.success) {
      return { valid: false, message: "Not in a git repository" };
    }

    // Check if there are uncommitted changes
    const statusCheck: CommandResult = await this.runCommand("git", ["status", "--porcelain"]);
    if (statusCheck.output.trim()) {
      return { valid: false, message: "Uncommitted changes detected" };
    }

    return { valid: true, message: "Validation passed" };
  }

  private async runSyncWithRollback(): Promise<{ success: boolean; message: string }> {
    // Get current commit for rollback
    const commitCheck: CommandResult = await this.runCommand("git", ["rev-parse", "HEAD"]);
    if (!commitCheck.success) {
      return { success: false, message: `Failed to get current commit: ${commitCheck.error}` };
    }

    const currentCommit: string = commitCheck.output.trim();
    const backupState: SyncState = this.loadState();
    const backupFiles: Record<string, string> = {};

    // Backup critical files
    for (const filePath of [CODY_BACKLOG]) {
      if (existsSync(filePath)) {
        backupFiles[filePath] = readFileSync(filePath, "utf-8");
      }
    }

    try {
      // Run the actual sync using Bun
      const result: CommandResult = await this.runCommand("bun", [
        "run",
        "scripts/beads-cody-sync.ts",
        "--command=sync",
        "--verbose"
      ]);

      if (!result.success) {
        throw new Error(`Sync failed: ${result.error}`);
      }

      // Validate sync results
      const validation: { valid: boolean; message: string } = this.validateSyncResults();
      if (!validation.valid) {
        throw new Error(`Sync validation failed: ${validation.message}`);
      }

      return { success: true, message: "Sync completed successfully" };

    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      this.log(`Sync failed, attempting rollback: ${errorMessage}`, "error");

      // Rollback file changes
      for (const [filePath, content] of Object.entries(backupFiles)) {
        try {
          writeFileSync(filePath, content);
        } catch (rollbackError: unknown) {
          this.log(`Failed to rollback ${filePath}: ${rollbackError}`, "error");
        }
      }

      // Rollback state
      this.saveState(backupState);

      return { success: false, message: `Sync failed and rolled back: ${errorMessage}` };
    }
  }

  private validateSyncResults(): { valid: boolean; message: string } {
    // Check that Cody files exist and are not empty
    if (!existsSync(CODY_BACKLOG)) {
      return { valid: false, message: "Cody feature-backlog.md not created" };
    }

    const stats: number = file(CODY_BACKLOG).size;
    if (stats === 0) {
      return { valid: false, message: "Cody feature-backlog.md is empty" };
    }

    // Check that the file contains expected structure
    const content: string = readFileSync(CODY_BACKLOG, "utf-8");
    if (!content.includes("## Backlog") || !content.includes("|")) {
      return { valid: false, message: "Cody feature-backlog.md appears malformed" };
    }

    // Validate that Beads file is still valid JSONL
    try {
      if (existsSync(BEADS_FILE)) {
        const lines: string[] = readFileSync(BEADS_FILE, "utf-8").split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line: string = lines[i].trim();
          if (line) {
            JSON.parse(line);
          }
        }
      }
    } catch (error: unknown) {
      return { valid: false, message: `Beads file validation failed: ${error}` };
    }

    return { valid: true, message: "Validation passed" };
  }

  private async autoCommitSyncChanges(message: string): Promise<boolean> {
    try {
      // Check what changed
      const statusCheck: CommandResult = await this.runCommand("git", ["status", "--porcelain"]);
      if (!statusCheck.output.trim()) {
        this.log("No changes to commit");
        return true;
      }

      // Add only sync-related files
      const syncFiles: string[] = [
        path.relative(PROJECT_ROOT, CODY_BACKLOG),
        ".beads-cody-sync-state.json"
      ];

      for (const syncFile of syncFiles) {
        const fullPath: string = join(PROJECT_ROOT, syncFile);
        if (existsSync(fullPath)) {
          await this.runCommand("git", ["add", syncFile]);
        }
      }

      // Commit with standardized message
      await this.runCommand("git", ["commit", "-m", `auto-sync: ${message}`]);

      this.log(`Auto-committed sync changes: ${message}`);
      return true;

    } catch (error: unknown) {
      this.log(`Failed to auto-commit sync changes: ${error}`, "error");
      return false;
    }
  }

  public async runAutomatedSync(trigger: string = "auto"): Promise<{ success: boolean; message: string }> {
    this.log(`Starting automated sync (trigger: ${trigger})`);

    try {
      // Validate preconditions
      const validation: { valid: boolean; message: string } = await this.validateSyncPreconditions();
      if (!validation.valid) {
        return { success: false, message: `Preconditions failed: ${validation.message}` };
      }

      // Check if sync is needed
      const { beadsChanged, codyChanged }: { beadsChanged: boolean; codyChanged: boolean } = this.detectChanges();
      if (!beadsChanged && !codyChanged) {
        this.log("No changes detected, skipping sync");
        return { success: true, message: "No sync needed" };
      }

      // Run sync with rollback
      const syncResult: { success: boolean; message: string } = await this.runSyncWithRollback();
      if (!syncResult.success) {
        return syncResult;
      }

      // Update state
      const state: SyncState = this.loadState();
      state.last_sync = new Date().toISOString();
      state.beads_hash = this.getFileHash(BEADS_FILE);
      state.cody_hash = this.getFileHash(CODY_BACKLOG);

      // Get current commit
      try {
        const commitResult: CommandResult = await this.runCommand("git", ["rev-parse", "HEAD"]);
        if (commitResult.success) {
          state.last_sync_commit = commitResult.output.trim();
        }
      } catch (error: unknown) {
        // Ignore commit error
      }

      this.saveState(state);

      // Auto-commit if safe
      if (["pre-commit", "ci"].includes(trigger)) {
        await this.autoCommitSyncChanges(`Automated sync (${trigger})`);
      }

      this.log("Automated sync completed successfully");
      return { success: true, message: "Sync completed" };

    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : String(error);
      this.log(`Automated sync failed: ${errorMessage}`, "error");
      return { success: false, message: errorMessage };
    }
  }
}

// CLI Interface
async function main(): Promise<void> {
  const args: string[] = Bun.argv.slice(2);
  const trigger: string = args.find((arg: string) => arg.startsWith("--trigger="))?.split("=")[1] || "manual";
  const force: boolean = args.includes("--force");
  const verbose: boolean = args.includes("--verbose");

  if (verbose) {
    console.log("Running in verbose mode");
  }

  const sync: AutomatedSync = new AutomatedSync();

  if (force) {
    // Force sync by bypassing change detection
    const result: { success: boolean; message: string } = await sync['runSyncWithRollback']();
    if (result.success) {
      console.log(`✅ ${result.message}`);
      process.exit(0);
    } else {
      console.error(`❌ ${result.message}`);
      process.exit(1);
    }
  } else {
    const result: { success: boolean; message: string } = await sync.runAutomatedSync(trigger);
    if (result.success) {
      console.log(`✅ ${result.message}`);
      process.exit(0);
    } else {
      console.error(`❌ ${result.message}`);
      process.exit(1);
    }
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { AutomatedSync };
