import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

test.describe('CLI Workflows', () => {
  const testDir = './test-temp-cli';
  const cliPath = './bin/cody-beads.js';

  test.beforeEach(async () => {
    // Clean up any existing test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    // Create test directory
    execSync(`mkdir -p ${testDir}`, { stdio: 'inherit' });
  });

  test.afterEach(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should show help information', async ({ page }) => {
    // Test CLI help command
    const result = execSync(`node ${cliPath} --help`, {
      encoding: 'utf8'
    });

    expect(result).toContain('cody-beads');
    expect(result).toContain('sync');
    expect(result).toContain('config');
    expect(result).toContain('template');
    expect(result).toContain('version');
  });

  test('should initialize configuration interactively', async ({ page }) => {
    // Test interactive configuration setup
    // This would require simulating user input or using a test fixture

    const configPath = join(testDir, 'cody-beads.config.json');

    // Mock interactive responses
    const result = execSync(`echo -e "test-owner\\ntest-repo\\ntest-token\\n" | node ${cliPath} config setup`, {
      encoding: 'utf8'
    });

    expect(result).toContain('Setting up cody-beads configuration');
  });

  test('should list available templates', async () => {
    const result = execSync(`node ${cliPath} template list`, {
      encoding: 'utf8'
    });

    expect(result).toContain('Available Templates');
    expect(result).toContain('minimal');
    expect(result).toContain('web-development');
    expect(result).toContain('python-development');
  });

  test('should apply template and create project', async () => {
    const projectName = 'test-project';
    const projectDir = join(testDir, projectName);

    execSync(`node ${cliPath} template apply minimal --output ${projectDir}`, {
      encoding: 'utf8'
    });

    expect(existsSync(projectDir)).toBe(true);
    expect(existsSync(join(projectDir, 'package.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'README.md'))).toBe(true);
  });

  test('should handle sync with dry run', async () => {
    // Create a mock configuration
    const config = {
      version: '1.0.0',
      github: {
        owner: 'test-owner',
        repo: 'test-repo',
        token: 'test-token'
      },
      beads: {
        projectPath: './test-beads'
      }
    };

    const configPath = join(testDir, 'cody-beads.config.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const result = execSync(`node ${cliPath} sync --dry-run`, {
      encoding: 'utf8'
    });

    expect(result).toContain('dry run');
    expect(result).toContain('would be synced');
  });

  test('should show error for invalid configuration', async () => {
    // Test with invalid configuration
    const configPath = join(testDir, 'cody-beads.config.json');
    writeFileSync(configPath, '{ invalid json }');

    const result = execSync(`node ${cliPath} config test 2>&1 || true`, {
      encoding: 'utf8'
    });

    expect(result).toContain('error');
    expect(result).toContain('invalid');
  });

  test('should version operations work correctly', async () => {
    // Test version add
    execSync(`node ${cliPath} version add "Test Version" --features "test features"`, {
      encoding: 'utf8'
    });

    const versionsDir = join(testDir, 'versions');
    expect(existsSync(versionsDir)).toBe(true);

    // Test version list
    const result = execSync(`node ${cliPath} version list`, {
      encoding: 'utf8'
    });

    expect(result).toContain('Available Versions');
    expect(result).toContain('Test Version');
  });
});

test.describe('Error Handling', () => {
  const cliPath = './bin/cody-beads.js';

  test('should handle missing configuration gracefully', async () => {
    const testDir = './test-temp-errors';

    try {
      const result = execSync(`node ${cliPath} sync 2>&1 || true`, {
        encoding: 'utf8'
      });

      expect(result).toContain('Configuration not found');
      expect(result).toContain('cody-beads config setup');
    } finally {
      // Cleanup
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    }
  });

  test('should handle network errors gracefully', async () => {
    // This would require mocking network failures
    // For now, just test that CLI handles timeouts
    const config = {
      version: '1.0.0',
      github: {
        owner: 'nonexistent-owner',
        repo: 'nonexistent-repo',
        token: 'invalid-token'
      },
      beads: {
        projectPath: './test-beads'
      }
    };

    const testDir = './test-temp-network';
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }

    execSync(`mkdir -p ${testDir}`);

    try {
      const configPath = join(testDir, 'cody-beads.config.json');
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const result = execSync(`node ${cliPath} sync --timeout 5000 2>&1 || true`, {
        encoding: 'utf8'
      });

      expect(result).toContain('error');
      expect(result).toContain('timeout');
    } finally {
      // Cleanup
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    }
  });
});