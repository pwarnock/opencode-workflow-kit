import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { syncCommand } from '../../../src/commands/sync.js';
import ora from 'ora';
import chalk from 'chalk';

describe('Sync Command', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  let mockOra: {
    start: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };

    mockOra = {
      start: vi.spyOn(ora, 'start').mockReturnValue({
        text: '',
        succeed: vi.fn(),
        fail: vi.fn()
      } as any)
    };

    // Mock chalk functions
    vi.spyOn(chalk, 'green').mockImplementation((text) => `GREEN:${text}`);
    vi.spyOn(chalk, 'red').mockImplementation((text) => `RED:${text}`);
    vi.spyOn(chalk, 'yellow').mockImplementation((text) => `YELLOW:${text}`);
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    mockOra.start.mockRestore();
    vi.clearAllMocks();
  });

  describe('Command Structure', () => {
    it('should be a valid Command instance', () => {
      expect(syncCommand).toBeInstanceOf(Command);
      expect(syncCommand.name()).toBe('sync');
    });

    it('should have correct description', () => {
      expect(syncCommand.description()).toBe('Synchronize issues and PRs between Cody and Beads');
    });

    it('should have required options', () => {
      const options = syncCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(4);

      const hasDirectionOption = options.some((opt: any) =>
        opt.flags === '-d, --direction <direction>' && opt.description.includes('Sync direction')
      );
      expect(hasDirectionOption).toBe(true);

      const hasDryRunOption = options.some((opt: any) =>
        opt.flags === '-n, --dry-run' && opt.description.includes('Show what would be synced')
      );
      expect(hasDryRunOption).toBe(true);

      const hasForceOption = options.some((opt: any) =>
        opt.flags === '-f, --force' && opt.description.includes('Force sync')
      );
      expect(hasForceOption).toBe(true);

      const hasSinceOption = options.some((opt: any) =>
        opt.flags === '--since <date>' && opt.description.includes('Only sync items updated since')
      );
      expect(hasSinceOption).toBe(true);
    });
  });

  describe('Command Behavior', () => {
    it('should have an action function', () => {
      expect(typeof syncCommand.action).toBe('function');
    });

    it('should handle missing configuration gracefully', async () => {
      // Mock ConfigManager to return null
      const mockConfigManager = {
        loadConfig: vi.fn().mockResolvedValue(null),
        testConfig: vi.fn()
      };

      // Mock BeadsClientImpl
      const mockBeadsClient = {
        isAvailable: vi.fn().mockResolvedValue(true)
      };

      // Mock the imports
      vi.doMock('../utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));

      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      // Call the action
      await syncCommand.action({});

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle Beads client unavailable', async () => {
      // Mock ConfigManager
      const mockConfigManager = {
        loadConfig: vi.fn().mockResolvedValue({}),
        testConfig: vi.fn()
      };

      // Mock BeadsClientImpl to return false
      const mockBeadsClient = {
        isAvailable: vi.fn().mockResolvedValue(false)
      };

      // Mock the imports
      vi.doMock('../utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));

      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      // Call the action
      await syncCommand.action({});

      // Verify error handling
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle sync engine errors gracefully', async () => {
      // Mock ConfigManager
      const mockConfigManager = {
        loadConfig: vi.fn().mockResolvedValue({}),
        testConfig: vi.fn().mockResolvedValue({ github: true, beads: true })
      };

      // Mock BeadsClientImpl
      const mockBeadsClient = {
        isAvailable: vi.fn().mockResolvedValue(true)
      };

      // Mock SyncEngine to throw error
      const mockSyncEngine = {
        executeSync: vi.fn().mockRejectedValue(new Error('Sync failed'))
      };

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Mock the imports
      vi.doMock('../utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));

      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      vi.doMock('../core/sync-engine.js', () => ({
        SyncEngine: vi.fn().mockImplementation(() => mockSyncEngine)
      }));

      // Call the action
      await syncCommand.action({});

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it('should handle configuration validation errors', async () => {
      // Mock ConfigManager with validation errors
      const mockConfigManager = {
        loadConfig: vi.fn().mockResolvedValue({}),
        testConfig: vi.fn().mockResolvedValue({
          github: false,
          beads: false,
          errors: ['GitHub token missing', 'Beads configuration invalid']
        })
      };

      // Mock BeadsClientImpl
      const mockBeadsClient = {
        isAvailable: vi.fn().mockResolvedValue(true)
      };

      // Mock the imports
      vi.doMock('../utils/config.js', () => ({
        ConfigManager: vi.fn().mockImplementation(() => mockConfigManager)
      }));

      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      // Call the action
      await syncCommand.action({});

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});