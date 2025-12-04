import { describe, it, expect, vi, beforeEach } from 'vitest';
import { codyBeadsPlugin } from './cody-beads-plugin.js';
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

// Mock child_process spawn
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    spawn: vi.fn(() => ({
      on: vi.fn(),
      stdio: 'inherit',
      cwd: process.cwd()
    }))
  };
});

describe('CLI Commands - Task Management', () => {
  describe('listTasks Command', () => {
    it('should be defined in plugin commands', () => {
      const listTasksCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'listTasks');
      expect(listTasksCommand).toBeDefined();
      expect(listTasksCommand?.description).toContain('List all tasks');
    });

    it('should handle options correctly', async () => {
      const listTasksCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'listTasks');
      const mockSpawn = vi.fn(() => ({
        on: vi.fn((event, callback) => {
          if (event === 'close') callback(0);
        }),
        stdin: null,
        stdout: null,
        stderr: null,
        stdio: 'inherit',
        pid: 1
      }));

      vi.mocked(spawn).mockImplementationOnce(mockSpawn as any);

      if (listTasksCommand) {
        await expect(listTasksCommand.handler({}, { json: true, status: 'open' }))
          .resolves.toEqual({ success: true, code: 0 });
      }
    });
  });

  describe('createTask Command', () => {
    it('should be defined in plugin commands', () => {
      const createTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'createTask');
      expect(createTaskCommand).toBeDefined();
      expect(createTaskCommand?.description).toContain('Create a new task');
    });

    it('should require title argument', async () => {
      const createTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'createTask');
      if (createTaskCommand) {
        await expect(createTaskCommand.handler({}, {}))
          .rejects.toThrow('Task title is required');
      }
    });
  });

  describe('updateTask Command', () => {
    it('should be defined in plugin commands', () => {
      const updateTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'updateTask');
      expect(updateTaskCommand).toBeDefined();
      expect(updateTaskCommand?.description).toContain('Update an existing task');
    });

    it('should require task ID', async () => {
      const updateTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'updateTask');
      if (updateTaskCommand) {
        await expect(updateTaskCommand.handler({}, {}))
          .rejects.toThrow('Task ID is required');
      }
    });
  });

  describe('deleteTask Command', () => {
    it('should be defined in plugin commands', () => {
      const deleteTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'deleteTask');
      expect(deleteTaskCommand).toBeDefined();
      expect(deleteTaskCommand?.description).toContain('Delete a task');
    });

    it('should require task ID', async () => {
      const deleteTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'deleteTask');
      if (deleteTaskCommand) {
        await expect(deleteTaskCommand.handler({}, {}))
          .rejects.toThrow('Task ID is required');
      }
    });
  });

  describe('syncTasks Command', () => {
    it('should be defined in plugin commands', () => {
      const syncTasksCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'syncTasks');
      expect(syncTasksCommand).toBeDefined();
      expect(syncTasksCommand?.description).toContain('Sync tasks');
    });
  });

  describe('assignTask Command', () => {
    it('should be defined in plugin commands', () => {
      const assignTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'assignTask');
      expect(assignTaskCommand).toBeDefined();
      expect(assignTaskCommand?.description).toContain('Assign a task');
    });

    it('should require task ID and user', async () => {
      const assignTaskCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'assignTask');
      if (assignTaskCommand) {
        await expect(assignTaskCommand.handler({}, {}))
          .rejects.toThrow('Task ID and user are required');
      }
    });
  });
});

describe('CLI Commands - Workflow Management', () => {
  describe('listWorkflows Command', () => {
    it('should be defined in plugin commands', () => {
      const listWorkflowsCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'listWorkflows');
      expect(listWorkflowsCommand).toBeDefined();
      expect(listWorkflowsCommand?.description).toContain('List all available workflows');
    });
  });

  describe('createWorkflow Command', () => {
    it('should be defined in plugin commands', () => {
      const createWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'createWorkflow');
      expect(createWorkflowCommand).toBeDefined();
      expect(createWorkflowCommand?.description).toContain('Create a new workflow');
    });

    it('should require workflow name', async () => {
      const createWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'createWorkflow');
      if (createWorkflowCommand) {
        await expect(createWorkflowCommand.handler({}, {}))
          .rejects.toThrow('Workflow name is required');
      }
    });
  });

  describe('runWorkflow Command', () => {
    it('should be defined in plugin commands', () => {
      const runWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'runWorkflow');
      expect(runWorkflowCommand).toBeDefined();
      expect(runWorkflowCommand?.description).toContain('Run a workflow');
    });

    it('should require workflow name', async () => {
      const runWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'runWorkflow');
      if (runWorkflowCommand) {
        await expect(runWorkflowCommand.handler({}, {}))
          .rejects.toThrow('Workflow name is required');
      }
    });
  });

  describe('scheduleWorkflow Command', () => {
    it('should be defined in plugin commands', () => {
      const scheduleWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'scheduleWorkflow');
      expect(scheduleWorkflowCommand).toBeDefined();
      expect(scheduleWorkflowCommand?.description).toContain('Schedule a workflow');
    });

    it('should require workflow name and time', async () => {
      const scheduleWorkflowCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'scheduleWorkflow');
      if (scheduleWorkflowCommand) {
        await expect(scheduleWorkflowCommand.handler({}, {}))
          .rejects.toThrow('Workflow name and schedule time are required');
      }
    });
  });

  describe('showWorkflowLogs Command', () => {
    it('should be defined in plugin commands', () => {
      const showWorkflowLogsCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'showWorkflowLogs');
      expect(showWorkflowLogsCommand).toBeDefined();
      expect(showWorkflowLogsCommand?.description).toContain('Show logs');
    });

    it('should require workflow name', async () => {
      const showWorkflowLogsCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'showWorkflowLogs');
      if (showWorkflowLogsCommand) {
        await expect(showWorkflowLogsCommand.handler({}, {}))
          .rejects.toThrow('Workflow name is required');
      }
    });
  });
});

describe('CLI Commands - Plugin System', () => {
  describe('searchPlugins Command', () => {
    it('should be defined in plugin commands', () => {
      const searchPluginsCommand = codyBeadsPlugin.commands.find(cmd => cmd.name === 'searchPlugins');
      expect(searchPluginsCommand).toBeDefined();
      expect(searchPluginsCommand?.description).toContain('Search for available plugins');
    });
  });
});

describe('CLI Commands - Integration Tests', () => {
  it('should have all 12 new commands registered', () => {
    const commandNames = codyBeadsPlugin.commands.map(cmd => cmd.name);
    const expectedCommands = [
      'listTasks', 'createTask', 'updateTask', 'deleteTask',
      'syncTasks', 'assignTask', 'listWorkflows', 'createWorkflow',
      'runWorkflow', 'scheduleWorkflow', 'showWorkflowLogs', 'searchPlugins'
    ];

    expectedCommands.forEach(expectedCommand => {
      expect(commandNames).toContain(expectedCommand);
    });
  });

  it('should have consistent command structure', () => {
    codyBeadsPlugin.commands.forEach(command => {
      expect(command).toHaveProperty('name');
      expect(command).toHaveProperty('description');
      expect(command).toHaveProperty('handler');
      expect(typeof command.handler).toBe('function');
    });
  });
});