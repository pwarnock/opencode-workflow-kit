import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
    it('should import config command successfully', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');

      expect(configCommand).toBeDefined();
      expect(configCommand.name()).toBe('config');
      expect(configCommand.description()).toBe('Configure cody-beads integration settings');
    });

    it('should have correct command properties', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');
      const { Command } = await import('commander');

      expect(configCommand).toBeInstanceOf(Command);
      expect(typeof configCommand.action).toBe('function');
      expect(typeof configCommand.option).toBe('function');
    });

    it('should have correct arguments', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');

      const args = configCommand.arguments;
      expect(args).toHaveLength(1);
      expect(args[0].name).toBe('<action>');
      expect(args[0].description).toBe('Configuration action');
      expect(args[0].choices).toEqual(['setup', 'test', 'show', 'set', 'get']);
    });

    it('should have correct options', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');

      const options = configCommand.options;
      expect(options.length).toBeGreaterThan(0);
    });
  });
});