#!/usr/bin/env node

/**
 * Version Bump Script
 * Auto-increments the patch version in package.json without external dependencies
 */

import { readFileSync, writeFileSync } from 'fs';

const packageJsonPath = './packages/liaison/package.json';

try {
  // Read current package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  // Simple version parsing and incrementing
  const versionParts = currentVersion.split('.');
  if (versionParts.length !== 3) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  // Increment patch version (third part)
  const newPatchVersion = parseInt(versionParts[2]) + 1;
  const newVersion = `${versionParts[0]}.${versionParts[1]}.${newPatchVersion}`;

  // Update package.json
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Output just the new version for easy parsing
  console.log(newVersion);

} catch (error) {
  console.error('❌ Version bump failed:', error.message);
  process.exit(1);
}