#!/usr/bin/env node

/**
 * Simple BDD test that works with current setup
 */

const { spawn } = require('child_process');

console.log('🧪 Running simple BDD test...');

// Test basic CLI functionality
const child = spawn('node', ['bin/cody-beads.js', '--help'], {
  stdio: 'pipe',
  cwd: process.cwd()
});

let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
});

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('Output length:', output.length);
  
  if (code === 0 && output.includes('cody-beads') && output.includes('sync')) {
    console.log('✅ BDD test passed - CLI help works correctly');
  } else {
    console.log('❌ BDD test failed');
    console.log('Output preview:', output.substring(0, 200));
    process.exit(1);
  }
});