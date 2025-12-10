#!/usr/bin/env bun
/**
 * Beads-Cody Integration System - TypeScript Version
 * This module provides bidirectional synchronization between Beads issue tracking
 * and Cody task management systems. Beads serves as the source of truth while
 * Cody tasklists provide visualization and workflow management.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { parseArgs } from "util";

const execAsync = promisify(exec);

// Configuration
const PROJECT_ROOT: string = '.';
const BEADS_FILE: string = join(PROJECT_ROOT, ".beads", "issues.jsonl");
const CODY_BUILD_DIR: string = join(PROJECT_ROOT, ".cody", "project", "build");
const STATE_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync-state.json");
const LOG_FILE: string = join(PROJECT_ROOT, ".beads-cody-sync.log");

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
    dependencies?: Array<Record<string, any>>;
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

interface SyncState {
    last_sync: string | null;
    beads_hash: string;
    cody_hash: string;
    last_sync_commit: string;
    conflicts_resolved: string[];
}

function log(message: string, level: "info" | "error" | "warn" = "info"): void {
    const timestamp: string = new Date().toISOString();
    const logMessage: string = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console[level](logMessage);
    try {
        writeFileSync(LOG_FILE, logMessage, { flag: "a" });
    } catch (error: unknown) {
        console.error("Failed to write to log file:", error);
    }
}

function getFileHash(filePath: string): string {
    if (!existsSync(filePath)) return "";

    try {
        const content = readFileSync(filePath);
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error: unknown) {
        log(`Error calculating hash for ${filePath}: ${error}`, "error");
        return "";
    }
}

function loadState(): SyncState {
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

function saveState(state: SyncState): void {
    try {
        writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error: unknown) {
        log(`Failed to save state: ${error}`, "error");
    }
}

function parseBeadsIssues(): BeadsIssue[] {
    if (!existsSync(BEADS_FILE)) {
        log("Beads file not found", "warn");
        return [];
    }

    try {
        const content: string = readFileSync(BEADS_FILE, "utf-8");
        const lines: string[] = content.split("\n").filter(line => line.trim());
        return lines.map(line => JSON.parse(line) as BeadsIssue);
    } catch (error: unknown) {
        log(`Failed to parse Beads issues: ${error}`, "error");
        return [];
    }
}

function generateCodyTasklist(issues: BeadsIssue[]): string {
    // Generate markdown tasklist
    let output = "# Version Tasklist – **v0.5.0 - Unified Release**\n";
    output += "This document outlines all the tasks to work on to deliver this particular version, grouped by phases.\n\n";
    output += "| Status |      |\n";
    output += "|--------|------|\n";
    output += "| 🔴 | Not Started |\n";
    output += "| 🟡 | In Progress |\n";
    output += "| 🟢 | Completed |\n\n";

    // Add progress summary
    const totalIssues = issues.length;
    const completedIssues = issues.filter(i => i.status === "closed").length;
    const inProgressIssues = issues.filter(i => i.status === "in_progress").length;
    const openIssues = issues.filter(i => i.status === "open").length;

    output += `## **Progress Summary**\n`;
    output += `**Overall Progress**: ${completedIssues}/${totalIssues} tasks complete (${Math.round((completedIssues / totalIssues) * 100)}%)\n\n`;

    // Add phases with tasks
    output += `## **Phase 1: Foundation and Architecture**\n\n`;
    output += `| ID  | Task             | Description                             | Dependencies | Status | Assigned To |\n`;
    output += `|-----|------------------|-----------------------------------------|-------------|----------|--------|\n`;

    // Map Beads issues to Cody tasks
    issues.forEach(issue => {
        const status = issue.status === "closed" ? "🟢" : issue.status === "in_progress" ? "🟡" : "🔴";
        output += `| ${issue.id} | ${issue.title} | ${issue.description || "No description"} | ${issue.dependencies ? issue.dependencies.map(d => d.depends_on_id).join(", ") : "None"} | ${status} | AGENT |\n`;
    });

    return output;
}

async function syncBeadsToCody(): Promise<{ success: boolean; message: string }> {
    try {
        log("Starting Beads to Cody sync...");

        // Parse Beads issues
        const issues = parseBeadsIssues();
        if (issues.length === 0) {
            return { success: false, message: "No Beads issues found" };
        }

        // Generate Cody tasklist
        const tasklistContent = generateCodyTasklist(issues);

        // Ensure directory exists
        const dir = join(CODY_BUILD_DIR, "..");
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // Write tasklist
        const tasklistPath = join(CODY_BUILD_DIR, "tasklist.md");
        writeFileSync(tasklistPath, tasklistContent);

        log(`Successfully generated Cody tasklist with ${issues.length} issues`, "info");
        return { success: true, message: `Synced ${issues.length} issues to Cody` };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Sync failed: ${errorMessage}`, "error");
        return { success: false, message: errorMessage };
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args.find((arg: string) => arg.startsWith("--command="))?.split("=")[1];
    const verbose = args.includes("--verbose");

    if (verbose) {
        console.log("Running in verbose mode");
    }

    if (command === "sync") {
        const result = await syncBeadsToCody();
        if (result.success) {
            console.log(`✅ ${result.message}`);
        } else {
            console.error(`❌ ${result.message}`);
            process.exit(1);
        }
    } else {
        console.error("Unknown command. Use --command=sync");
        process.exit(1);
    }
}

// Run the script
main().catch((error: unknown) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
