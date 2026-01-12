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

    it('should have subcommands instead of arguments', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');

      // The config command uses subcommands (setup, test, show, set, get) instead of arguments
      const subcommands = configCommand.commands;
      expect(subcommands).toHaveLength(5);

      const subcommandNames = subcommands.map(cmd => cmd.name());
      expect(subcommandNames).toEqual(expect.arrayContaining(['setup', 'test', 'show', 'set', 'get']));
    });

    it('should have subcommands with proper options', async () => {
      const { configCommand } = await import('../../../src/commands/config.ts');

      // Check that subcommands have their own options
      const setCommand = configCommand.commands.find(cmd => cmd.name() === 'set');
      const getCommand = configCommand.commands.find(cmd => cmd.name() === 'get');

      expect(setCommand).toBeDefined();
      expect(getCommand).toBeDefined();

      if (setCommand) {
        expect(setCommand.options).toHaveLength(2); // -k/--key and -v/--value
      }
      if (getCommand) {
        expect(getCommand.options).toHaveLength(1); // -k/--key
      }
    });
  });
});