#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');

function runCommand(command, args = []) {
  console.log(`📦 Running: ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true
  });

  if (result.error) {
    console.error(`❌ Error executing ${command}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`❌ ${command} exited with code ${result.status}`);
    process.exit(1);
  }

  console.log(`✅ ${command} completed successfully`);
}

function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    console.log('Usage: node install-task.cjs [command] [args...]');
    console.log('Commands:');
    console.log('  install        Install Task runner');
    console.log('  install-bun    Install Bun runtime');
    console.log('  install-task    Install Task runner');
    process.exit(1);
  }

  switch (command) {
    case 'install':
      runCommand('uv', ['add', '--dev', 'task@latest']);
      break;

    case 'install-bun':
      runCommand('curl', ['-fsSL', 'https://bun.sh/install', '|', 'bash']);
      break;

    case 'install-task':
      runCommand('bunx', ['--bun', 'task@latest', '--version']);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();