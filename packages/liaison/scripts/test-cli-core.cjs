#!/usr/bin/env node

/**
 * Simple test to verify CLI functionality without complex dependencies
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing CLI core functionality...');

// Test 1: Help command
console.log('\n1. Testing help command...');
const helpChild = spawn('node', [path.join(__dirname, 'bin/cody-beads.js'), '--help'], {
  stdio: 'pipe',
  cwd: __dirname
});

let helpOutput = '';
helpChild.stdout.on('data', (data) => {
  helpOutput += data.toString();
});

helpChild.on('close', (code) => {
  if (code === 0 && helpOutput.includes('cody-beads')) {
    console.log('✅ Help command works');
  } else {
    console.log('❌ Help command failed');
  }
});

// Test 2: Version command
console.log('\n2. Testing version command...');
const versionChild = spawn('node', [path.join(__dirname, 'bin/cody-beads.js'), '--version'], {
  stdio: 'pipe',
  cwd: __dirname
});

let versionOutput = '';
versionChild.stdout.on('data', (data) => {
  versionOutput += data.toString();
});

versionChild.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Version command works');
  } else {
    console.log('❌ Version command failed');
  }
});

// Test 3: Invalid command
console.log('\n3. Testing invalid command handling...');
const invalidChild = spawn('node', [path.join(__dirname, 'bin/cody-beads.js'), 'invalid-command'], {
  stdio: 'pipe',
  cwd: __dirname
});

invalidChild.on('close', (code) => {
  if (code !== 0) {
    console.log('✅ Invalid command handled correctly');
  } else {
    console.log('❌ Invalid command not handled properly');
  }
});

console.log('\n🎯 CLI Core Functionality Test Complete!');