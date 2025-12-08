#!/usr/bin/env node

/**
 * CLI entry point for cody-beads
 */

import('../dist/cli/index.js')
  .then(({ program }) => {
    // The program will automatically parse process.argv
    // and handle the CLI execution
  })
  .catch(error => {
    console.error('Failed to load CLI:', error);
    process.exit(1);
  });