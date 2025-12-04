import { Test, TestResult } from '@jest/test-result';
import { Sequencer } from '@jest/test-sequencer';

export default class IntegrationTestSequencer extends Sequencer {
  /**
   * Sort tests to ensure deterministic execution and proper dependencies
   */
  sort(tests: Array<Test>): Array<Test> {
    const testOrder = [
      // Configuration tests first
      /config/,
      // Core utilities
      /utils/,
      // GitHub client
      /github/,
      // Sync engine
      /sync/,
      // Commands
      /commands/,
      // Full integration tests
      /integration/,
      // End-to-end workflows
      /e2e/
    ];

    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      for (const pattern of testOrder) {
        const matchesA = pattern.test(pathA);
        const matchesB = pattern.test(pathB);

        if (matchesA && !matchesB) return -1;
        if (!matchesA && matchesB) return 1;
      }

      // If both match same pattern or none match, sort alphabetically
      return pathA.localeCompare(pathB);
    });
  }

  /**
   * Filter tests based on environment or other criteria
   */
  filter(tests: Array<Test>): Promise<Array<Test>> {
    const filteredTests = tests.filter(test => {
      // Skip tests marked as slow unless running in slow mode
      if (test.path.includes('.slow.') && !process.env.SLOW_TESTS) {
        return false;
      }

      // Skip tests requiring internet unless running online
      if (test.path.includes('.online.') && process.env.OFFLINE_TESTS) {
        return false;
      }

      return true;
    });

    return Promise.resolve(filteredTests);
  }

  /**
   * Shard tests for parallel execution
   */
  shard(tests: Array<Test>, shardIndex: number, totalShards: number): Array<Test> {
    const shardSize = Math.ceil(tests.length / totalShards);
    const startIndex = shardIndex * shardSize;
    const endIndex = Math.min(startIndex + shardSize, tests.length);

    return tests.slice(startIndex, endIndex);
  }
}