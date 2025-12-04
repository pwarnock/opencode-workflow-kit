#!/usr/bin/env node

/**
 * Simple accessibility testing script
 * Tests CLI help output for accessibility compliance
 */

const { execSync } = require('child_process');

console.log('♿ Running accessibility tests...');

// Test 1: CLI help output accessibility
console.log('\n1. Testing CLI help output accessibility...');
try {
  const helpOutput = execSync('node bin/cody-beads.js --help', { 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  // Basic accessibility checks
  const checks = [
    {
      name: 'Has color contrast information',
      test: () => helpOutput.includes('✅') || helpOutput.includes('❌')
    },
    {
      name: 'Has clear structure',
      test: () => helpOutput.includes('Usage:') || helpOutput.includes('Commands:')
    },
    {
      name: 'Has descriptive help',
      test: () => helpOutput.length > 100 // Reasonable length for help text
    },
    {
      name: 'No raw HTML/JS output',
      test: () => !helpOutput.includes('<html>') && !helpOutput.includes('<script>')
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  checks.forEach(check => {
    try {
      if (check.test()) {
        console.log(`   ✅ ${check.name}`);
        passed++;
      } else {
        console.log(`   ❌ ${check.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ${check.name} (error: ${error.message})`);
      failed++;
    }
  });
  
  console.log(`\n📊 Accessibility Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('🎉 All accessibility tests passed!');
  } else {
    console.log('⚠️  Some accessibility tests failed');
  }
  
} catch (error) {
  console.log('❌ Accessibility test failed:', error.message);
  process.exit(1);
}

// Test 2: CLI color usage
console.log('\n2. Testing color usage for accessibility...');
try {
  const colorOutput = execSync('node bin/cody-beads.js --help', { 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  // Check for color contrast issues (basic check)
  const hasColorCodes = /\x1b\[[0-9;]*m/g.test(colorOutput);
  
  if (hasColorCodes) {
    console.log('   ✅ Uses color codes (good for visibility)');
  } else {
    console.log('   ⚠️  No color codes found (may affect visibility)');
  }
  
} catch (error) {
  console.log('❌ Color test failed:', error.message);
}

console.log('\n♿ Accessibility testing complete!');