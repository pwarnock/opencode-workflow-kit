import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { program } from '../../src/commands/config';
import { TestDataFactory, TestUtils } from '../utils/test-data-factory';
import { PromptMock } from '../utils/mock-utils';

describe('Config Command', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    vi.clearAllMocks();
  });

  describe('config show', () => {
    it('should display current configuration', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'show']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Current Configuration')
      );
    });

    it('should handle configuration errors', async () => {
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockRejectedValue(new Error('Config not found')),
          validateConfig: vi.fn().mockReturnValue({ valid: false, errors: ['Config not found'] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'show']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error')
      );
    });
  });

  describe('config set', () => {
    it('should set configuration value', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          saveConfig: vi.fn().mockResolvedValue(undefined),
          validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] })
        }))
      }));

      await program.parseAsync([
        'node', 'cody-beads', 'config', 'set', 'github.token', 'new-token'
      ]);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Configuration updated')
      );
    });

    it('should validate configuration after setting value', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          saveConfig: vi.fn().mockResolvedValue(undefined),
          validateConfig: vi.fn().mockReturnValue({ 
            valid: false, 
            errors: ['Invalid token format'] 
          })
        }))
      }));

      await program.parseAsync([
        'node', 'cody-beads', 'config', 'set', 'github.token', 'invalid-token'
      ]);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid configuration')
      );
    });
  });

  describe('config init', () => {
    it('should initialize configuration with prompts', async () => {
      PromptMock.mockPrompt([
        { githubToken: 'ghp_test_token' },
        { githubOwner: 'test-owner' },
        { githubRepo: 'test-repo' },
        { beadsApiKey: 'bd_test_key' },
        { beadsProjectId: 'test-project' },
        { syncDirection: 'bidirectional' },
        { conflictResolution: 'manual' }
      ]);

      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue({}),
          saveConfig: vi.fn().mockResolvedValue(undefined),
          validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'init']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Configuration initialized')
      );
    });

    it('should handle initialization errors', async () => {
      PromptMock.mockPrompt([]);

      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockRejectedValue(new Error('Permission denied')),
          saveConfig: vi.fn().mockResolvedValue(undefined),
          validateConfig: vi.fn().mockReturnValue({ valid: false, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'init']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize')
      );
    });
  });

  describe('config validate', () => {
    it('should validate current configuration', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'validate']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Configuration is valid')
      );
    });

    it('should display validation errors', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          validateConfig: vi.fn().mockReturnValue({ 
            valid: false, 
            errors: ['Missing GitHub token', 'Invalid sync direction'] 
          })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'validate']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Configuration errors')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing GitHub token')
      );
    });
  });

  describe('config test', () => {
    it('should test GitHub and Beads connections', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          testConfig: vi.fn().mockResolvedValue({
            github: true,
            beads: true,
            errors: []
          })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('GitHub connection: ✓')
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Beads connection: ✓')
      );
    });

    it('should handle connection failures', async () => {
      const mockConfig = TestDataFactory.createMockConfig();
      
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockResolvedValue(mockConfig),
          testConfig: vi.fn().mockResolvedValue({
            github: false,
            beads: true,
            errors: ['GitHub authentication failed']
          })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'test']);

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('GitHub connection: ✗')
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('GitHub authentication failed')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing command arguments', async () => {
      await expect(
        program.parseAsync(['node', 'cody-beads', 'config', 'set'])
      ).rejects.toThrow();
    });

    it('should handle invalid configuration paths', async () => {
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockRejectedValue(new Error('File not found')),
          validateConfig: vi.fn().mockReturnValue({ valid: false, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'show']);

      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should handle permission errors', async () => {
      vi.doMock('../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => ({
          loadConfig: vi.fn().mockRejectedValue(new Error('Permission denied')),
          validateConfig: vi.fn().mockReturnValue({ valid: false, errors: [] })
        }))
      }));

      await program.parseAsync(['node', 'cody-beads', 'config', 'init']);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
    });
  });
});