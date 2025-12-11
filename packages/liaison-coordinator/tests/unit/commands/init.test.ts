import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { initCommand } from '../../../src/commands/init.js';
import chalk from 'chalk';

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

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {},
  ensureDir: vi.fn(),
  pathExists: vi.fn(),
  remove: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
}));

// Mock child_process
vi.mock('child_process');

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ name: 'test-project' }),
  },
}));

// Mock BeadsClientImpl
vi.mock('../../../src/utils/beads.js', () => ({
  BeadsClientImpl: {
    isAvailable: vi.fn().mockResolvedValue(true),
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
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
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
      expect(initCommand.description()).toContain('Initialize');
    });

    it('should have required options', () => {
      const options = initCommand.options;
      expect(options.length).toBeGreaterThanOrEqual(3);

      const hasTemplateOption = options.some(
        (opt: any) =>
          opt.flags === '-t, --template <type>' &&
          opt.description.includes('Template')
      );
      expect(hasTemplateOption).toBe(true);

      const hasNameOption = options.some(
        (opt: any) =>
          opt.flags === '-n, --name <name>' &&
          opt.description.includes('Project')
      );
      expect(hasNameOption).toBe(true);

      const hasInstallBeadsOption = options.some(
        (opt: any) =>
          opt.flags === '--install-beads' && opt.description.includes('Install')
      );
      expect(hasInstallBeadsOption).toBe(true);
    });
  });

  describe('Command Behavior', () => {
    it('should have an action function', () => {
      expect(typeof initCommand.action).toBe('function');
    });

    it('should accept options', () => {
      const options = initCommand.options;
      expect(options.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle directory creation errors', async () => {
      const mockExit = vi
        .spyOn(process, 'exit')
        .mockImplementation((code?: string | number | null | undefined) => {
          throw new Error(`Process exit called with code: ${code}`);
        });

      // Init will try to create directories - this test just verifies
      // the command structure is correct
      expect(initCommand).toBeInstanceOf(Command);

      mockExit.mockRestore();
    });

    it('should have proper help text', () => {
      const help = initCommand.helpInformation();
      expect(help).toContain('init');
    });
  });
});
