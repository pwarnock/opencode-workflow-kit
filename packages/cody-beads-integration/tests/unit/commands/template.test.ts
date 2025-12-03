import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { templateCommand } from '../../../src/commands/template.js';
import chalk from 'chalk';
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

describe('Template Command', () => {
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
      expect(templateCommand).toBeInstanceOf(Command);
      expect(templateCommand.name()).toBe('template');
    });

    it('should have correct description', () => {
      expect(templateCommand.description()).toBe('Manage project templates');
    });

    it('should have required options', () => {
      const options = templateCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(2);

      const hasNameOption = options.some((opt: any) =>
        opt.flags === '-n, --name <name>' && opt.description.includes('Template name')
      );
      expect(hasNameOption).toBe(true);

      const hasTypeOption = options.some((opt: any) =>
        opt.flags === '-t, --type <type>' && opt.description.includes('Template type')
      );
      expect(hasTypeOption).toBe(true);
    });
  });

  describe('Command Behavior', () => {
    it('should have an action function', () => {
      expect(typeof templateCommand.action).toBe('function');
    });

    it('should handle template list operation', async () => {
      // Mock fs to return template files
      vi.spyOn(fs, 'readdir').mockResolvedValue(['minimal.json', 'web-development.json']);
      vi.spyOn(fs, 'readJSON').mockResolvedValue({ name: 'minimal', description: 'Minimal template' });

      // Call the action with list operation
      await templateCommand.action({ operation: 'list' });

      // Verify output
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should handle template apply operation', async () => {
      // Mock fs operations
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);
      vi.spyOn(fs, 'ensureDir').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeJSON').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      vi.spyOn(fs, 'readJSON').mockResolvedValue({
        name: 'minimal',
        description: 'Minimal template',
        files: {
          'package.json': { content: '{}' },
          'README.md': { content: '# Project' }
        }
      });

      // Call the action with apply operation
      await templateCommand.action({ operation: 'apply', name: 'minimal' });

      // Verify success
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing template errors', async () => {
      // Mock fs to throw error
      vi.spyOn(fs, 'readJSON').mockRejectedValue(new Error('Template not found'));

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action
      await templateCommand.action({ operation: 'apply', name: 'nonexistent' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it('should handle file system errors gracefully', async () => {
      // Mock fs to throw permission error
      vi.spyOn(fs, 'writeJSON').mockRejectedValue(new Error('Permission denied'));

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action
      await templateCommand.action({ operation: 'apply', name: 'minimal' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});