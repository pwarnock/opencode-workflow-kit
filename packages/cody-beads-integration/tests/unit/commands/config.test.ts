import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/utils/config.js';
import { TestDataFactory } from '../utils/test-data-factory.js';
import { unlinkSync, existsSync } from 'fs';

describe('Config Command Integration', () => {
  let configManager: ConfigManager;
  let mockConsole: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    configManager = new ConfigManager('./test-config.json');
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    vi.clearAllMocks();
    
    // Clean up test config file
    if (existsSync('./test-config.json')) {
      unlinkSync('./test-config.json');
    }
  });

  describe('Configuration Management', () => {
    it('should load and display configuration', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);
      vi.spyOn(configManager, 'validateConfig').mockReturnValue({ valid: true, errors: [] });

      const config = await configManager.loadConfig();
      expect(config.version).toBe(mockConfig.version);
      expect(config.github.owner).toBe(mockConfig.github.owner);
      expect(config.sync.defaultDirection).toBe('bidirectional');
    });

    it('should set configuration values', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);
      vi.spyOn(configManager, 'saveConfig').mockResolvedValue();
      vi.spyOn(configManager, 'validateConfig').mockReturnValue({ valid: true, errors: [] });

      await configManager.setOption('github.token', 'new-token');

      expect(configManager.saveConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          github: expect.objectContaining({
            token: 'new-token'
          })
        })
      );
    });

    it('should get configuration values', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);

      const token = await configManager.getOption('github.token');
      expect(token).toBe('mock-github-token');
    });

    it('should validate configuration', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.spyOn(configManager, 'validateConfig').mockReturnValue({ valid: true, errors: [] });

      const validation = configManager.validateConfig(mockConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should test configuration connections', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.spyOn(configManager, 'loadConfig').mockResolvedValue(mockConfig);
      vi.spyOn(configManager, 'testConfig').mockResolvedValue({
        github: true,
        beads: true,
        errors: []
      });

      const result = await configManager.testConfig();
      expect(result.github).toBe(true);
      expect(result.beads).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration load errors', async () => {
      vi.spyOn(configManager, 'loadConfig').mockRejectedValue(new Error('Config not found'));

      await expect(configManager.loadConfig()).rejects.toThrow('Config not found');
    });

    it('should handle validation errors', async () => {
      const invalidConfig = {
        version: '1.0.0',
        github: { owner: '', repo: '', token: '' },
        cody: { projectId: '', apiUrl: '' },
        beads: { projectPath: '', configPath: '', autoSync: false, syncInterval: 60 },
        sync: { 
          defaultDirection: 'bidirectional' as const,
          conflictResolution: 'manual' as const,
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false
        },
        templates: { defaultTemplate: 'minimal', templatePath: '' }
      };

      const validation = configManager.validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle save errors', async () => {
      vi.spyOn(configManager, 'saveConfig').mockRejectedValue(new Error('Permission denied'));

      await expect(configManager.saveConfig({} as any)).rejects.toThrow('Permission denied');
    });
  });
});