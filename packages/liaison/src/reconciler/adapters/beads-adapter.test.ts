/**
 * Beads Adapter Tests
 * Note: These tests are structural; full integration requires actual bd CLI
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { BeadsAdapter } from './beads-adapter';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

describe('BeadsAdapter', () => {
  describe('name', () => {
    it('returns beads', () => {
      const adapter = new BeadsAdapter();
      expect(adapter.name()).toBe('beads');
    });

    it('initializes with useBunX false by default', () => {
      const adapter = new BeadsAdapter(false);
      expect(adapter.name()).toBe('beads');
    });

    it('initializes with useBunX true', () => {
      const adapter = new BeadsAdapter(true);
      expect(adapter.name()).toBe('beads');
    });
  });

  describe('createTask', () => {
    let adapter: BeadsAdapter;
    const spawnMock = spawn as unknown as Mock;

    beforeEach(() => {
      adapter = new BeadsAdapter();
      spawnMock.mockReset();

      // Default mock implementation to return successful JSON
      spawnMock.mockImplementation(() => {
        const cp = new EventEmitter() as any;
        cp.stdout = new EventEmitter();
        cp.stderr = new EventEmitter();
        cp.kill = vi.fn();

        // Emit success data on next tick
        setTimeout(() => {
          cp.stdout.emit('data', JSON.stringify({
            id: 'TASK-123',
            title: 'Test Task',
            description: 'Test Description',
            status: 'open',
            priority: 1,
            issue_type: 'task',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          cp.emit('close', 0);
        }, 0);

        return cp;
      });
    });

    it('passes arguments without double escaping', async () => {
      const input = {
        title: 'Task "with" quotes',
        description: "Description 'with' quotes",
        assignedTo: 'User "Name"'
      };

      await adapter.createTask(input);

      expect(spawnMock).toHaveBeenCalled();
      // The first call, second argument (args array)
      const args = spawnMock.mock.calls[0][1];

      // Verify title is NOT wrapped in extra quotes
      const titleArg = args.find((arg: string) => arg.startsWith('--title='));
      expect(titleArg).toBe(`--title=${input.title}`);

      // Verify description is NOT wrapped in extra quotes
      const descArg = args.find((arg: string) => arg.startsWith('--description='));
      expect(descArg).toBe(`--description=${input.description}`);

      // Verify assigned-to is NOT wrapped in extra quotes
      const assignArg = args.find((arg: string) => arg.startsWith('--assigned-to='));
      expect(assignArg).toBe(`--assigned-to=${input.assignedTo}`);
    });
  });
});
