#!/usr/bin/env node

/**
 * Version Bump Script
 * Auto-increments the patch version in package.json
 * Uses existing semver dependency from the liaison package
 */

import { readFileSync, writeFileSync } from 'fs';
import semver from 'semver';

const packageJsonPath = './package.json';

try {
  // Read current package.json
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;

  // Increment patch version using existing semver dependency
  const newVersion = semver.inc(currentVersion, 'patch');

  if (!newVersion) {
    console.error('❌ Failed to increment version');
    process.exit(1);
  }

  // Update package.json
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Output just the new version for easy parsing
  console.log(newVersion);

} catch (error) {
  console.error('❌ Version bump failed:', error.message);
  process.exit(1);
}