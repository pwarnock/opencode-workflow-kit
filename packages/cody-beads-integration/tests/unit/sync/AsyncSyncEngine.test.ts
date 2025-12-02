/**
 * Comprehensive Unit Tests for Enhanced Sync Engine
 * Tests all reliability features, error handling, and performance metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AsyncSyncEngine, ErrorCodes } from '../../src/sync/AsyncSyncEngine.js';
import { EventEmitter } from 'events';

describe('AsyncSyncEngine', () => {
  let syncEngine: AsyncSyncEngine;
  let mockConfig: any;
  let eventBus: EventEmitter;

  beforeEach(() => {
    eventBus = new EventEmitter();
    mockConfig = {
      eventBus,
      conflictResolver: {
        resolve: jest.fn()
      },
      batchProcessor: {
        process: jest.fn()
      }
    };
    syncEngine = new AsyncSyncEngine(mockConfig);
  });

  afterEach(() => {
    syncEngine.resetCircuitBreaker();
  });

  describe('Basic Sync Operations', () => {
    it('should execute successful sync', async () => {
      const options = {
        direction: 'bidirectional' as const,
        dryRun: false
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.issuesSynced).toBeGreaterThanOrEqual(0);
      expect(result.prsSynced).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle dry run sync', async () => {
      const options = {
        direction: 'cody-to-beads' as const,
        dryRun: true
      };

      const result = await syncEngine.executeSync(options);

      expect(result.success).toBe(true);
      expect(result.message).toContain('dry run');
    });

    it('should reject concurrent sync attempts', async () => {
      const options = {
        direction: 'bidirectional' as const,
        dryRun: false
      };

      const promise1 = syncEngine.executeSync(options);
      const promise2 = syncEngine.executeSync(options);

      await expect(promise1).resolves.toBeDefined();
      await expect(promise2).rejects.toThrow('SYNC_IN_PROGRESS');
    });
  });

  describe('Circuit Breaker Functionality', () => {
    it('should open circuit breaker after threshold failures', async () => {
      // Force multiple failures
      for (let i = 0; i < 6; i++) {
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: false
          });
        } catch {
          // Ignore failures for this test
        }
      }

      const status = await syncEngine.getStatus();
      expect(status.circuitBreakerState.state).toBe('open');
    });

    it('should close circuit breaker after timeout', async () => {
      // Force circuit breaker open
      for (let i = 0; i < 6; i++) {
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: false
          });
        } catch {
          // Ignore failures
        }
      }

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 65000));

      const status = await syncEngine.getStatus();
      expect(status.circuitBreakerState.state).toBe('half-open');
    });

    it('should reject sync when circuit breaker is open', async () => {
      // Force circuit breaker open
      for (let i = 0; i < 6; i++) {
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: false
          });
        } catch {
          // Ignore failures
        }
      }

      await expect(
        syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: false
        })
      ).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      mockConfig.conflictResolver.resolve.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { resolved: true };
      });

      const startTime = Date.now();
      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false,
        maxRetries: 3,
        retryDelay: 100
      });

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2); // 3 total attempts - 1 success
      expect(Date.now() - startTime).toBeGreaterThan(300); // Should have delays
    });

    it('should exhaust retries after max attempts', async () => {
      mockConfig.conflictResolver.resolve.mockImplementation(() => {
        throw new Error('Persistent failure');
      });

      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false,
        maxRetries: 2
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('RETRY_EXHAUSTED');
    });
  });

  describe('Data Integrity Checks', () => {
    it('should perform data integrity verification', async () => {
      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      expect(result.dataIntegrity).toBeDefined();
      expect(result.dataIntegrity.verified).toBeDefined();
      expect(result.dataIntegrity.checksumsMatched).toBeGreaterThanOrEqual(0);
      expect(result.dataIntegrity.checksumsFailed).toBeGreaterThanOrEqual(0);
    });

    it('should detect data integrity issues', async () => {
      // Mock integrity check to fail
      const originalMethod = syncEngine.performDataIntegrityCheck;
      syncEngine.performDataIntegrityCheck = async () => ({
        verified: false,
        checksumsMatched: 8,
        checksumsFailed: 2
      });

      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      expect(result.dataIntegrity.verified).toBe(false);
      expect(result.dataIntegrity.checksumsFailed).toBe(2);

      // Restore original method
      syncEngine.performDataIntegrityCheck = originalMethod;
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate throughput metrics', async () => {
      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      expect(result.throughput).toBeGreaterThanOrEqual(0);
      expect(typeof result.throughput).toBe('number');
    });

    it('should track sync history', async () => {
      // Execute multiple syncs
      await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      await syncEngine.executeSync({
        direction: 'cody-to-beads' as const,
        dryRun: false
      });

      const stats = await syncEngine.getStatistics();
      expect(stats.totalSyncs).toBe(2);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly', async () => {
      // Execute syncs with mixed results
      mockConfig.conflictResolver.resolve.mockImplementationOnce(() => {
        throw new Error('Failure');
      });

      try {
        await syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: false
        });
      } catch {
        // Ignore failure
      }

      await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      const stats = await syncEngine.getStatistics();
      expect(stats.successRate).toBe(50); // 1 success out of 2 attempts
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const result = await syncEngine.executeSync({
        direction: 'invalid' as any,
        dryRun: false
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('VALIDATION_ERROR');
    });

    it('should handle timeout errors', async () => {
      mockConfig.conflictResolver.resolve.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 35000));
      });

      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false,
        timeout: 30000
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('TIMEOUT_ERROR');
    });

    it('should handle network errors', async () => {
      mockConfig.conflictResolver.resolve.mockImplementation(() => {
        const error = new Error('Network unreachable');
        (error as any).code = 'ENOTFOUND';
        throw error;
      });

      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      expect(result.success).toBe(false);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate sync options', async () => {
      const invalidOptions = {
        direction: null as any,
        dryRun: false,
        batchSize: 2000 // Invalid: exceeds max
      };

      const result = await syncEngine.executeSync(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('batchSize'))).toBe(true);
    });

    it('should validate date options', async () => {
      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false,
        since: 'invalid-date' as any
      });

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Since option'))).toBe(true);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide accurate status information', async () => {
      const status = await syncEngine.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('circuitBreakerState');
      expect(status).toHaveProperty('recentSyncs');
      expect(status).toHaveProperty('successRate');
    });

    it('should reset circuit breaker on command', async () => {
      // Force circuit breaker open
      for (let i = 0; i < 6; i++) {
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: false
          });
        } catch {
          // Ignore failures
        }
      }

      let status = await syncEngine.getStatus();
      expect(status.circuitBreakerState.state).toBe('open');

      // Reset circuit breaker
      syncEngine.resetCircuitBreaker();

      status = await syncEngine.getStatus();
      expect(status.circuitBreakerState.state).toBe('closed');
      expect(status.circuitBreakerState.failures).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sync results', async () => {
      // Mock empty results
      mockConfig.batchProcessor.process.mockResolvedValue([]);

      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false
      });

      expect(result.success).toBe(true);
      expect(result.issuesSynced).toBe(0);
      expect(result.prsSynced).toBe(0);
      expect(result.throughput).toBe(0);
    });

    it('should handle large batch sizes', async () => {
      const result = await syncEngine.executeSync({
        direction: 'bidirectional' as const,
        dryRun: false,
        batchSize: 1000
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle concurrent status requests', async () => {
      const statusPromises = Array.from({ length: 10 }, () => syncEngine.getStatus());

      const statuses = await Promise.all(statusPromises);

      statuses.forEach(status => {
        expect(status).toHaveProperty('isRunning');
        expect(status).toHaveProperty('circuitBreakerState');
      });
    });
  });
});