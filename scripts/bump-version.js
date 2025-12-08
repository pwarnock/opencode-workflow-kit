#!/usr/bin/env node

/**
 * Version Bump Script Wrapper
 * Calls the version bump script inside the liaison package
 * where semver is already available as a dependency
 */

import { execSync } from 'child_process';

try {
  // Run the version bump from within the liaison package directory
  // where semver is already available as a dependency
  const result = execSync('cd packages/liaison && node scripts/bump-version.js', {
    encoding: 'utf8'
  });

  console.log(result.trim());

} catch (error) {
  console.error('❌ Version bump failed:', error.message);
  process.exit(1);
}