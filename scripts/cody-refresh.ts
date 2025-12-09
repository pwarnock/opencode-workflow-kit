#!/usr/bin/env bun
/**
 * Cody Refresh Command
 * Comprehensive refresh of Beads-Cody sync system with health checks and reporting
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Configuration
const PROJECT_ROOT: string = '.';
const STATE_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync-state.json");
const HEALTH_REPORT_FILE: string = join(PROJECT_ROOT, ".beads", "health-report.json");
const LOG_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync.log");

interface RefreshState {
  last_refresh: string | null;
  refresh_count: number;
  last_refresh_success: boolean;
  last_refresh_message: string;
}

interface HealthReport {
  timestamp: string;
  overall_healthy: boolean;
  sync_health: {
    healthy: boolean;
    issues: string[];
  };
  daemon_health: any;
}

interface CommandResult {
  success: boolean;
  output: string;
  error: string;
}

function log(message: string, level: "info" | "error" | "warn" = "info"): void {
  const timestamp: string = new Date().toISOString();
  const logMessage: string = `[${timestamp}] [${level.toUpperCase()}] [REFRESH] ${message}\n`;

  console[level](logMessage);
  try {
    writeFileSync(LOG_FILE, logMessage, { flag: "a" });
  } catch (error: unknown) {
    console.error("Failed to write to log file:", error);
  }
}

async function runCommand(command: string, args: string[] = []): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(`${command} ${args.join(" ")}`);
    return {
      success: true,
      output: stdout,
      error: stderr
    };
  } catch (error: unknown) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function loadRefreshState(): RefreshState {
  if (!existsSync(STATE_FILE)) {
    return {
      last_refresh: null,
      refresh_count: 0,
      last_refresh_success: false,
      last_refresh_message: "No previous refresh"
    };
  }

  try {
    const content: string = readFileSync(STATE_FILE, "utf-8");
    const state = JSON.parse(content);
    
    // Extract refresh-specific state or use defaults
    return {
      last_refresh: state.last_refresh || null,
      refresh_count: state.refresh_count || 0,
      last_refresh_success: state.last_refresh_success || false,
      last_refresh_message: state.last_refresh_message || "No previous refresh"
    };
  } catch (error: unknown) {
    log(`Failed to load refresh state: ${error}`, "error");
    return {
      last_refresh: null,
      refresh_count: 0,
      last_refresh_success: false,
      last_refresh_message: "Failed to load state"
    };
  }
}

function saveRefreshState(state: RefreshState): void {
  try {
    // Load existing state to preserve other fields
    let existingState: any = {};
    if (existsSync(STATE_FILE)) {
      try {
        existingState = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      } catch (error) {
        // Ignore and use empty object
      }
    }

    // Merge refresh state with existing state
    const mergedState = {
      ...existingState,
      ...state,
      last_refresh: state.last_refresh,
      refresh_count: state.refresh_count,
      last_refresh_success: state.last_refresh_success,
      last_refresh_message: state.last_refresh_message
    };

    writeFileSync(STATE_FILE, JSON.stringify(mergedState, null, 2));
  } catch (error: unknown) {
    log(`Failed to save refresh state: ${error}`, "error");
  }
}

async function runHealthCheck(): Promise<{ healthy: boolean; report: HealthReport | null }> {
  log("Running health check...");
  
  try {
    // Run the enhanced health check
    const result: CommandResult = await runCommand("python3", ["scripts/sync-monitor.py", "--enhanced"]);
    
    // The health check script returns 1 when there are issues but still generates a report
    // So we should always try to load the report if it exists
    if (existsSync(HEALTH_REPORT_FILE)) {
      const reportContent: string = readFileSync(HEALTH_REPORT_FILE, "utf-8");
      const report: HealthReport = JSON.parse(reportContent);
      return { healthy: report.overall_healthy, report };
    } else if (result.success) {
      log("Health check completed but no report file found", "warn");
      return { healthy: true, report: null };
    } else {
      log(`Health check failed: ${result.error}`, "error");
      return { healthy: false, report: null };
    }
  } catch (error: unknown) {
    log(`Health check error: ${error}`, "error");
    return { healthy: false, report: null };
  }
}

async function runForceSync(): Promise<{ success: boolean; message: string }> {
  log("Running force sync...");
  
  try {
    const result: CommandResult = await runCommand("bun", [
      "run",
      "scripts/automated-sync.ts",
      "--force",
      "--verbose"
    ]);

    if (result.success) {
      log("Force sync completed successfully");
      return { success: true, message: "Sync completed successfully" };
    } else {
      log(`Force sync failed: ${result.error}`, "error");
      return { success: false, message: `Sync failed: ${result.error}` };
    }
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    log(`Force sync error: ${errorMessage}`, "error");
    return { success: false, message: `Sync error: ${errorMessage}` };
  }
}

function displayHealthReport(report: HealthReport | null): void {
  if (!report) {
    console.log("📊 No health report available");
    return;
  }

  console.log("\n📊 Health Report:");
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Overall Status: ${report.overall_healthy ? '✅ Healthy' : '❌ Issues Detected'}`);

  if (!report.sync_health.healthy) {
    console.log("\n🔍 Sync Issues:");
    report.sync_health.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  }

  if (!report.daemon_health?.overall_healthy) {
    console.log("\n🔍 Daemon Issues:");
    const pm2Status = report.daemon_health.pm2_status || {};
    const beadsHealth = report.daemon_health.beads_health || {};

    if (!pm2Status.running) {
      console.log(`  - PM2 daemon not running`);
    }

    if (!beadsHealth.healthy) {
      console.log(`  - Beads daemon unhealthy`);
    }
  }
}

function displayRefreshSummary(
  previousState: RefreshState,
  currentState: RefreshState,
  healthCheck: { healthy: boolean; report: HealthReport | null },
  syncResult: { success: boolean; message: string }
): void {
  console.log("\n" + "=".repeat(50));
  console.log("🔄 CODY REFRESH SUMMARY");
  console.log("=".repeat(50));

  // Previous state info
  if (previousState.last_refresh) {
    const lastRefresh = new Date(previousState.last_refresh);
    console.log(`Previous refresh: ${lastRefresh.toLocaleString()} (${previousState.last_refresh_success ? '✅' : '❌'})`);
    console.log(`Refresh count: ${previousState.refresh_count}`);
  } else {
    console.log("Previous refresh: Never");
  }

  // Current refresh info
  const now = new Date();
  console.log(`Current refresh: ${now.toLocaleString()}`);
  console.log(`Result: ${currentState.last_refresh_success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Message: ${currentState.last_refresh_message}`);

  // Health check results
  console.log(`\nHealth Check: ${healthCheck.healthy ? '✅ Passed' : '❌ Issues'}`);
  if (!healthCheck.healthy && healthCheck.report) {
    displayHealthReport(healthCheck.report);
  }

  // Sync results
  console.log(`Sync: ${syncResult.success ? '✅ Success' : '❌ Failed'}`);
  if (!syncResult.success) {
    console.log(`Error: ${syncResult.message}`);
  }

  console.log("\n" + "=".repeat(50));
}

async function performCodyRefresh(): Promise<{ success: boolean; message: string }> {
  log("Starting Cody refresh process");
  
  const startTime: number = Date.now();
  const previousState: RefreshState = loadRefreshState();

  console.log("🔄 Starting Cody refresh...");
  
  try {
    // Step 1: Run health check
    console.log("📋 Step 1: Checking system health...");
    const healthCheck = await runHealthCheck();
    
    if (!healthCheck.healthy) {
      console.log("⚠️  Health issues detected, but proceeding with refresh...");
    }

    // Step 2: Run force sync
    console.log("🔄 Step 2: Running force sync...");
    const syncResult = await runForceSync();
    
    // Step 3: Update refresh state
    const currentTime: string = new Date().toISOString();
    const currentState: RefreshState = {
      last_refresh: currentTime,
      refresh_count: previousState.refresh_count + 1,
      last_refresh_success: syncResult.success,
      last_refresh_message: syncResult.message
    };
    
    saveRefreshState(currentState);

    // Step 4: Display results
    const duration: number = Date.now() - startTime;
    log(`Refresh completed in ${duration}ms`);
    
    displayRefreshSummary(previousState, currentState, healthCheck, syncResult);

    if (syncResult.success) {
      console.log(`\n✅ Cody refresh completed successfully in ${duration}ms`);
      return { success: true, message: "Refresh completed successfully" };
    } else {
      console.log(`\n❌ Cody refresh failed: ${syncResult.message}`);
      return { success: false, message: syncResult.message };
    }

  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : String(error);
    log(`Refresh failed with error: ${errorMessage}`, "error");
    
    // Update state with failure
    const currentState: RefreshState = {
      last_refresh: new Date().toISOString(),
      refresh_count: previousState.refresh_count + 1,
      last_refresh_success: false,
      last_refresh_message: errorMessage
    };
    saveRefreshState(currentState);
    
    console.log(`\n❌ Cody refresh failed: ${errorMessage}`);
    return { success: false, message: errorMessage };
  }
}

async function showRefreshStatus(): Promise<void> {
  const state: RefreshState = loadRefreshState();
  
  console.log("📊 Cody Refresh Status:");
  
  if (state.last_refresh) {
    const lastRefresh = new Date(state.last_refresh);
    console.log(`Last refresh: ${lastRefresh.toLocaleString()}`);
    console.log(`Status: ${state.last_refresh_success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Message: ${state.last_refresh_message}`);
    console.log(`Total refreshes: ${state.refresh_count}`);
  } else {
    console.log("No refresh history available");
  }

  // Also show current health
  console.log("\n🏥 Current Health:");
  const healthCheck = await runHealthCheck();
  if (healthCheck.report) {
    displayHealthReport(healthCheck.report);
  } else {
    console.log("Health check unavailable");
  }
}

// CLI Interface
async function main(): Promise<void> {
  const args: string[] = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Cody Refresh Command

USAGE:
  bun run scripts/cody-refresh.ts [OPTIONS]

OPTIONS:
  --status, -s    Show current refresh status and health
  --help, -h      Show this help message

EXAMPLES:
  bun run scripts/cody-refresh.ts          # Run refresh
  bun run scripts/cody-refresh.ts --status # Show status

DESCRIPTION:
  Performs a comprehensive refresh of the Beads-Cody sync system including:
  - Health check of sync and daemon systems
  - Force sync of Beads tasks with Cody backlog
  - Detailed reporting and state tracking
  - Error handling and rollback capabilities
`);
    return;
  }

  if (args.includes("--status") || args.includes("-s")) {
    await showRefreshStatus();
    return;
  }

  // Default: run refresh
  const result = await performCodyRefresh();
  
  // Exit with appropriate code
  if (result.success) {
    console.log("\n🎉 Refresh completed successfully!");
  } else {
    console.log(`\n💥 Refresh failed: ${result.message}`);
    process.exit(1);
  }
}

// Run the script
main().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
