#!/usr/bin/env tsx

// Diagnostic script for /cody build command issues
import * as fs from 'fs';
import * as path from 'path';

console.log('=== Cody Build Diagnostic ===\n');

// Check 1: Verify file structure
console.log('1. Checking Cody directory structure...');
const codyRoot = '.cody';
const configCommands = path.join(codyRoot, 'config', 'commands');
const commandDir = path.join(codyRoot, 'command');

console.log(`   .cody directory exists: ${fs.existsSync(codyRoot)}`);
console.log(`   .cody/config/commands exists: ${fs.existsSync(configCommands)}`);
console.log(`   .cody/command exists: ${fs.existsSync(commandDir)}`);

if (fs.existsSync(configCommands)) {
  const buildCommand = path.join(configCommands, 'build.md');
  console.log(`   .cody/config/commands/build.md exists: ${fs.existsSync(buildCommand)}`);
}

if (fs.existsSync(commandDir)) {
  const buildCommandAlt = path.join(commandDir, 'build.md');
  console.log(`   .cody/command/build.md exists: ${fs.existsSync(buildCommandAlt)}`);
}

// Check 2: Feature backlog status
console.log('\n2. Checking feature backlog status...');
const featureBacklog = path.join(codyRoot, 'project', 'build', 'feature-backlog.md');
console.log(`   Feature backlog exists: ${fs.existsSync(featureBacklog)}`);

if (fs.existsSync(featureBacklog)) {
  const stats = fs.statSync(featureBacklog);
  console.log(`   Feature backlog size: ${stats.size} bytes`);
  console.log(`   Feature backlog modified: ${stats.mtime}`);
  
  const content = fs.readFileSync(featureBacklog, 'utf8');
  const lines = content.split('\n').length;
  console.log(`   Feature backlog lines: ${lines}`);
  
  // Check if it has actual content beyond template
  const hasContent = content.includes('owk-') || content.includes('| owk-');
  console.log(`   Feature backlog has actual features: ${hasContent}`);
}

// Check 3: Plan document status
console.log('\n3. Checking plan document status...');
const planDoc = path.join(codyRoot, 'project', 'plan', 'plan.md');
console.log(`   Plan document exists: ${fs.existsSync(planDoc)}`);

if (fs.existsSync(planDoc)) {
  const stats = fs.statSync(planDoc);
  console.log(`   Plan document size: ${stats.size} bytes`);
  console.log(`   Plan document modified: ${stats.mtime}`);
}

// Check 4: Template system
console.log('\n4. Checking template system...');
const templateDir = path.join(codyRoot, 'config', 'templates', 'build');
const templateFile = path.join(templateDir, 'feature-backlog.md');
console.log(`   Template directory exists: ${fs.existsSync(templateDir)}`);
console.log(`   Template file exists: ${fs.existsSync(templateFile)}`);

// Check 5: Agent configuration
console.log('\n5. Checking agent configuration...');
const agentDir = 'agents';
const builderAgent = path.join(agentDir, 'cody-builder.json');
console.log(`   Agents directory exists: ${fs.existsSync(agentDir)}`);
console.log(`   Cody builder agent exists: ${fs.existsSync(builderAgent)}`);

// Check 6: Project state
console.log('\n6. Checking project state...');
const buildDir = path.join(codyRoot, 'project', 'build');
const planDir = path.join(codyRoot, 'project', 'plan');
console.log(`   Build directory exists: ${fs.existsSync(buildDir)}`);
console.log(`   Plan directory exists: ${fs.existsSync(planDir)}`);

if (fs.existsSync(buildDir)) {
  const buildFiles = fs.readdirSync(buildDir);
  console.log(`   Build directory contents: ${buildFiles.join(', ')}`);
}

// Check 7: Current working directory and permissions
console.log('\n7. Checking environment...');
console.log(`   Current working directory: ${process.cwd()}`);
console.log(`   Node.js version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);

try {
  fs.accessSync(codyRoot, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`   .cody directory permissions: OK`);
} catch (err: any) {
  console.log(`   .cody directory permissions: ERROR - ${err.message}`);
}

console.log('\n=== Diagnostic Complete ===');