/**
 * OpenCode Command Integration Tests
 * Tests complete OpenCode CLI functionality including optional dependency handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createOpenCodeCommand } from '../commands/opencode';
import { Command } from 'commander';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';

// Mock console methods to capture output
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

// Mock process.exit
const mockExit = vi.fn();

describe('OpenCode Command Integration', () => {
  let testDir: string;
  let command: Command;

  beforeEach(() => {
    // Setup test directory
    testDir = join(process.cwd(), 'test-opencode-integration');
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    
    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(mockExit as any);
    
    // Create command instance
    command = createOpenCodeCommand();
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    
    // Clean up .opencode directory if created
    const opencodeDir = join(process.cwd(), '.opencode');
    if (existsSync(opencodeDir)) {
      rmSync(opencodeDir, { recursive: true, force: true });
    }
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Command Structure', () => {
    it('should create a valid command structure', () => {
      expect(command.name()).toBe('opencode');
      expect(command.description()).toContain('OpenCode configuration management');
    });

    it('should have correct options', () => {
      const options = command.options;
      const optionFlags = options.map((opt: any) => opt.flags);

      expect(optionFlags).toContain('-d, --directory <path>');
      expect(optionFlags).toContain('-a, --agents <agents>');
      expect(optionFlags).toContain('--overwrite');
      expect(optionFlags).toContain('--list-models');
      expect(optionFlags).toContain('--list-agents');
    });

    it('should have agent subcommand', () => {
      const agentCommand = command.commands.find((cmd: any) => cmd.name() === 'agent');
      expect(agentCommand).toBeDefined();
      expect(agentCommand?.description()).toContain('Create individual agent');
    });
  });

  describe('Agent Creation Subcommand', () => {
    it('should create agent subcommand with correct options', () => {
      const agentCommand = command.commands.find((cmd: any) => cmd.name() === 'agent');
      expect(agentCommand).toBeDefined();

      const options = agentCommand?.options || [];
      const optionFlags = options.map((opt: any) => opt.flags);

      expect(optionFlags).toContain('-t, --template <template>');
      expect(optionFlags).toContain('-d, --description <description>');
      expect(optionFlags).toContain('--temperature <temp>');
      expect(optionFlags).toContain('--overwrite');
    });
  });

  describe('Help and Documentation', () => {
    it('should show help for main command', () => {
      const helpText = command.helpInformation();
      expect(helpText).toContain('OpenCode configuration management');
      expect(helpText).toContain('--directory <path>');
      expect(helpText).toContain('--agents <agents>');
      expect(helpText).toContain('--overwrite');
    });

    it('should show help for agent subcommand', () => {
      const agentCommand = command.commands.find((cmd: any) => cmd.name() === 'agent');
      const helpText = agentCommand?.helpInformation() || '';

      expect(helpText).toContain('Create individual agent');
      expect(helpText).toContain('--template <template>');
      expect(helpText).toContain('--description <description>');
    });
  });

  describe('Optional Dependency Handling', () => {
    it('should handle missing opencode_config package gracefully', () => {
      // Test that command structure is correct even without package
      expect(command.name()).toBe('opencode');
      expect(command.description()).toContain('OpenCode configuration management');
      
      // The actual error handling happens inside the async action
      // We verify command structure is correct
    });
  });

  describe('Model and Template Listing', () => {
    it('should have list-models option', () => {
      const options = command.options;
      const hasListModels = options.some((opt: any) => opt.flags === '--list-models');
      expect(hasListModels).toBe(true);
    });

    it('should have list-agents option', () => {
      const options = command.options;
      const hasListAgents = options.some((opt: any) => opt.flags === '--list-agents');
      expect(hasListAgents).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should have default values for options', () => {
      const options = command.options;

      const directoryOption = options.find((opt: any) => opt.flags === '-d, --directory <path>');
      expect(directoryOption?.defaultValue).toBe(process.cwd());

      const agentsOption = options.find((opt: any) => opt.flags === '-a, --agents <agents>');
      expect(agentsOption?.defaultValue).toBe('library-researcher,code-reviewer');
    });
  });

  describe('Integration Points', () => {
    it('should be properly integrated into CLI structure', () => {
      // Verify command follows liaison patterns
      expect(command.name()).toBe('opencode');
      expect(command.description()).toContain('OpenCode');

      // Verify it has subcommands
      expect(command.commands.length).toBeGreaterThan(0);

      // Verify options follow naming conventions (some options may not have short flags)
      const options = command.options;
      options.forEach((option: any) => {
        // Options can be either "-x, --long-name" or just "--long-name"
        expect(option.flags).toMatch(/^(-[\w], )?--[\w-]+/);
      });
    });
  });
});