import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { initCommand } from '../../../src/commands/init.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';

// Mock chalk at module level to avoid spyOn issues
vi.mock('chalk', () => ({
  default: {
    blue: (text: string) => `BLUE:${text}`,
    green: (text: string) => `GREEN:${text}`,
    yellow: (text: string) => `YELLOW:${text}`,
    gray: (text: string) => `GRAY:${text}`,
    red: (text: string) => `RED:${text}`,
    cyan: (text: string) => `CYAN:${text}`,
  },
}));

describe('Init Command', () => {
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

  describe('Command Structure', () => {
    it('should be a valid Command instance', () => {
      expect(initCommand).toBeInstanceOf(Command);
      expect(initCommand.name()).toBe('init');
    });

    it('should have correct description', () => {
      expect(initCommand.description()).toBe('Initialize new cody-beads integration project');
    });

    it('should have required options', () => {
      const options = initCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(3);

      const hasTemplateOption = options.some((opt: any) =>
        opt.flags === '-t, --template <type>' && opt.description.includes('Template type')
      );
      expect(hasTemplateOption).toBe(true);

      const hasNameOption = options.some((opt: any) =>
        opt.flags === '-n, --name <name>' && opt.description.includes('Project name')
      );
      expect(hasNameOption).toBe(true);

      const hasInstallBeadsOption = options.some((opt: any) =>
        opt.flags === '--install-beads' && opt.description.includes('Install @beads/bd')
      );
      expect(hasInstallBeadsOption).toBe(true);
    });
  });

  describe('Command Behavior', () => {
    it('should have an action function', () => {
      expect(typeof initCommand.action).toBe('function');
    });

    it('should handle missing project name gracefully', async () => {
      // Mock inquirer to return a project name
      vi.spyOn(inquirer, 'prompt').mockResolvedValue({ name: 'test-project' });

      // Mock fs to simulate directory doesn't exist
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);
      vi.spyOn(fs, 'ensureDir').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeJSON').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      // Mock BeadsClientImpl
      const mockBeadsClient = {
        isAvailable: vi.fn().mockResolvedValue(true)
      };
      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      // Call the action with minimal options
      await initCommand.action({});

      // Verify the command completed without errors
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should handle existing directory error', async () => {
      // Mock fs to simulate directory already exists
      vi.spyOn(fs, 'pathExists').mockResolvedValue(true);

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action
      await initCommand.action({ name: 'existing-project' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', async () => {
      // Mock fs to throw an error
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);
      vi.spyOn(fs, 'ensureDir').mockRejectedValue(new Error('Permission denied'));

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action
      await initCommand.action({ name: 'test-project' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it('should handle Beads client errors', async () => {
      // Mock BeadsClientImpl to throw error
      const mockBeadsClient = {
        isAvailable: vi.fn().mockRejectedValue(new Error('Beads client error'))
      };
      vi.doMock('../utils/beads.js', () => ({
        BeadsClientImpl: mockBeadsClient
      }));

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action
      await initCommand.action({ name: 'test-project' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});