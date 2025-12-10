/**
 * Cache Command Tests
 * Unit tests for the cache CLI commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from '../../../src/core/cache/CacheManager.js';
import cacheCommand from '../../../src/commands/cache.js';
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';

// Mock console.table
const mockConsoleTable = vi.fn();
const originalConsoleTable = console.table;
console.table = mockConsoleTable;

describe('Cache CLI Commands', () => {
  let program: Command;
  let testCacheDir: string;
  let cacheManager: CacheManager;
  let mockExit: any;

  beforeEach(async () => {
    testCacheDir = path.join(process.cwd(), '.test-cli-cache');
    cacheManager = new CacheManager({
      backend: 'hybrid',
      maxMemoryEntries: 100,
      maxDiskSize: 10,
      diskLocation: testCacheDir,
      defaultTtl: 60000,
      compressionEnabled: false,
      encryptionEnabled: false
    });

    // Setup commander program
    program = new Command();
    program.addCommand(cacheCommand);

    // Mock process.exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    // Reset console.table mock
    mockConsoleTable.mockClear();
  });

  afterEach(async () => {
    await cacheManager.clear();
    
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    
    // Restore mocks
    mockExit.mockRestore();
    console.table = originalConsoleTable;
  });

  describe('cache status', () => {
    it('should display cache statistics', async () => {
      // Setup some test data
      await cacheManager.set('test:key1', 'value1');
      await cacheManager.set('test:key2', 'value2');
      
      // Access some keys to generate stats
      await cacheManager.get('test:key1');
      await cacheManager.get('nonexistent:key');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'status', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache Status'));
      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ Metric: 'Hits' }),
          expect.objectContaining({ Metric: 'Misses' }),
          expect.objectContaining({ Metric: 'Hit Rate' })
        ])
      );

      consoleSpy.mockRestore();
    });

    it('should output JSON when requested', async () => {
      await cacheManager.set('test:key1', 'value1');
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'status', '--json', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"hits"')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cache clear', () => {
    it('should clear all cache entries', async () => {
      // Setup test data
      await cacheManager.set('test:key1', 'value1');
      await cacheManager.set('test:key2', 'value2');
      expect(await cacheManager.size()).toBe(2);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock user confirmation
      const mockReadline = await vi.importActual('node:readline');
      const mockCreateInterface = vi.spyOn(mockReadline, 'createInterface')
        .mockReturnValue({
          question: (_: string, callback: (answer: string) => void) => {
            callback('y');
          },
          close: vi.fn()
        } as any);

      try {
        await program.parseAsync(['node', 'test', 'cache', 'clear', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(await cacheManager.size()).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache cleared'));

      consoleSpy.mockRestore();
      mockCreateInterface.mockRestore();
    });

    it('should clear entries matching pattern', async () => {
      // Setup test data
      await cacheManager.set('user:123', 'user1');
      await cacheManager.set('user:456', 'user2');
      await cacheManager.set('post:789', 'post1');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'clear', 'user:.*', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(await cacheManager.get('user:123')).toBeNull();
      expect(await cacheManager.get('user:456')).toBeNull();
      expect(await cacheManager.get('post:789')).toBe('post1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 entries'));

      consoleSpy.mockRestore();
    });
  });

  describe('cache warm', () => {
    it('should warm all caches when --all flag is used', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'test', 'cache', 'warm', '--all', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration cache warmed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GitHub cache warmed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Beads cache warmed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache warming completed'));

      consoleSpy.mockRestore();
    });

    it('should warm specific cache types', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'test', 'cache', 'warm', '--github', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Configuration cache warmed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GitHub cache warmed'));
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Beads cache warmed'));

      consoleSpy.mockRestore();
    });
  });

  describe('cache export', () => {
    it('should export cache to file', async () => {
      // Setup test data
      await cacheManager.set('export:key1', 'value1');
      await cacheManager.set('export:key2', { data: 'value2' });

      const exportPath = path.join(testCacheDir, 'test-export.json');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'export', exportPath, '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache exported successfully'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File: ' + exportPath));

      // Verify file was created and contains correct data
      const content = await fs.readFile(exportPath, 'utf-8');
      const exported = JSON.parse(content);
      expect(exported).toEqual({
        'export:key1': 'value1',
        'export:key2': { data: 'value2' }
      });

      consoleSpy.mockRestore();
    });
  });

  describe('cache import', () => {
    it('should import cache from file', async () => {
      // Create import file
      const importData = {
        'import:key1': 'imported-value1',
        'import:key2': { data: 'imported-value2' }
      };
      const importPath = path.join(testCacheDir, 'test-import.json');
      await fs.writeFile(importPath, JSON.stringify(importData));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Mock user confirmation
      const mockReadline = await vi.importActual('node:readline');
      const mockCreateInterface = vi.spyOn(mockReadline, 'createInterface')
        .mockReturnValue({
          question: (_: string, callback: (answer: string) => void) => {
            callback('y');
          },
          close: vi.fn()
        } as any);

      try {
        await program.parseAsync(['node', 'test', 'cache', 'import', importPath, '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache imported successfully'));
      expect(await cacheManager.get('import:key1')).toBe('imported-value1');
      expect(await cacheManager.get('import:key2')).toEqual({ data: 'imported-value2' });

      consoleSpy.mockRestore();
      mockCreateInterface.mockRestore();
    });

    it('should merge with existing cache when --merge flag is used', async () => {
      // Setup existing cache
      await cacheManager.set('existing:key', 'existing-value');

      // Create import file
      const importData = {
        'import:key': 'imported-value'
      };
      const importPath = path.join(testCacheDir, 'test-merge-import.json');
      await fs.writeFile(importPath, JSON.stringify(importData));

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'import', importPath, '--merge', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(await cacheManager.get('existing:key')).toBe('existing-value');
      expect(await cacheManager.get('import:key')).toBe('imported-value');
      expect(await cacheManager.size()).toBe(2);

      consoleSpy.mockRestore();
    });
  });

  describe('cache benchmark', () => {
    it('should run performance benchmarks', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'benchmark', '--iterations', '100', '--data-size', '50', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cache Performance Benchmark'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing write performance'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing read performance'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Testing mixed operations'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Summary'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Performance Rating:'));

      consoleSpy.mockRestore();
    });

    it('should use default values when options not provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'benchmark', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Iterations: 1000'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Data Size: 100 bytes'));

      consoleSpy.mockRestore();
    });
  });

  describe('Key Distribution Analysis', () => {
    it('should analyze and display key distribution', async () => {
      // Setup test data with different key types
      await cacheManager.set('github:issues:123', 'value1');
      await cacheManager.set('github:issues:456', 'value2');
      await cacheManager.set('beads:config:workspace', 'value3');
      await cacheManager.set('sync:result:batch-1', 'value4');
      await cacheManager.set('config:user:preferences', 'value5');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'status', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(mockConsoleTable).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ Type: 'github' }),
          expect.objectContaining({ Type: 'beads' }),
          expect.objectContaining({ Type: 'sync' }),
          expect.objectContaining({ Type: 'config' })
        ])
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle export errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'export', '/invalid/path/export.json', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error exporting cache'));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle import errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await program.parseAsync(['node', 'test', 'cache', 'import', '/nonexistent/file.json', '--backend', 'memory']);
      } catch (error) {
        // Ignore process.exit error for testing
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error importing cache'));

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
