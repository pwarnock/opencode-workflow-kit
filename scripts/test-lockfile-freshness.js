#!/usr/bin/env bun
/**
 * Test script to validate lockfile freshness
 * Ensures we don't ship stale lockfiles that will cause CI failures
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const LOCKFILE_PATH = 'bun.lock';
const PACKAGE_JSON_PATH = 'package.json';

function testLockfileFreshness() {
    console.log('🧪 Testing lockfile freshness...');

    // Check if lockfile exists
    if (!existsSync(LOCKFILE_PATH)) {
        console.error('❌ Lockfile not found:', LOCKFILE_PATH);
        return false;
    }

    // Check if package.json exists
    if (!existsSync(PACKAGE_JSON_PATH)) {
        console.error('❌ package.json not found:', PACKAGE_JSON_PATH);
        return false;
    }

    try {
        // Try to run bun install without frozen lockfile to check for changes
        console.log('🔍 Checking for lockfile changes...');
        const result = execSync('bun install --dry-run', { encoding: 'utf-8' });

        // If there are changes, the lockfile is stale
        if (result.includes('would be updated') || result.includes('would be changed')) {
            console.error('❌ Lockfile is stale and needs updating');
            console.log('Run: bun install (without --frozen-lockfile)');
            return false;
        }

        console.log('✅ Lockfile is fresh and up-to-date!');
        return true;

    } catch (error) {
        console.error('❌ Error checking lockfile:', error.message);
        return false;
    }
}

function main() {
    const success = testLockfileFreshness();
    if (!success) {
        console.error('💥 Lockfile freshness test failed!');
        process.exit(1);
    }
    console.log('🎉 Lockfile is valid and fresh!');
}

main();