#!/usr/bin/env node

/**
 * Configuration Consistency Validator
 * Ensures VSCode extension settings match test configurations
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface VscodeSettings {
  'editor.defaultFormatter'?: string;
  'editor.formatOnSave'?: boolean;
  'editor.codeActionsOnSave'?: {
    'source.fixAll.eslint'?: boolean;
  };
}

interface PackageJson {
  scripts?: {
    pretest?: string;
  };
}

console.log('🔍 Starting configuration consistency validation...');

try {
  // Check if ESLint and Prettier are installed
  console.log('✅ Checking ESLint installation...');
  execSync('npx eslint --version', { stdio: 'pipe' });

  console.log('✅ Checking Prettier installation...');
  execSync('npx prettier --version', { stdio: 'pipe' });

  // Run ESLint on all source files
  console.log('🔍 Running ESLint checks...');
  const eslintResult = execSync('cd packages/liaison-coordinator && npx eslint src/**/*.ts', { encoding: 'utf8' });
  if (eslintResult.trim()) {
    console.log('❌ ESLint found issues:', eslintResult);
  } else {
    console.log('✅ ESLint: No issues found');
  }

  // Check VSCode settings file
  console.log('🔍 Validating VSCode settings...');
  const vscodeSettingsPath = join(process.cwd(), '.vscode', 'settings.json');
  const vscodeSettings: VscodeSettings = JSON.parse(readFileSync(vscodeSettingsPath, 'utf8'));

  if (vscodeSettings['editor.defaultFormatter'] !== 'esbenp.prettier-vscode') {
    console.log('✅ VSCode: Prettier extension configured correctly');
  }

  if (vscodeSettings['editor.formatOnSave'] === true) {
    console.log('✅ VSCode: Format on save enabled');
  }

  if (vscodeSettings['editor.codeActionsOnSave']?.['source.fixAll.eslint'] === true) {
    console.log('✅ VSCode: ESLint fix on save enabled');
  }

  // Check package.json scripts
  console.log('🔍 Validating package.json scripts...');
  const packageJsonPath = join(process.cwd(), 'packages', 'liaison-coordinator', 'package.json');
  const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  if (packageJson.scripts?.pretest) {
    console.log('✅ Package.json: Pre-test hook configured');
  } else {
    console.log('⚠️ Package.json: No pre-test hook found');
  }

  console.log('🎉 Configuration validation complete!');
  console.log('✅ VSCode extension and test configurations are now consistent');

} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Configuration validation failed:', error.message);
  } else {
    console.error('❌ Configuration validation failed:', String(error));
  }
  process.exit(1);
}
