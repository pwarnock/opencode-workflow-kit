#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🧪 Agent CLI Commands Testing\n');

// Test all agent-related CLI commands
const tests = [
  {
    name: 'List agent templates',
    command: 'opencode --list-agents',
    expectSuccess: true,
    validate: (output) => output.includes('cli-specialist') && output.includes('security-validator')
  },
  {
    name: 'Create agent with cli-specialist template',
    command: 'opencode agent create test-cli-agent --template cli-specialist',
    expectSuccess: true,
    validate: (output) => output.includes('created successfully')
  },
  {
    name: 'List created agents',
    command: 'opencode agent list',
    expectSuccess: true,
    validate: (output) => output.includes('test-cli-agent') && output.includes('cli-development')
  },
  {
    name: 'Create agent with security-validator template',
    command: 'opencode agent create test-security-agent --template security-validator',
    expectSuccess: true,
    validate: (output) => output.includes('created successfully')
  },
  {
    name: 'Create agent with invalid template',
    command: 'opencode agent create test-invalid --template nonexistent-template',
    expectSuccess: false,
    validate: (output) => output.includes('Unknown template') || output.includes('failed')
  }
];

let passed = 0;
let total = tests.length;

for (const test of tests) {
  console.log(`\n🧪 ${test.name}`);
  console.log(`Command: liaison ${test.command}`);

  try {
    const output = execSync(`bun packages/liaison/src/cli.ts ${test.command}`, {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 1024 * 1024
    });

    console.log('Output preview:', output.substring(0, 200) + (output.length > 200 ? '...' : ''));

    if (test.expectSuccess) {
      if (test.validate(output)) {
        console.log('✅ PASSED');
        passed++;
      } else {
        console.log('❌ FAILED: Validation failed');
      }
    } else {
      console.log('❌ FAILED: Expected command to fail but it succeeded');
    }

  } catch (error) {
    const output = error.stdout || error.stderr || '';

    if (!test.expectSuccess) {
      if (test.validate(output)) {
        console.log('✅ PASSED: Command failed as expected');
        passed++;
      } else {
        console.log('❌ FAILED: Command failed but validation failed');
        console.log('Error output:', output);
      }
    } else {
      console.log('❌ FAILED: Command should have succeeded');
      console.log('Error:', error.message);
      console.log('Output:', output);
    }
  }
}

// Cleanup test agents
console.log('\n🧹 Cleaning up test agents...');
try {
  execSync('rm -f .opencode/agent/test-cli-agent.json .opencode/agent/test-security-agent.json .opencode/agent/test-invalid.json', {
    encoding: 'utf8'
  });
  console.log('✅ Cleanup completed');
} catch (error) {
  console.log('⚠️ Cleanup warning:', error.message);
}

console.log(`\n📊 CLI Commands Test Results: ${passed}/${total} PASSED`);

if (passed === total) {
  console.log('🎉 ALL CLI COMMAND TESTS PASSED!');
  process.exit(0);
} else {
  console.log('❌ SOME CLI COMMAND TESTS FAILED');
  process.exit(1);
}