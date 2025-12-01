import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import chalk from 'chalk';

describe('Config Command Logic', () => {
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

  describe('Command Import', () => {
    it('should import config command successfully', () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      expect(configCommand).toBeDefined();
      expect(configCommand.name()).toBe('config');
      expect(configCommand.description()).toBe('Configure cody-beads integration settings');
    });
  });

  describe('Command Structure', () => {
    it('should have correct command properties', () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      expect(configCommand).toBeInstanceOf(require('commander').Command);
      expect(typeof configCommand.action).toBe('function');
      expect(typeof configCommand.option).toBe('function');
      expect(typeof configCommand.argument).toBe('function');
    });

    it('should have correct arguments', () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const args = configCommand.arguments;
      expect(args).toHaveLength(1);
      expect(args[0].name).toBe('<action>');
      expect(args[0].description).toBe('Configuration action');
      expect(args[0].choices).toEqual(['setup', 'test', 'show', 'set', 'get']);
    });

    it('should have correct options', () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const options = configCommand.options;
      expect(options.length).toBeGreaterThan(0);
      
      const keyOption = options.find((opt: any) => opt.flags === '-k' || opt.long === '--key');
      const valueOption = options.find((opt: any) => opt.flags === '-v' || opt.long === '--value');
      
      expect(keyOption).toBeDefined();
      expect(valueOption).toBeDefined();
    });
  });

  describe('Action Function', () => {
    it('should be an async function', () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      expect(typeof configCommand.action).toBe('function');
      expect(configCommand.action.constructor.name).toBe('AsyncFunction');
    });

    it('should handle different actions', async () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      // Mock dependencies
      const mockConfigManager = {
        load: vi.fn().mockResolvedValue({}),
        saveConfig: vi.fn().mockResolvedValue(undefined),
        validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] })
      };
      
      vi.doMock('../../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));
      
      // Test different actions
      await expect(configCommand.action(['show'], {})).resolves.toBeUndefined();
      await expect(configCommand.action(['setup'], {})).resolves.toBeUndefined();
      await expect(configCommand.action(['set'], { key: 'test.key', value: 'test.value' })).resolves.toBeUndefined();
      await expect(configCommand.action(['get'], { key: 'test.key' })).resolves.toBeUndefined();
      await expect(configCommand.action(['test'], {})).resolves.toBeUndefined();
      
      expect(mockConfigManager.load).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle config manager errors', async () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const mockConfigManager = {
        load: vi.fn().mockRejectedValue(new Error('Config not found'))
      };
      
      vi.doMock('../../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));
      
      await expect(configCommand.action(['show'], {})).rejects.toThrow('Config not found');
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        chalk.red('❌ Setup failed:'),
        expect.any(Error)
      );
    });

    it('should handle unknown actions', async () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const mockConfigManager = {
        load: vi.fn().mockResolvedValue({})
      };
      
      vi.doMock('../../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));
      
      await expect(configCommand.action(['unknown'], {})).rejects.toThrow('Unknown action: unknown');
      
      expect(mockConsole.error).toHaveBeenCalledWith(
        chalk.red(`Unknown action: unknown`)
      );
    });
  });

  describe('Option Handling', () => {
    it('should parse key-value options correctly', async () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const mockConfigManager = {
        load: vi.fn().mockResolvedValue({}),
        setOption: vi.fn().mockResolvedValue(undefined),
        getOption: vi.fn().mockResolvedValue('test-value')
      };
      
      vi.doMock('../../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));
      
      await configCommand.action(['set'], { key: 'test.key', value: 'test.value' });
      
      expect(mockConfigManager.setOption).toHaveBeenCalledWith('test.key', 'test.value');
    });

    it('should handle missing options gracefully', async () => {
      const { configCommand } = require('../../../src/commands/config.ts');
      
      const mockConfigManager = {
        load: vi.fn().mockResolvedValue({})
      };
      
      vi.doMock('../../../src/utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));
      
      // Should not throw for missing options (handled internally)
      await expect(configCommand.action(['set'], {})).resolves.toBeUndefined();
    });
  });
});