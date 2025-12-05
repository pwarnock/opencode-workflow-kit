#!/usr/bin/env bun
/**
 * Test script to validate beads-cody-sync workflow configuration
 * Ensures the workflow uses correct file references and authentication
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const WORKFLOW_FILE = join('.github', 'workflows', 'beads-cody-sync.yml');
const AUTOMATED_SYNC_JS = join('scripts', 'automated-sync.js');
const AUTOMATED_SYNC_TS = join('scripts', 'automated-sync.ts');

function testWorkflowConfiguration() {
    console.log('🧪 Testing beads-cody-sync workflow configuration...');

    // Test 1: Check that the workflow file exists
    if (!existsSync(WORKFLOW_FILE)) {
        console.error('❌ Workflow file not found:', WORKFLOW_FILE);
        return false;
    }

    // Test 2: Read and validate workflow content
    let workflowContent;
    try {
        workflowContent = readFileSync(WORKFLOW_FILE, 'utf-8');
    } catch (error) {
        console.error('❌ Failed to read workflow file:', error);
        return false;
    }

    // Test 3: Check that workflow uses the correct JavaScript file
    if (!workflowContent.includes('scripts/automated-sync.js')) {
        console.error('❌ Workflow does not reference automated-sync.js');
        return false;
    }

    if (workflowContent.includes('scripts/automated-sync.ts')) {
        console.error('❌ Workflow still references old automated-sync.ts file');
        return false;
    }

    // Test 4: Check that workflow uses PAT_GITHUB_TOKEN for authentication
    if (!workflowContent.includes('secrets.PAT_GITHUB_TOKEN')) {
        console.error('❌ Workflow does not use PAT_GITHUB_TOKEN for authentication');
        return false;
    }

    if (workflowContent.includes('secrets.GITHUB_TOKEN')) {
        console.error('❌ Workflow still uses GITHUB_TOKEN instead of PAT_GITHUB_TOKEN');
        return false;
    }

    // Test 5: Check that workflow handles missing state file gracefully
    if (!workflowContent.includes('if [ -f ".beads-cody-sync-state.json" ]')) {
        console.error('❌ Workflow does not handle missing state file gracefully');
        return false;
    }

    // Test 6: Check that the JavaScript file actually exists
    if (!existsSync(AUTOMATED_SYNC_JS)) {
        console.error('❌ automated-sync.js file does not exist');
        return false;
    }

    console.log('✅ All workflow configuration tests passed!');
    return true;
}

function main() {
    const success = testWorkflowConfiguration();
    if (!success) {
        console.error('💥 Workflow configuration test failed!');
        process.exit(1);
    }
    console.log('🎉 Workflow configuration is valid!');
}

main();