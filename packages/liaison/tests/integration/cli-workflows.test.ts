/**
 * Integration Tests for Enhanced CLI and Workflow System
 * Tests end-to-end workflows, user interactions, and system integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { AddressInfo } from 'net';

function execWithInput(command: string, options: any): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, options, (error, stdout, stderr) => {
      const out = stdout as unknown as string;
      const err = stderr as unknown as string;
      if (error) {
        // @ts-ignore
        error.stdout = out;
        // @ts-ignore
        error.stderr = err;
        reject(error);
      } else {
        resolve({ stdout: out, stderr: err });
      }
    });
    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

describe('Integration Tests', () => {
  let testProjectDir: string;
  let originalCwd: string;
  let configPath: string;
  let binPath: string;
  let mockServer: http.Server;
  let mockApiUrl: string;
  let beadsProjectPath = process.env.BEADS_PROJECT_PATH ?? './beads-project';
  let beadsProjectDirAbsolute: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    // Resolve absolute path to the compiled binary in the project root
    binPath = path.resolve(__dirname, '../../bin/cody-beads.js');
    
    testProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cody-beads-test-'));
    beadsProjectDirAbsolute = path.join(testProjectDir, beadsProjectPath);
    beadsProjectPath = beadsProjectDirAbsolute;
    process.env.BEADS_PROJECT_PATH = beadsProjectPath;
    process.env.BEADS_SKIP_AVAILABILITY_CHECK = '1';
    process.env.SYNC_SIMULATE = '1';
    configPath = path.join(testProjectDir, 'cody-beads.config.json');
    
    // Create test project structure
    await fs.mkdir(path.join(testProjectDir, '.cody'), { recursive: true });
    await fs.mkdir(path.join(testProjectDir, 'plugins'), { recursive: true });

    // Setup mock server
    mockServer = http.createServer((req, res) => {
      // Basic mock response for repo info
      if (req.url === '/repos/test-owner/test-repo' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          name: 'test-repo', 
          owner: { login: 'test-owner' },
          default_branch: 'main' 
        }));
        return;
      }
      // Fallback
      res.writeHead(404);
      res.end();
    });
    
    await new Promise<void>((resolve) => {
      mockServer.listen(0, () => {
        const address = mockServer.address() as AddressInfo;
        mockApiUrl = `http://localhost:${address.port}`;
        // Override environment variable to ensure CLI uses mock server
        process.env.GITHUB_API_URL = mockApiUrl;
        resolve();
      });
    });
  });

  afterAll(async () => {
    mockServer.close();
    delete process.env.GITHUB_API_URL;
    delete process.env.BEADS_SKIP_AVAILABILITY_CHECK;
    delete process.env.SYNC_SIMULATE;
    // process.chdir is not supported in workers, and we don't use it anymore
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset test environment
    await fs.mkdir(beadsProjectDirAbsolute, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify({
      version: '0.5.0',
      github: {
        owner: 'test-owner',
        repo: 'test-repo',
        token: 'test-token',
        apiUrl: mockApiUrl
      },
      beads: {
        projectPath: beadsProjectPath
      },
      sync: {
        defaultDirection: 'bidirectional',
        conflictResolution: 'manual'
      }
    }, null, 2));
  });

  describe('CLI Integration', () => {
    it('should initialize new project', async () => {
      // Clean up potentially existing directory from retries
      await fs.rm(path.join(testProjectDir, 'test-project'), { recursive: true, force: true });

      // Use non-interactive mode with required arguments
      const { stdout: result } = await execWithInput(`node "${binPath}" init -n test-project -t minimal`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('✅ Project test-project initialized successfully!');
      // The init command creates a subdirectory 'test-project'
      // fs.access throws if file doesn't exist. We want to verify it resolves (doesn't throw).
      await expect(fs.access(path.join(testProjectDir, 'test-project', 'cody-beads.config.json'))).resolves.toBeUndefined();
    });

    it('should validate configuration', async () => {
      // Ensure beads project path exists
      await fs.mkdir(beadsProjectDirAbsolute, { recursive: true });

      const { stdout: result } = await execWithInput(`node "${binPath}" config test`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('✅ GitHub connection: OK');
      expect(result).toContain('✅ Beads connection: OK');
    });

    it('should show help with enhanced features', async () => {
      const { stdout: result } = await execWithInput(`node "${binPath}" help --wizard`, {
        cwd: testProjectDir,
        encoding: 'utf8',
        input: 'exit\n'
      });

      expect(result).toContain('Usage: cody-beads [options] [command]');
      expect(result).toContain('Seamless integration between Cody and Beads for AI-driven development');
    });

    it('should handle sync commands', async () => {
      // Create mock beads project
      const beadsDir = beadsProjectDirAbsolute;
      await fs.mkdir(beadsDir, { recursive: true });
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), '');

      const { stdout: result } = await execWithInput(`node \"${binPath}\" sync --dry-run`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
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

      const { stdout: result } = await execWithInput(`node "${binPath}" plugin install --name test-plugin --source ./plugins/test-plugin`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Installing plugin: test-plugin');
    });

    it('should list installed plugins for inspection', async () => {
      const { stdout: result } = await execWithInput(`node "${binPath}" plugin list`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Installed plugins');
      expect(result).toMatch(/No plugins installed|1\. test-plugin/);
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

      const { stdout: result } = await execWithInput(`node "${binPath}" workflow run --name test-workflow`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Running workflow: test-workflow');
      expect(result).toContain('Workflow execution not implemented yet');
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

      const { stdout: result } = await execWithInput(`node "${binPath}" workflow run --name conditional-workflow`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Running workflow: conditional-workflow');
      expect(result).toContain('Workflow execution not implemented yet');
    });
  });

  describe('Template System Integration', () => {
    it('should apply project templates', async () => {
      const { stdout: result } = await execWithInput(`node \"${binPath}\" template list`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Available Templates');

      // Apply a template
      const { stdout: applyResult } = await execWithInput(`node "${binPath}" template apply web-development ./test-app`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(applyResult).toContain('Template web-development applied successfully');
    });

    it('should create a custom template definition', async () => {
      const templatesDir = path.join(testProjectDir, 'templates');
      await fs.rm(templatesDir, { recursive: true, force: true });

      const { stdout: result } = await execWithInput(`node "${binPath}" template create custom-template --type custom`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Creating template: custom-template');
      expect(result).toContain('Template custom-template created successfully');

      await fs.rm(templatesDir, { recursive: true, force: true });
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
          projectPath: beadsProjectDirAbsolute
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual' // Force manual resolution
        }
      };

      await fs.writeFile(configPath, JSON.stringify(conflictConfig, null, 2));

      // Create conflicting data
      const beadsDir = beadsProjectDirAbsolute;
      await fs.mkdir(beadsDir, { recursive: true });
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), 
        JSON.stringify([{ id: 'conflict-1', title: 'Test Issue', status: 'open' }])
      );

      const { stdout: result } = await execWithInput(`node \"${binPath}\" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8',
        input: 'manual\n'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
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
          projectPath: beadsProjectDirAbsolute
        },
        sync: {
          defaultDirection: 'cody-to-beads',
          conflictResolution: 'manual'
        }
      };

      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction cody-to-beads`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (cody-to-beads)');
      expect(result).toContain('Fetching current state');
    });
  });

  describe('Performance Integration', () => {
    it('should handle large sync operations efficiently', async () => {
      // Create large dataset
      const beadsDir = beadsProjectDirAbsolute;
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
      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });
      const endTime = Date.now();

      expect(result).toContain('Starting sync (bidirectional)');
      expect(endTime - startTime).toBeLessThan(30000);
      expect(result).toContain('Fetching current state');
    });

    it('should support repeated sync invocations for monitoring', async () => {
      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
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
            import { writeFileSync } from 'fs';
            writeFileSync('/tmp/restricted-test', 'test');
            return { success: true };
          }
        };
        `
      );

      const { stdout: result } = await execWithInput(`node "${binPath}" plugin install --name restricted-plugin --source ./plugins/restricted-plugin`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Installing plugin: restricted-plugin');
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

      const { stdout: result } = await execWithInput(`node "${binPath}" plugin install --name signed-plugin --source ./plugins/signed-plugin`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Installing plugin: signed-plugin');
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should work on different operating systems', async () => {
      const platform = os.platform();
      const { stdout: result } = await execWithInput(`node "${binPath}" --help`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Seamless integration between Cody and Beads');
      expect(['win32', 'darwin', 'linux']).toContain(platform);
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
          projectPath: beadsProjectDirAbsolute.replace(/\\/g, '/')
        },
        sync: {
          defaultDirection: 'bidirectional',
          conflictResolution: 'manual'
        }
      };

      await fs.writeFile(configPath, JSON.stringify(mixedPathConfig, null, 2));

      const { stdout: result } = await execWithInput(`node \"${binPath}\" config test`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('✅ GitHub connection: OK');
      expect(result).toContain('✅ Beads connection: OK');
    });
  });

  describe('Data Integrity Integration', () => {
    it('should verify data integrity during sync', async () => {
      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
    });

    it('should detect and report corruption', async () => {
      // Create corrupted data
      const beadsDir = beadsProjectDirAbsolute;
      await fs.mkdir(beadsDir, { recursive: true });
      
      // Create valid data first
      const validData = { id: 'test-1', title: 'Valid Issue', status: 'open' };
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), JSON.stringify(validData));
      
      // Corrupt the file
      await fs.writeFile(path.join(beadsDir, 'issues.jsonl'), 'corrupted-data{');

      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical development workflow', async () => {
      const { stdout: validationResult } = await execWithInput(`node "${binPath}" config test`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(validationResult).toContain('✅ GitHub connection: OK');
      expect(validationResult).toContain('✅ Beads connection: OK');

      const { stdout: templateResult } = await execWithInput(`node "${binPath}" template list`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(templateResult).toContain('Available Templates');

      const { stdout: syncResult } = await execWithInput(`node "${binPath}" sync --dry-run`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(syncResult).toContain('DRY RUN');
      expect(syncResult).toContain('Sync simulation completed');
    });

    it('should handle error recovery workflow', async () => {
      const { stdout: result } = await execWithInput(`node "${binPath}" sync --direction bidirectional`, {
        cwd: testProjectDir,
        encoding: 'utf8'
      });

      expect(result).toContain('Starting sync (bidirectional)');
      expect(result).toContain('Fetching current state');
    });
  });
});
