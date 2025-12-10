import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from '../../../src/utils/config.js';
import { TestDataFactory } from './test-data-factory.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const testConfigPath = join(process.cwd(), 'test-config.json');

  beforeEach(() => {
    configManager = new ConfigManager(testConfigPath);

    // Clean up any existing test config
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe('loadConfig', () => {
    it('should load configuration from file', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
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
      const testConfigManager = new ConfigManager('./test-env-config.json');
      
      const originalToken = process.env.GITHUB_TOKEN;
      const originalPath = process.env.BEADS_PROJECT_PATH;
      const originalOwner = process.env.GITHUB_OWNER;
      const originalRepo = process.env.GITHUB_REPO;
      
      try {
        // Temporarily set global env vars
        process.env.GITHUB_TOKEN = 'env-token';
        process.env.BEADS_PROJECT_PATH = '/env/path';
        process.env.GITHUB_OWNER = 'env-owner';
        process.env.GITHUB_REPO = 'env-repo';

        // Create a base config file with minimal valid config
        const baseConfig = TestDataFactory.createMockConfig({
          github: {
            token: 'original-token',
            owner: 'original-owner',
            repo: 'original-repo',
            apiUrl: 'https://api.github.com'
          },
          beads: {
            projectPath: '/original/path',
            configPath: '.beads/beads.json',
            autoSync: false,
            syncInterval: 60
          }
        });
        
        // Write the config file
        writeFileSync('./test-env-config.json', JSON.stringify(baseConfig, null, 2));
        
        // Load the config - this should merge environment variables
        const config = await testConfigManager.loadConfig();

        expect(config.github.token).toBe('env-token');
        expect(config.beads.projectPath).toBe('/env/path');
        expect(config.github.owner).toBe('env-owner');
        expect(config.github.repo).toBe('env-repo');
      } finally {
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
        if (originalOwner) {
          process.env.GITHUB_OWNER = originalOwner;
        } else {
          delete process.env.GITHUB_OWNER;
        }
        if (originalRepo) {
          process.env.GITHUB_REPO = originalRepo;
        } else {
          delete process.env.GITHUB_REPO;
        }
        
        // Clean up test file
        if (existsSync('./test-env-config.json')) {
          unlinkSync('./test-env-config.json');
        }
      }
    });
  });

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const mockConfig = TestDataFactory.createMockConfig();

      await configManager.saveConfig(mockConfig);

      expect(existsSync(testConfigPath)).toBe(true);

      const savedConfig = JSON.parse(
        readFileSync(testConfigPath, 'utf8')
      );
      expect(savedConfig).toEqual(mockConfig);
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = './nested/dir/test-config.json';
      const nestedConfigManager = new ConfigManager(nestedPath);
      const mockConfig = TestDataFactory.createMockConfig();

      await nestedConfigManager.saveConfig(mockConfig);

      expect(existsSync(nestedPath)).toBe(true);

      // Cleanup
      unlinkSync(nestedPath);
      const { rmSync } = require('fs');
      rmSync('./nested', { recursive: true, force: true });
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const mockConfig = TestDataFactory.createMockConfig();

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
      const invalidConfig = TestDataFactory.createMockConfig({
        github: {
          token: '',
          owner: '',
          repo: '',
          apiUrl: 'https://api.github.com'
        }
      });

      const validation = configManager.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('owner'))).toBe(true);
    });

    it('should validate sync direction', () => {
      const invalidConfig = TestDataFactory.createMockConfig({
        sync: {
          defaultDirection: 'invalid-direction' as any,
          conflictResolution: 'manual',
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        }
      });

      const validation = configManager.validateConfig(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('direction'))).toBe(true);
    });
  });

  describe('getOption', () => {
    it('should get configuration option by path', async () => {
      const mockConfig = TestDataFactory.createMockConfig({
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
      const mockConfig = TestDataFactory.createMockConfig();
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      const option = await configManager.getOption('nonexistent.path');

      expect(option).toBeUndefined();
    });
  });

  describe('setOption', () => {
    it('should set configuration option by path', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
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
      // Create a mock config with valid GitHub credentials
      const mockConfig = TestDataFactory.createMockConfig();

      // Mock the loadConfig to return our test config
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      // For this test, we'll just verify that the testConfig method
      // returns the expected structure and handles the config properly
      const result = await configManager.testConfig();

      // The test should return an object with github and beads properties
      expect(result).toHaveProperty('github');
      expect(result).toHaveProperty('beads');
      expect(result).toHaveProperty('errors');

      // Since we're not actually making API calls in this test,
      // we'll just verify the structure is correct
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should test Beads connection', async () => {
      // Create config with only cody.projectId (no beads.projectPath)
      const mockConfig = TestDataFactory.createMockConfig({
        beads: {
          projectPath: undefined, // Remove projectPath to force cody project ID path
          configPath: '.beads/beads.json',
          autoSync: false,
          syncInterval: 60
        }
      });

      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      const result = await configManager.testConfig();

      expect(result.beads).toBe(true);
    });
  });
});
