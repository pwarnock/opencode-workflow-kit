#!/usr/bin/env node

/**
 * CLI entry point for cody-beads
 */

import('../dist/cli/index.js')
  .then(({ program }) => {
    // Parse and execute the CLI
    program.parseAsync(process.argv).catch(error => {
      console.error('CLI execution failed:', error);
      process.exit(1);
    });
  })
  .catch(error => {
    console.error('Failed to load CLI:', error);
    process.exit(1);
  });