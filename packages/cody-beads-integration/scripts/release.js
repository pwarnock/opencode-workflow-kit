#!/usr/bin/env node

/**
 * Simple release script for @pwarnock/cody-beads
 * Creates a release without complex build dependencies
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

console.log('🚀 Preparing @pwarnock/cody-beads release...');

// 1. Update version in package.json if needed
const version = process.argv[2] || packageJson.version;
if (version !== packageJson.version) {
  packageJson.version = version;
  writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  console.log(`📝 Updated version to ${version}`);
}

// 2. Create a simple test to verify CLI works
console.log('🧪 Testing CLI functionality...');
try {
  const helpOutput = execSync('node bin/cody-beads.js --help', { 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  if (helpOutput.includes('cody-beads') && helpOutput.includes('sync')) {
    console.log('✅ CLI help test passed');
  } else {
    console.log('❌ CLI help test failed');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ CLI test failed:', error.message);
  process.exit(1);
}

// 3. Create npm package
console.log('📦 Creating npm package...');
try {
  execSync('npm pack', { stdio: 'inherit' });
  console.log('✅ Package created successfully');
} catch (error) {
  console.log('❌ Package creation failed:', error.message);
  process.exit(1);
}

// 4. Test package installation
console.log('🧪 Testing package installation...');
const packageName = packageJson.name;
const packageFile = `${packageName.replace('@', '').replace('/', '-')}-${packageJson.version}.tgz`;

try {
  // Create temp directory for testing
  execSync('mkdir -p temp-test-install', { stdio: 'inherit' });
  execSync('cd temp-test-install && npm init -y', { stdio: 'inherit' });
  execSync(`cd temp-test-install && npm install ../${packageFile}`, { stdio: 'inherit' });
  
  // Test CLI from installed package
  const testOutput = execSync('cd temp-test-install && npx codybeads --help', { 
    encoding: 'utf8',
    timeout: 10000 
  });
  
  if (testOutput.includes('cody-beads') && testOutput.includes('sync')) {
    console.log('✅ Package installation test passed');
  } else {
    console.log('❌ Package installation test failed');
    process.exit(1);
  }
  
  // Cleanup
  execSync('rm -rf temp-test-install', { stdio: 'inherit' });
  
} catch (error) {
  console.log('❌ Package installation test failed:', error.message);
  execSync('rm -rf temp-test-install', { stdio: 'inherit' });
  process.exit(1);
}

console.log(`🎉 Release ${version} ready for publication!`);
console.log(`📦 Package file: ${packageFile}`);
console.log(`\n📋 To publish:`);
console.log(`   npm publish (if you have access)`);
console.log(`   or: npm publish --registry https://npm.pkg.github.com/ (for GitHub Packages)`);