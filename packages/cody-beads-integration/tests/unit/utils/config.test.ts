import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from '../../../src/utils/config.js';
import { createMockConfig } from '../../setup.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = './test-config.json';

  beforeEach(() => {
    configManager = new ConfigManager(testConfigPath);

    // Clean up any existing test config
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('loadConfig', () => {
    it('should load configuration from file', async () => {
      const mockConfig = createMockConfig();
      writeFileSync(testConfigPath, JSON.stringify(mockConfig, null, 2));

      const config = await configManager.loadConfig();

      expect(config.version).toBe(mockConfig.version);
      expect(config.github.owner).toBe(mockConfig.github.owner);
      expect(config.github.repo).toBe(mockConfig.github.repo);
    });

    it('should throw error for invalid JSON', async () => {
      writeFileSync(testConfigPath, '{ invalid json }');

      await expect(configManager.loadConfig()).rejects.toThrow();
    });

    it('should return default config when file does not exist', async () => {
      const config = await configManager.loadConfig();

      expect(config).toHaveProperty('version', '1.0.0');
      expect(config).toHaveProperty('github');
      expect(config).toHaveProperty('cody');
      expect(config).toHaveProperty('beads');
    });

    it('should merge environment variables', async () => {
      // Create a new config manager instance to avoid global env interference
      const testConfigManager = new ConfigManager('./test-env-config.json');
      
      const originalToken = process.env.GITHUB_TOKEN;
      const originalPath = process.env.BEADS_PROJECT_PATH;
      
      // Temporarily clear global env vars
      delete process.env.GITHUB_TOKEN;
      delete process.env.BEADS_PROJECT_PATH;
      
      process.env.GITHUB_TOKEN = 'env-token';
      process.env.BEADS_PROJECT_PATH = '/env/path';

      const config = await testConfigManager.loadConfig();

      expect(config.github.token).toBe('env-token');
      expect(config.beads.projectPath).toBe('/env/path');

      // Restore original values
      if (originalToken) {
        process.env.GITHUB_TOKEN = originalToken;
      } else {
        delete process.env.GITHUB_TOKEN;
      }
      if (originalPath) {
        process.env.BEADS_PROJECT_PATH = originalPath;
      } else {
        delete process.env.BEADS_PROJECT_PATH;
      }
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const mockConfig = createMockConfig();

      await configManager.saveConfig(mockConfig);

      expect(existsSync(testConfigPath)).toBe(true);

      const savedConfig = JSON.parse(
        require('fs').readFileSync(testConfigPath, 'utf8')
      );
      expect(savedConfig).toEqual(mockConfig);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = './nested/dir/test-config.json';
      const nestedConfigManager = new ConfigManager(nestedPath);
      const mockConfig = createMockConfig();

      await nestedConfigManager.saveConfig(mockConfig);

      expect(existsSync(nestedPath)).toBe(true);

      // Cleanup
      unlinkSync(nestedPath);
      require('fs').rmSync('./nested', { recursive: true, force: true });
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const mockConfig = createMockConfig();

      const validation = configManager.validateConfig(mockConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        version: '1.0.0'
        // Missing github, cody, beads sections
      };

      const validation = configManager.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate GitHub configuration', () => {
      const invalidConfig = createMockConfig({
        github: {
          owner: '',
          repo: '',
          token: ''
        }
      });

      const validation = configManager.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('github'))).toBe(true);
    });

    it('should validate sync direction', () => {
      const invalidConfig = createMockConfig({
        sync: {
          defaultDirection: 'invalid-direction'
        }
      });

      const validation = configManager.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('direction'))).toBe(true);
    });
  });

  describe('getOption', () => {
    it('should get configuration option by path', async () => {
      const mockConfig = createMockConfig({
        github: {
          token: 'secret-token'
        }
      });

      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      const token = await configManager.getOption('github.token');

      expect(token).toBe('secret-token');
      expect(configManager.loadConfig).toHaveBeenCalled();
    });

    it('should return undefined for non-existent option', async () => {
      const mockConfig = createMockConfig();
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      const option = await configManager.getOption('nonexistent.path');

      expect(option).toBeUndefined();
    });
  });

  describe('setOption', () => {
    it('should set configuration option by path', async () => {
      const mockConfig = createMockConfig();
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);
      vi.spyOn(configManager, 'saveConfig').mockResolvedValue();

      await configManager.setOption('github.token', 'new-token');

      expect(configManager.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          github: expect.objectContaining({
            token: 'new-token'
          })
        })
      );
    });
  });

  describe('testConfig', () => {
    it('should test GitHub connection', async () => {
      const mockConfig = createMockConfig();
      const mockGitHubClient = {
        getRepositories: vi.fn().mockResolvedValue([])
      };

      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      // Mock GitHub client constructor
      vi.doMock('../../../src/utils/github.js', () => ({
        GitHubClient: vi.fn(() => mockGitHubClient)
      }));

      const result = await configManager.testConfig();

      expect(result.github).toBe(true);
    });

    it('should test Beads connection', async () => {
      const mockConfig = createMockConfig();

      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      // Mock Beads client
      vi.doMock('../../../src/utils/beads.js', () => ({
        BeadsClient: vi.fn().mockImplementation(() => ({
          testConnection: vi.fn().mockResolvedValue(true)
        }))
      }));

      const result = await configManager.testConfig();

      expect(result.beads).toBe(true);
    });
  });
});