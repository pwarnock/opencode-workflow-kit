import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import chalk from 'chalk';
import { 
  pluginCommand, 
  taskCommand, 
  workflowCommand, 
  migrateCommand 
} from '../../../src/commands/enhanced-cli.js';

describe('Enhanced CLI Commands', () => {
  let mockConsole: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    mockConsole = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    mockConsole.log.mockRestore();
    mockConsole.error.mockRestore();
    mockConsole.warn.mockRestore();
    vi.clearAllMocks();
  });

  describe('Command Exports', () => {
    it('should export plugin command', () => {
      expect(pluginCommand).toBeInstanceOf(Command);
      expect(pluginCommand.name()).toBe('plugin');
      expect(pluginCommand.description()).toBe('Manage TaskFlow plugins');
    });

    it('should export task command', () => {
      expect(taskCommand).toBeInstanceOf(Command);
      expect(taskCommand.name()).toBe('task');
      expect(taskCommand.description()).toBe('Manage tasks and workflows');
    });

    it('should export workflow command', () => {
      expect(workflowCommand).toBeInstanceOf(Command);
      expect(workflowCommand.name()).toBe('workflow');
      expect(workflowCommand.description()).toBe('Manage workflows and automation');
    });

    it('should export migrate command', () => {
      expect(migrateCommand).toBeInstanceOf(Command);
      expect(migrateCommand.name()).toBe('migrate');
      expect(migrateCommand.description()).toBe('Migrate configuration and data between versions');
    });
  });

  describe('Command Options', () => {
    it('should have correct plugin command options', () => {
      const pluginOptions = pluginCommand.options;
      expect(pluginOptions.length).toBeGreaterThanOrEqual(4);
      
      const hasNameOption = pluginOptions.some((opt: any) => opt.flags === '-n, --name <name>' && opt.description.includes('Plugin name'));
      expect(hasNameOption).toBe(true);
    });

    it('should have correct task command options', () => {
      const taskOptions = taskCommand.options;
      expect(taskOptions.length).toBeGreaterThanOrEqual(6);
      
      const hasIdOption = taskOptions.some((opt: any) => opt.flags === '-i, --id <id>' && opt.description.includes('Task ID'));
      expect(hasIdOption).toBe(true);
    });

    it('should have correct workflow command options', () => {
      const workflowOptions = workflowCommand.options;
      expect(workflowOptions.length).toBeGreaterThanOrEqual(4);
      
      const hasNameOption = workflowOptions.some((opt: any) => opt.flags === '-n, --name <name>' && opt.description.includes('Workflow name'));
      expect(hasNameOption).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should have proper command structure', () => {
      // Test that commands are properly configured
      expect(pluginCommand.description()).toBe('Manage TaskFlow plugins');
      expect(taskCommand.description()).toBe('Manage tasks and workflows');
      expect(workflowCommand.description()).toBe('Manage workflows and automation');
      expect(migrateCommand.description()).toBe('Migrate configuration and data between versions');
    });

    it('should have correct command arguments', () => {
      // Test plugin command arguments
      const pluginArgs = pluginCommand.registeredArguments;
      expect(pluginArgs).toHaveLength(1);
      expect(pluginArgs[0].description).toBe('Plugin action');
      
      // Test task command arguments
      const taskArgs = taskCommand.registeredArguments;
      expect(taskArgs).toHaveLength(1);
      expect(taskArgs[0].description).toBe('Task action');
      
      // Test workflow command arguments
      const workflowArgs = workflowCommand.registeredArguments;
      expect(workflowArgs).toHaveLength(1);
      expect(workflowArgs[0].description).toBe('Workflow action');
      
      // Test migrate command arguments
      const migrateArgs = migrateCommand.registeredArguments;
      expect(migrateArgs).toHaveLength(1);
      expect(migrateArgs[0].description).toBe('Target version');
    });
  });

  describe('Command Integration', () => {
    it('should integrate with commander.js correctly', () => {
      // Test that commands can be used with commander
      expect(typeof pluginCommand.action).toBe('function');
      expect(typeof taskCommand.action).toBe('function');
      expect(typeof workflowCommand.action).toBe('function');
      expect(typeof migrateCommand.action).toBe('function');
    });

    it('should have proper command structure for integration', () => {
      // Test that all commands have the expected structure
      expect(pluginCommand).toHaveProperty('name');
      expect(pluginCommand).toHaveProperty('description');
      expect(pluginCommand).toHaveProperty('options');
      expect(pluginCommand).toHaveProperty('registeredArguments');
      
      expect(taskCommand).toHaveProperty('name');
      expect(taskCommand).toHaveProperty('description');
      expect(taskCommand).toHaveProperty('options');
      expect(taskCommand).toHaveProperty('registeredArguments');
      
      expect(workflowCommand).toHaveProperty('name');
      expect(workflowCommand).toHaveProperty('description');
      expect(workflowCommand).toHaveProperty('options');
      expect(workflowCommand).toHaveProperty('registeredArguments');
      
      expect(migrateCommand).toHaveProperty('name');
      expect(migrateCommand).toHaveProperty('description');
      expect(migrateCommand).toHaveProperty('options');
      expect(migrateCommand).toHaveProperty('registeredArguments');
    });
  });
});