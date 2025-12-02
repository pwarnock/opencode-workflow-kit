/**
 * Integration Tests for Enhanced CLI and Workflow System
 * Tests end-to-end workflows, user interactions, and system integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Integration Tests', () => {
  let testProjectDir: string;
  let originalCwd: string;
  let configPath: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    testProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cody-beads-test-'));
    configPath = path.join(testProjectDir, 'cody-beads.config.json');
    
    // Create test project structure
    await fs.mkdir(path.join(testProjectDir, '.cody'), { recursive: true });
    await fs.mkdir(path.join(testProjectDir, 'plugins'), { recursive: true });
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset test environment
    await fs.writeFile(configPath, JSON.stringify({
      version: '0.5.0',
      github: {
        owner: 'test-owner',
        repo: 'test-repo',
        token: 'test-token'
      },
      beads: {
        projectPath: path.join(testProjectDir, 'beads-project')
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'newer-wins'
      }
    }, null, 2));
  });

  describe('CLI Integration', () => {
    it('should initialize new project', async () => {
      const result = execSync('node bin/cody-beads.js init --test-mode', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Project initialized successfully');
      expect(await fs.access(path.join(testProjectDir, 'cody-beads.config.json'))).resolves.toBeDefined();
    });

    it('should validate configuration', async () => {
      const result = execSync('node bin/cody-beads.js config test', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Configuration is valid');
    });

    it('should show help with enhanced features', async () => {
      const result = execSync('node bin/cody-beads.js help --wizard', {
        cwd: testProjectDir,
        encoding: 'utf8',
        input: 'exit\n'
      });

      expect(result).toContain('Interactive Help Wizard');
      expect(result).toContain('Browse command documentation');
    });

    it('should handle sync commands', async () => {
      // Create mock beads project
      const beadsDir = path.join(testProjectDir, 'beads-project');
      await fs.mkdir(beadsDir, { recursive: true });
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), '');

      const result = execSync('node bin/cody-beads.js sync --dry-run', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('DRY RUN');
      expect(result).toContain('bidirectional');
    });
  });

  describe('Plugin System Integration', () => {
    it('should install and manage plugins', async () => {
      // Create a test plugin
      const pluginDir = path.join(testProjectDir, 'plugins', 'test-plugin');
      await fs.mkdir(pluginDir, { recursive: true });
      
      const pluginManifest = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin for integration testing',
        main: 'index.js',
        permissions: ['file_read', 'config_read'],
        capabilities: ['sync', 'validate']
      };
      
      await fs.writeFile(
        path.join(pluginDir, 'package.json'),
        JSON.stringify(pluginManifest, null, 2)
      );
      
      await fs.writeFile(
        path.join(pluginDir, 'index.js'),
        `
        module.exports = {
          name: 'test-plugin',
          version: '1.0.0',
          async execute(context) {
            return { success: true, message: 'Plugin executed successfully' };
          }
        };
        `
      );

      const result = execSync('node bin/cody-beads.js plugin install --name test-plugin --source ./plugins/test-plugin', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Plugin installed successfully');
    });

    it('should validate plugin security', async () => {
      const result = execSync('node bin/cody-beads.js plugin list --validate-security', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Security validation completed');
      expect(result).toContain('Trust level: untrusted');
    });
  });

  describe('Workflow Automation Integration', () => {
    it('should execute workflow triggers', async () => {
      const workflowConfig = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Integration test workflow',
        triggers: [
          {
            id: 'file-trigger',
            type: 'file',
            config: {
              path: path.join(testProjectDir, 'trigger-file'),
              events: ['change']
            },
            enabled: true
          }
        ],
        actions: [
          {
            id: 'sync-action',
            type: 'sync',
            config: {
              direction: 'cody-to-beads',
              dryRun: true
            }
          }
        ]
      };

      const workflowPath = path.join(testProjectDir, '.cody', 'workflows', 'test-workflow.json');
      await fs.mkdir(path.dirname(workflowPath), { recursive: true });
      await fs.writeFile(workflowPath, JSON.stringify(workflowConfig, null, 2));

      // Create trigger file
      const triggerFile = path.join(testProjectDir, 'trigger-file');
      await fs.writeFile(triggerFile, 'trigger content');

      const result = execSync('node bin/cody-beads.js workflow execute test-workflow', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Workflow executed successfully');
      expect(result).toContain('Actions executed: 1');
    });

    it('should handle workflow conditions', async () => {
      const workflowConfig = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        triggers: [
          {
            id: 'time-trigger',
            type: 'schedule',
            config: { cron: '0 * * * *' }, // Every hour
            enabled: true
          }
        ],
        conditions: [
          {
            type: 'time',
            operator: 'greater_than',
            value: '09:00' // After 9 AM
          }
        ],
        actions: [
          {
            id: 'notification-action',
            type: 'notification',
            config: {
              message: 'Good morning workflow executed',
              channels: ['console']
            }
          }
        ]
      };

      const workflowPath = path.join(testProjectDir, '.cody', 'workflows', 'conditional-workflow.json');
      await fs.mkdir(path.dirname(workflowPath), { recursive: true });
      await fs.writeFile(workflowPath, JSON.stringify(workflowConfig, null, 2));

      const result = execSync('node bin/cody-beads.js workflow execute conditional-workflow', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Workflow executed successfully');
    });
  });

  describe('Template System Integration', () => {
    it('should apply project templates', async () => {
      const result = execSync('node bin/cody-beads.js template list', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Available templates:');

      // Apply a template
      const applyResult = execSync('node bin/cody-beads.js template apply web-development ./test-app', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(applyResult).toContain('Template applied successfully');
      expect(await fs.access(path.join(testProjectDir, 'test-app'))).resolves.toBeDefined();
    });

    it('should validate template compatibility', async () => {
      const result = execSync('node bin/cody-beads.js template validate web-development', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Template validation completed');
      expect(result).toContain('Compatible with current environment');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle sync conflicts gracefully', async () => {
      // Create conflicting configuration
      const conflictConfig = {
        version: '0.5.0',
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        },
        beads: {
          projectPath: path.join(testProjectDir, 'beads-project')
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual' // Force manual resolution
        }
      };

      await fs.writeFile(configPath, JSON.stringify(conflictConfig, null, 2));

      // Create conflicting data
      const beadsDir = path.join(testProjectDir, 'beads-project');
      await fs.mkdir(beadsDir, { recursive: true });
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), 
        JSON.stringify([{ id: 'conflict-1', title: 'Test Issue', status: 'open' }])
      );

      const result = execSync('node bin/cody-beads.js sync --direction bidirectional', {
        cwd: testProjectDir,
        encoding: 'utf8',
        input: 'manual\n' // Simulate manual resolution
      });

      expect(result).toContain('Conflict detected');
      expect(result).toContain('Manual resolution required');
    });

    it('should recover from network failures', async () => {
      // Configure with invalid GitHub token to simulate network failure
      const invalidConfig = {
        version: '0.5.0',
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'invalid-token'
        },
        beads: {
          projectPath: path.join(testProjectDir, 'beads-project')
        },
        sync: {
          defaultDirection: 'cody-to-beads',
          conflictResolution: 'auto'
        }
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = execSync('node bin/cody-beads.js sync --retry 3', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Retry attempt');
      expect(result).toContain('Network failure');
      expect(result).toContain('Recovery completed');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large sync operations efficiently', async () => {
      // Create large dataset
      const beadsDir = path.join(testProjectDir, 'beads-project');
      await fs.mkdir(beadsDir, { recursive: true });
      
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `issue-${i}`,
        title: `Test Issue ${i}`,
        description: `Description for test issue ${i}`,
        status: i % 2 === 0 ? 'open' : 'closed',
        priority: Math.floor(Math.random() * 5)
      }));

      await fs.writeFile(
        path.join(beadsDir, 'issues.jsonl'),
        largeDataset.map(issue => JSON.stringify(issue)).join('\n')
      );

      const startTime = Date.now();
      const result = execSync('node bin/cody-beads.js sync --batch-size 100', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });
      const endTime = Date.now();

      expect(result).toContain('Sync completed');
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(result).toContain('Items processed: 1000');
    });

    it('should monitor resource usage', async () => {
      const result = execSync('node bin/cody-beads.js sync --monitor-resources', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Resource monitoring enabled');
      expect(result).toContain('Memory usage:');
      expect(result).toContain('CPU usage:');
      expect(result).toContain('Network requests:');
    });
  });

  describe('Security Integration', () => {
    it('should enforce plugin sandboxing', async () => {
      // Create a plugin with restricted permissions
      const restrictedPluginDir = path.join(testProjectDir, 'plugins', 'restricted-plugin');
      await fs.mkdir(restrictedPluginDir, { recursive: true });
      
      const restrictedPlugin = {
        name: 'restricted-plugin',
        version: '1.0.0',
        description: 'Plugin with restricted permissions',
        main: 'index.js',
        permissions: ['file_system_write', 'network_access'], // Dangerous permissions
        capabilities: ['system_execute']
      };
      
      await fs.writeFile(
        path.join(restrictedPluginDir, 'package.json'),
        JSON.stringify(restrictedPlugin, null, 2)
      );
      
      await fs.writeFile(
        path.join(restrictedPluginDir, 'index.js'),
        `
        module.exports = {
          name: 'restricted-plugin',
          async execute(context) {
            // Try to access restricted resources
            require('fs').writeFileSync('/tmp/restricted-test', 'test');
            return { success: true };
          }
        };
        `
      );

      const result = execSync('node bin/cody-beads.js plugin install --name restricted-plugin --source ./plugins/restricted-plugin --sandbox-level maximum', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Security validation failed');
      expect(result).toContain('Dangerous permissions detected');
      expect(result).toContain('Plugin blocked');
    });

    it('should validate digital signatures', async () => {
      // Create a plugin with signature
      const signedPluginDir = path.join(testProjectDir, 'plugins', 'signed-plugin');
      await fs.mkdir(signedPluginDir, { recursive: true });
      
      const signedPlugin = {
        name: 'signed-plugin',
        version: '1.0.0',
        description: 'Plugin with digital signature',
        main: 'index.js',
        signature: 'valid-signature-12345'
      };
      
      await fs.writeFile(
        path.join(signedPluginDir, 'package.json'),
        JSON.stringify(signedPlugin, null, 2)
      );
      
      await fs.writeFile(
        path.join(signedPluginDir, 'signature.sig'),
        'digital-signature-data'
      );
      
      await fs.writeFile(
        path.join(signedPluginDir, 'index.js'),
        `
        module.exports = {
          name: 'signed-plugin',
          async execute(context) {
            return { success: true, message: 'Signed plugin executed' };
          }
        };
        `
      );

      const result = execSync('node bin/cody-beads.js plugin install --name signed-plugin --source ./plugins/signed-plugin --verify-signature', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Signature verification passed');
      expect(result).toContain('Plugin installed successfully');
      expect(result).toContain('Trust level: verified');
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should work on different operating systems', async () => {
      const platform = os.platform();
      const result = execSync('node bin/cody-beads.js --platform-info', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Platform compatibility check');
      expect(result).toContain(platform);
      
      // Check platform-specific configurations
      if (platform === 'win32') {
        expect(result).toContain('Windows configuration loaded');
      } else if (platform === 'darwin') {
        expect(result).toContain('macOS configuration loaded');
      } else {
        expect(result).toContain('Linux configuration loaded');
      }
    });

    it('should handle path separators correctly', async () => {
      const mixedPathConfig = {
        version: '0.5.0',
        github: {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'test-token'
        },
        beads: {
          projectPath: path.join(testProjectDir, 'beads-project').replace(/\\/g, '/')
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'auto'
        }
      };

      await fs.writeFile(configPath, JSON.stringify(mixedPathConfig, null, 2));

      const result = execSync('node bin/cody-beads.js config validate', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Configuration is valid');
      expect(result).not.toContain('Path separator issues');
    });
  });

  describe('Data Integrity Integration', () => {
    it('should verify data integrity during sync', async () => {
      const result = execSync('node bin/cody-beads.js sync --verify-integrity --checksum sha256', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Integrity verification enabled');
      expect(result).toContain('Checksum algorithm: SHA-256');
      expect(result).toContain('Data integrity verified');
    });

    it('should detect and report corruption', async () => {
      // Create corrupted data
      const beadsDir = path.join(testProjectDir, 'beads-project');
      await fs.mkdir(beadsDir, { recursive: true });
      
      // Create valid data first
      const validData = { id: 'test-1', title: 'Valid Issue', status: 'open' };
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), JSON.stringify(validData));
      
      // Corrupt the file
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), 'corrupted-data{');

      const result = execSync('node bin/cody-beads.js sync --verify-integrity', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Data corruption detected');
      expect(result).toContain('Integrity check failed');
      expect(result).toContain('Checksum mismatch');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical development workflow', async () => {
      // 1. Initialize project
      execSync('node bin/cody-beads.js init --template web-development my-app', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      // 2. Configure GitHub integration
      execSync('node bin/cody-beads.js config set github.token test-token', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      // 3. Configure Beads integration
      execSync('node bin/cody-beads.js config set beads.projectPath ./beads-project', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      // 4. Validate configuration
      const validationResult = execSync('node bin/cody-beads.js config test', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(validationResult).toContain('Configuration is valid');

      // 5. Perform initial sync
      const syncResult = execSync('node bin/cody-beads.js sync --dry-run', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(syncResult).toContain('DRY RUN');
      expect(syncResult).toContain('Sync simulation completed');
    });

    it('should handle error recovery workflow', async () => {
      // Simulate error conditions and recovery
      const result = execSync('node bin/cody-beads.js sync --simulate-errors --auto-recover', {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Error simulation enabled');
      expect(result).toContain('Auto-recovery activated');
      expect(result).toContain('Recovery strategies applied');
      expect(result).toContain('Workflow completed despite errors');
    });
  });
});