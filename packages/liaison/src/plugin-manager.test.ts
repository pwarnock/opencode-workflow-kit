import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnifiedPluginManager } from '../src/plugin-manager.js';
import type { CLIPlugin, PluginCommand } from '../src/types.js';

describe('UnifiedPluginManager', () => {
  let pluginManager: UnifiedPluginManager;

  beforeEach(() => {
    pluginManager = new UnifiedPluginManager();
  });

  describe('Plugin Loading', () => {
    it('should load a valid plugin', async () => {
      const mockPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn()
          }
        ]
      };

      await pluginManager.loadPlugin(mockPlugin);

      const plugins = pluginManager.listPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should reject plugin without name', async () => {
      const invalidPlugin = {
        version: '1.0.0',
        description: 'Test plugin',
        commands: []
      } as unknown as CLIPlugin;

      await expect(pluginManager.loadPlugin(invalidPlugin))
        .rejects.toThrow('Plugin must have a valid name');
    });

    it('should reject plugin without commands', async () => {
      const invalidPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: []
      } as CLIPlugin;

      await expect(pluginManager.loadPlugin(invalidPlugin))
        .rejects.toThrow('Plugin must have at least one command');
    });

    it('should reject duplicate command names', async () => {
      const plugin1: CLIPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Test plugin 1',
        commands: [
          {
            name: 'duplicate-cmd',
            description: 'First command',
            handler: vi.fn()
          }
        ]
      };

      const plugin2: CLIPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Test plugin 2',
        commands: [
          {
            name: 'duplicate-cmd',
            description: 'Second command',
            handler: vi.fn()
          }
        ]
      };

      await pluginManager.loadPlugin(plugin1);
      await expect(pluginManager.loadPlugin(plugin2))
        .rejects.toThrow("Command 'duplicate-cmd' already registered by plugin1");
    });
  });

  describe('Command Execution', () => {
    let mockHandler: any;

    beforeEach(() => {
      mockHandler = vi.fn().mockResolvedValue('test result');
    });

    it('should execute registered command', async () => {
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: mockHandler
          }
        ]
      };

      await pluginManager.loadPlugin(testPlugin);

      const result = await pluginManager.executeCommand('test-cmd', ['arg1'], { opt1: 'value1' });

      expect(mockHandler).toHaveBeenCalledWith(['arg1'], { opt1: 'value1' });
      expect(result).toBe('test result');
    });

    it('should throw error for unknown command', async () => {
      await expect(pluginManager.executeCommand('unknown-cmd', [], {}))
        .rejects.toThrow("Command 'unknown-cmd' not found");
    });
  });

  describe('Plugin Unloading', () => {
    it('should unload loaded plugin', async () => {
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn()
          }
        ]
      };

      await pluginManager.loadPlugin(testPlugin);
      expect(pluginManager.listPlugins()).toHaveLength(1);

      await pluginManager.unloadPlugin('test-plugin');
      expect(pluginManager.listPlugins()).toHaveLength(0);
    });

    it('should throw error when unloading non-existent plugin', async () => {
      await expect(pluginManager.unloadPlugin('non-existent'))
        .rejects.toThrow("Plugin 'non-existent' not found");
    });
  });

  describe('Command Listing', () => {
    it('should list all available commands', async () => {
      const plugin1: CLIPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        description: 'Test plugin 1',
        commands: [
          {
            name: 'cmd1',
            description: 'Command 1',
            handler: vi.fn()
          }
        ]
      };

      const plugin2: CLIPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        description: 'Test plugin 2',
        commands: [
          {
            name: 'cmd2',
            description: 'Command 2',
            handler: vi.fn()
          },
          {
            name: 'cmd3',
            description: 'Command 3',
            handler: vi.fn()
          }
        ]
      };

      await pluginManager.loadPlugin(plugin1);
      await pluginManager.loadPlugin(plugin2);

      const commands = pluginManager.listCommands();
      expect(commands).toHaveLength(3);
      expect(commands.map(c => c.name)).toEqual(['cmd1', 'cmd2', 'cmd3']);
    });
  });

  describe('Middleware', () => {
    it('should execute middleware chain', async () => {
      const middleware1 = vi.fn().mockImplementation(async (context, next) => {
        await next();
      });
      const middleware2 = vi.fn().mockImplementation(async (context, next) => {
        await next();
      });
      

      
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn().mockResolvedValue('result')
          }
        ],
        middleware: [
          {
            name: 'middleware1',
            execute: middleware1
          },
          {
            name: 'middleware2',
            execute: middleware2
          }
        ]
      };

      await pluginManager.loadPlugin(testPlugin);
      await pluginManager.executeCommand('test-cmd', [], {});



      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
    });
  });

  describe('Hooks', () => {
    it('should execute before and after hooks', async () => {
      const beforeHook = vi.fn();
      const afterHook = vi.fn();
      
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn().mockResolvedValue('result')
          }
        ],
        hooks: {
          beforeCommand: beforeHook,
          afterCommand: afterHook
        }
      };

      await pluginManager.loadPlugin(testPlugin);
      await pluginManager.executeCommand('test-cmd', [], {});

      expect(beforeHook).toHaveBeenCalledWith('test-cmd', []);
      expect(afterHook).toHaveBeenCalledWith('test-cmd', 'result');
    });

    it('should execute error hooks on command failure', async () => {
      const error = new Error('Test error');
      const errorHook = vi.fn();
      
      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn().mockRejectedValue(error)
          }
        ],
        hooks: {
          onError: errorHook
        }
      };

      await pluginManager.loadPlugin(testPlugin);

      try {
        await pluginManager.executeCommand('test-cmd', [], {});
      } catch (e) {
        // Expected to throw
      }

      expect(errorHook).toHaveBeenCalledWith(error, 'test-cmd');
    });
  });

  describe('Events', () => {
    it('should emit pluginLoaded event', async () => {
      const eventSpy = vi.fn();
      pluginManager.on('pluginLoaded', eventSpy);

      const testPlugin: CLIPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-cmd',
            description: 'Test command',
            handler: vi.fn()
          }
        ]
      };

      await pluginManager.loadPlugin(testPlugin);

      expect(eventSpy).toHaveBeenCalledWith(testPlugin);
    });

    it('should emit pluginError event on load failure', async () => {
      const eventSpy = vi.fn();
      pluginManager.on('pluginError', eventSpy);

      const invalidPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: []
      } as CLIPlugin;

      try {
        await pluginManager.loadPlugin(invalidPlugin);
      } catch (e) {
        // Expected to throw
      }

      expect(eventSpy).toHaveBeenCalledWith(invalidPlugin, expect.any(Error));
    });
  });
});