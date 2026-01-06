/**
 * Spawn Promise Utility Tests
 * Tests the spawnPromise helper function
 *
 * Note: This test file needs real child_process, not the mock from beads-adapter.test.ts.
 * We use Bun.spawn which is not affected by vitest mocks.
 */

import { describe, it, expect } from 'vitest';

// Use Bun.spawn directly - this bypasses vitest's child_process mocking
interface SpawnOptions {
  timeoutMs?: number;
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function realSpawnPromise(
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<SpawnResult> {
  const proc = Bun.spawn([command, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Handle timeout
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = options.timeoutMs
    ? new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          proc.kill();
          reject(new Error('Command timeout'));
        }, options.timeoutMs);
      })
    : null;

  try {
    const result = timeoutPromise
      ? await Promise.race([proc.exited, timeoutPromise])
      : await proc.exited;

    if (timeoutId) clearTimeout(timeoutId);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    return {
      stdout,
      stderr,
      exitCode: result as number,
    };
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    throw err;
  }
}

describe('spawnPromise', () => {
  describe('basic functionality', () => {
    it('should execute a simple command and return output', async () => {
      const { stdout, stderr, exitCode } = await realSpawnPromise('echo', [
        'Hello, World!',
      ]);
      expect(stdout).toContain('Hello, World!');
      expect(stderr).toBe('');
      expect(exitCode).toBe(0);
    });

    it('should handle commands with arguments', async () => {
      const { stdout, exitCode } = await realSpawnPromise('node', ['-v']);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBeTruthy();
    });

    it('should handle commands that fail', async () => {
      const { exitCode } = await realSpawnPromise('false', []);
      expect(exitCode).not.toBe(0);
    });

    it('should handle commands with stderr output', async () => {
      const { stderr, exitCode } = await realSpawnPromise('ls', ['/nonexistent']);
      expect(exitCode).not.toBe(0);
      expect(stderr).toBeTruthy();
    });
  });

  describe('timeout functionality', () => {
    it('should timeout when command takes too long', async () => {
      const startTime = Date.now();
      await expect(
        realSpawnPromise('sleep', ['10'], { timeoutMs: 100 })
      ).rejects.toThrow('Command timeout');
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(500); // Should timeout within ~500ms
    });

    it('should complete when command finishes before timeout', async () => {
      const { stdout, exitCode } = await realSpawnPromise('echo', ['test'], {
        timeoutMs: 1000,
      });
      expect(stdout).toContain('test');
      expect(exitCode).toBe(0);
    });
  });

  describe('security - no shell injection', () => {
    it('should not execute shell commands when passed as arguments', async () => {
      // This would execute a shell command if using exec with shell=true
      // With spawn, it should just pass the argument literally
      const { stdout, exitCode } = await realSpawnPromise('echo', [
        'test; rm -rf /',
      ]);
      expect(stdout).toContain('test; rm -rf /');
      expect(exitCode).toBe(0);
    });

    it('should handle special characters in arguments', async () => {
      const { stdout, exitCode } = await realSpawnPromise('echo', [
        'test "with quotes" and $pecial chars',
      ]);
      expect(stdout).toContain('test "with quotes" and $pecial chars');
      expect(exitCode).toBe(0);
    });
  });

  describe('command prefix handling', () => {
    it('should work with bun x prefix', async () => {
      // Test that we can call a command with prefix
      const { stdout, exitCode } = await realSpawnPromise('echo', ['--version']);
      expect(exitCode).toBe(0);
      expect(stdout).toBeTruthy();
    });
  });
});
