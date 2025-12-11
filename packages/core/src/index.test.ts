/**
 * Tests for core index.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  VERSION, 
  PluginManager, 
  createCache, 
  createValidator, 
  createSecurityManager 
} from './index.js';

describe('Core Index', () => {
  describe('Exports', () => {
    it('should export VERSION', () => {
      expect(VERSION).toBe('0.5.0');
    });

    it('should export PluginManager class', () => {
      expect(PluginManager).toBeDefined();
      expect(typeof PluginManager).toBe('function');
    });

    it('should export factory functions', () => {
      expect(createCache).toBeDefined();
      expect(typeof createCache).toBe('function');
      expect(createValidator).toBeDefined();
      expect(typeof createValidator).toBe('function');
      expect(createSecurityManager).toBeDefined();
      expect(typeof createSecurityManager).toBe('function');
    });
  });

  describe('Factory Functions', () => {
    it('should create cache with default TTL', () => {
      const cache = createCache();
      expect(cache).toBeDefined();
      expect(cache.has).toBeDefined();
      expect(cache.get).toBeDefined();
      expect(cache.set).toBeDefined();
      expect(cache.delete).toBeDefined();
      expect(cache.clear).toBeDefined();
    });

    it('should create cache with custom TTL', () => {
      const cache = createCache(5000);
      expect(cache).toBeDefined();
    });

    it('should create validator', () => {
      const validator = createValidator();
      expect(validator).toBeDefined();
      expect(validator.validate).toBeDefined();
    });

    it('should create security manager', () => {
      const securityManager = createSecurityManager();
      expect(securityManager).toBeDefined();
      expect(securityManager.validatePermissions).toBeDefined();
      expect(securityManager.createContext).toBeDefined();
    });
  });

  describe('PluginManager', () => {
    let pluginManager: PluginManager;

    beforeEach(() => {
      pluginManager = new PluginManager();
    });

    it('should create empty plugin manager', () => {
      expect(pluginManager.list()).toHaveLength(0);
    });

    it('should register plugins', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin'
      };

      pluginManager.register(mockPlugin);
      
      const plugins = pluginManager.list();
      expect(plugins).toHaveLength(1);
      expect(plugins[0]).toEqual(mockPlugin);
    });

    it('should get registered plugin', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin'
      };

      pluginManager.register(mockPlugin);
      const retrieved = pluginManager.get('test-plugin');
      
      expect(retrieved).toEqual(mockPlugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const retrieved = pluginManager.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should unregister plugins', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin'
      };

      pluginManager.register(mockPlugin);
      expect(pluginManager.list()).toHaveLength(1);
      
      const removed = pluginManager.unregister('test-plugin');
      expect(removed).toBe(true);
      expect(pluginManager.list()).toHaveLength(0);
    });

    it('should return false when unregistering non-existent plugin', () => {
      const removed = pluginManager.unregister('non-existent');
      expect(removed).toBe(false);
    });

    it('should throw error when registering duplicate plugin', () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin'
      };

      pluginManager.register(mockPlugin);
      
      expect(() => {
        pluginManager.register(mockPlugin);
      }).toThrow('Plugin test-plugin is already registered');
    });

    it('should initialize enabled plugins', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin',
        initialize: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager.register(mockPlugin);
      await pluginManager.initialize();
      
      expect(mockPlugin.initialize).toHaveBeenCalled();
    });

    it('should not initialize disabled plugins', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: false,
        description: 'Test plugin',
        initialize: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager.register(mockPlugin);
      await pluginManager.initialize();
      
      expect(mockPlugin.initialize).not.toHaveBeenCalled();
    });

    it('should handle plugin initialization errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin',
        initialize: vi.fn().mockRejectedValue(new Error('Init failed'))
      };

      pluginManager.register(mockPlugin);
      
      // Should not throw error, just log it
      await expect(pluginManager.initialize()).resolves.toBeUndefined();
      
      consoleSpy.mockRestore();
    });

    it('should execute plugin commands', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin',
        execute: vi.fn().mockResolvedValue('result')
      };

      pluginManager.register(mockPlugin);
      const result = await pluginManager.execute('test-plugin', 'input');
      
      expect(mockPlugin.execute).toHaveBeenCalledWith('input');
      expect(result).toBe('result');
    });

    it('should throw error when executing non-existent plugin', async () => {
      await expect(pluginManager.execute('non-existent')).rejects.toThrow('Plugin not found: non-existent');
    });

    it('should throw error when executing disabled plugin', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: false,
        description: 'Test plugin',
        execute: vi.fn()
      };

      pluginManager.register(mockPlugin);
      
      await expect(pluginManager.execute('test-plugin')).rejects.toThrow('Plugin is disabled: test-plugin');
    });

    it('should throw error when executing plugin without execute method', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin'
      };

      pluginManager.register(mockPlugin);
      
      await expect(pluginManager.execute('test-plugin')).rejects.toThrow('Plugin does not support execution: test-plugin');
    });

    it('should cleanup plugins', async () => {
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin',
        cleanup: vi.fn().mockResolvedValue(undefined)
      };

      pluginManager.register(mockPlugin);
      await pluginManager.cleanup();
      
      expect(mockPlugin.cleanup).toHaveBeenCalled();
    });

    it('should handle plugin cleanup errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        enabled: true,
        description: 'Test plugin',
        cleanup: vi.fn().mockRejectedValue(new Error('Cleanup failed'))
      };

      pluginManager.register(mockPlugin);
      
      // Should not throw error, just log it
      await expect(pluginManager.cleanup()).resolves.toBeUndefined();
      
      consoleSpy.mockRestore();
    });
  });
});