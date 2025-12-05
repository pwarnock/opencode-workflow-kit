#!/usr/bin/env bun
/**
 * Simplified Bun-based Automated Beads-Cody Sync System
 * Avoids all Bun compatibility issues with process.exit()
 */

import { $ } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Configuration
const PROJECT_ROOT = '.';
const BEADS_FILE = join(PROJECT_ROOT, ".beads", "issues.jsonl");
const CODY_BACKLOG = join(PROJECT_ROOT, ".cody", "project", "build", "feature-backlog.md");
const STATE_FILE = join(PROJECT_ROOT, ".beads-cody-sync-state.json");
const LOG_FILE = join(PROJECT_ROOT, ".beads-cody-sync.log");

function log(message, level = "info") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  console[level](logMessage);
  try {
    writeFileSync(LOG_FILE, logMessage, { flag: "a" });
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

async function runCommand(command, args = []) {
  try {
    const result = await $`${command} ${args.join(" ")}`.quiet();
    return {
      success: true,
      output: result.stdout.toString(),
      error: result.stderr.toString()
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error.toString()
    };
  }
}

function getFileHash(filePath) {
  if (!existsSync(filePath)) return "";

  try {
    const content = readFileSync(filePath);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    log(`Failed to hash ${filePath}: ${error}`, "error");
    return "";
  }
}

function loadState() {
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
    const content = readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log(`Failed to load state: ${error}`, "error");
    return {
      last_sync: null,
      beads_hash: "",
      cody_hash: "",
      last_sync_commit: "",
      conflicts_resolved: [],
    };
  }
}

function saveState(state) {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    log(`Failed to save state: ${error}`, "error");
  }
}

function detectChanges() {
  const state = loadState();
  const currentBeadsHash = getFileHash(BEADS_FILE);
  const currentCodyHash = getFileHash(CODY_BACKLOG);

  const beadsChanged = currentBeadsHash !== state.beads_hash;
  const codyChanged = currentCodyHash !== state.cody_hash;

  log(`Change detection: Beads=${beadsChanged}, Cody=${codyChanged}`);
  return { beadsChanged, codyChanged };
}

async function validateSyncPreconditions() {
  // Check if we're in a git repo
  const gitCheck = await runCommand("git", ["rev-parse", "--git-dir"]);
  if (!gitCheck.success) {
    return { valid: false, message: "Not in a git repository" };
  }

  // Check if there are uncommitted changes
  const statusCheck = await runCommand("git", ["status", "--porcelain"]);
  if (statusCheck.output.trim()) {
    return { valid: false, message: "Uncommitted changes detected" };
  }

  return { valid: true, message: "Validation passed" };
}

async function runSyncWithRollback() {
  // Get current commit for rollback
  const commitCheck = await runCommand("git", ["rev-parse", "HEAD"]);
  if (!commitCheck.success) {
    return { success: false, message: `Failed to get current commit: ${commitCheck.error}` };
  }

  const currentCommit = commitCheck.output.trim();
  const backupState = loadState();
  const backupFiles = {};

  // Backup critical files
  for (const filePath of [CODY_BACKLOG]) {
    if (existsSync(filePath)) {
      backupFiles[filePath] = readFileSync(filePath, "utf-8");
    }
  }

  try {
    // Run the actual sync using Bun
    const result = await runCommand("bun", [
      "run",
      "scripts/beads-cody-sync.ts",
      "--command=sync",
      "--verbose"
    ]);

    if (!result.success) {
      throw new Error(`Sync failed: ${result.error}`);
    }

    // Validate sync results
    const validation = validateSyncResults();
    if (!validation.valid) {
      throw new Error(`Sync validation failed: ${validation.message}`);
    }

    return { success: true, message: "Sync completed successfully" };

  } catch (error) {
    const errorMessage = error.toString();
    log(`Sync failed, attempting rollback: ${errorMessage}`, "error");

    // Rollback file changes
    for (const [filePath, content] of Object.entries(backupFiles)) {
      try {
        writeFileSync(filePath, content);
      } catch (rollbackError) {
        log(`Failed to rollback ${filePath}: ${rollbackError}`, "error");
      }
    }

    // Rollback state
    saveState(backupState);

    return { success: false, message: `Sync failed and rolled back: ${errorMessage}` };
  }
}

function validateSyncResults() {
  // Check that Cody files exist and are not empty
  if (!existsSync(CODY_BACKLOG)) {
    return { valid: false, message: "Cody feature-backlog.md not created" };
  }

  const stats = existsSync(CODY_BACKLOG) ? readFileSync(CODY_BACKLOG).length : 0;
  if (stats === 0) {
    return { valid: false, message: "Cody feature-backlog.md is empty" };
  }

  // Check that the file contains expected structure
  const content = readFileSync(CODY_BACKLOG, "utf-8");
  if (!content.includes("## Backlog") || !content.includes("|")) {
    return { valid: false, message: "Cody feature-backlog.md appears malformed" };
  }

  // Validate that Beads file is still valid JSONL
  try {
    if (existsSync(BEADS_FILE)) {
      const lines = readFileSync(BEADS_FILE, "utf-8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          JSON.parse(line);
        }
      }
    }
  } catch (error) {
    return { valid: false, message: `Beads file validation failed: ${error}` };
  }

  return { valid: true, message: "Validation passed" };
}

async function autoCommitSyncChanges(message) {
  try {
    // Check what changed
    const statusCheck = await runCommand("git", ["status", "--porcelain"]);
    if (!statusCheck.output.trim()) {
      log("No changes to commit");
      return true;
    }

    // Add only sync-related files
    const syncFiles = [
      CODY_BACKLOG,
      STATE_FILE
    ];

    for (const syncFile of syncFiles) {
      if (existsSync(syncFile)) {
        await runCommand("git", ["add", syncFile]);
      }
    }

    // Commit with standardized message
    await runCommand("git", ["commit", "-m", `auto-sync: ${message}`]);

    log(`Auto-committed sync changes: ${message}`);
    return true;

  } catch (error) {
    log(`Failed to auto-commit sync changes: ${error}`, "error");
    return false;
  }
}

async function runAutomatedSync(trigger = "auto") {
  log(`Starting automated sync (trigger: ${trigger})`);

  try {
    // Validate preconditions
    const validation = await validateSyncPreconditions();
    if (!validation.valid) {
      return { success: false, message: `Preconditions failed: ${validation.message}` };
    }

    // Check if sync is needed
    const { beadsChanged, codyChanged } = detectChanges();
    if (!beadsChanged && !codyChanged) {
      log("No changes detected, skipping sync");
      return { success: true, message: "No sync needed" };
    }

    // Run sync with rollback
    const syncResult = await runSyncWithRollback();
    if (!syncResult.success) {
      return syncResult;
    }

    // Update state
    const state = loadState();
    state.last_sync = new Date().toISOString();
    state.beads_hash = getFileHash(BEADS_FILE);
    state.cody_hash = getFileHash(CODY_BACKLOG);

    // Get current commit
    try {
      const commitResult = await runCommand("git", ["rev-parse", "HEAD"]);
      if (commitResult.success) {
        state.last_sync_commit = commitResult.output.trim();
      }
    } catch (error) {
      // Ignore commit error
    }

    saveState(state);

    // Auto-commit if safe
    if (["pre-commit", "ci"].includes(trigger)) {
      await autoCommitSyncChanges(`Automated sync (${trigger})`);
    }

    log("Automated sync completed successfully");
    return { success: true, message: "Sync completed" };

  } catch (error) {
    const errorMessage = error.toString();
    log(`Automated sync failed: ${errorMessage}`, "error");
    return { success: false, message: errorMessage };
  }
}

// CLI Interface
async function main() {
  const args = Bun.argv.slice(2);
  const trigger = args.find(arg => arg.startsWith("--trigger="))?.split("=")[1] || "manual";
  const force = args.includes("--force");
  const verbose = args.includes("--verbose");

  if (verbose) {
    console.log("Running in verbose mode");
  }

  const sync = {
    runAutomatedSync,
    runSyncWithRollback: async () => {
      // Simple implementation for force mode
      return runSyncWithRollback();
    }
  };

  if (force) {
    // Force sync by bypassing change detection
    const result = await sync.runSyncWithRollback();
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error(`❌ ${result.message}`);
    }
  } else {
    const result = await sync.runAutomatedSync(trigger);
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.error(`❌ ${result.message}`);
    }
  }
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  // Don't use process.exit() - let Bun handle the exit
});

export { runAutomatedSync };
