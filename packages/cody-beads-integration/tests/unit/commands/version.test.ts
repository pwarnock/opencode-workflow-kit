import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { versionCommand } from '../../../src/commands/version.js';
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

describe('Version Command', () => {
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
      expect(versionCommand).toBeInstanceOf(Command);
      expect(versionCommand.name()).toBe('version');
    });

    it('should have correct description', () => {
      expect(versionCommand.description()).toBe('Manage version information and updates');
    });

    it('should have required options', () => {
      const options = versionCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(3);

      const hasNameOption = options.some((opt: any) =>
        opt.flags === '-n, --name <name>' && opt.description.includes('Version name')
      );
      expect(hasNameOption).toBe(true);

      const hasFeaturesOption = options.some((opt: any) =>
        opt.flags === '-f, --features <features>' && opt.description.includes('Version features')
      );
      expect(hasFeaturesOption).toBe(true);

      const hasVersionOption = options.some((opt: any) =>
        opt.flags === '-v, --version <version>' && opt.description.includes('Target version')
      );
      expect(hasVersionOption).toBe(true);
    });
  });

  describe('Command Behavior', () => {
    it('should have an action function', () => {
      expect(typeof versionCommand.action).toBe('function');
    });

    it('should handle version add operation', async () => {
      // Mock fs operations
      vi.spyOn(fs, 'pathExists').mockResolvedValue(false);
      vi.spyOn(fs, 'ensureDir').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeJSON').mockResolvedValue(undefined);
      vi.spyOn(fs, 'readJSON').mockResolvedValue({ versions: [] });

      // Call the action with add operation
      await versionCommand.action({ operation: 'add', name: 'v1.0.0', features: 'New features' });

      // Verify success
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });

    it('should handle version list operation', async () => {
      // Mock fs to return version data
      vi.spyOn(fs, 'readJSON').mockResolvedValue({
        versions: [
          { name: 'v1.0.0', features: 'Initial release', date: '2025-01-01' },
          { name: 'v1.1.0', features: 'Bug fixes', date: '2025-02-01' }
        ]
      });

      // Call the action with list operation
      await versionCommand.action({ operation: 'list' });

      // Verify output
      expect(mockConsole.log).toHaveBeenCalled();
      expect(mockConsole.error).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing version file gracefully', async () => {
      // Mock fs to throw error for missing file
      vi.spyOn(fs, 'readJSON').mockRejectedValue(new Error('File not found'));

      // Call the action
      await versionCommand.action({ operation: 'list' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalled();
    });

    it('should handle duplicate version errors', async () => {
      // Mock fs to return existing versions
      vi.spyOn(fs, 'readJSON').mockResolvedValue({
        versions: [
          { name: 'v1.0.0', features: 'Initial release' }
        ]
      });

      // Mock process.exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {});

      // Call the action with duplicate version
      await versionCommand.action({ operation: 'add', name: 'v1.0.0', features: 'Duplicate' });

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
      await versionCommand.action({ operation: 'add', name: 'v1.0.0', features: 'New features' });

      // Verify error handling
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});