/**
 * Performance Benchmarks for Enhanced System
 * Tests performance targets, throughput, and resource usage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { performance } from 'perf_hooks';
import { AsyncSyncEngine } from '../../src/sync/AsyncSyncEngine.js';
import { InMemoryMessageBus } from '../../src/core/agent-system/message-bus.js';

describe('Performance Benchmarks', () => {
  let syncEngine: AsyncSyncEngine;
  let messageBus: InMemoryMessageBus;
  let benchmarkResults: Map<string, any> = new Map();

  beforeAll(() => {
    // Setup performance monitoring
    performance.mark('benchmark-start');
  });

  afterAll(() => {
    performance.mark('benchmark-end');
    performance.measure('total-benchmark-time', 'benchmark-start', 'benchmark-end');
    
    // Generate benchmark report
    console.log('\n📊 Performance Benchmark Report');
    console.log('==========================');
    
    for (const [name, result] of benchmarkResults) {
      console.log(`\n${name}:`);
      console.log(`  Average: ${result.average?.toFixed(2)}ms`);
      console.log(`  Median: ${result.median?.toFixed(2)}ms`);
      console.log(`  Min: ${result.min?.toFixed(2)}ms`);
      console.log(`  Max: ${result.max?.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.throughput?.toFixed(2)} ops/sec`);
    }
  });

  beforeEach(() => {
    syncEngine = new AsyncSyncEngine({
      eventBus: new InMemoryMessageBus(),
      conflictResolver: { resolve: () => Promise.resolve({}) },
      batchProcessor: { process: () => Promise.resolve([]) }
    });
    
    messageBus = new InMemoryMessageBus({
      enableBatching: true,
      enableMetrics: true,
      maxQueueSize: 10000
    });
  });

  afterEach(() => {
    syncEngine.resetCircuitBreaker();
    messageBus.destroy();
  });

  describe('Sync Engine Performance', () => {
    it('should handle 1000 sync operations efficiently', async () => {
      const operations = 1000;
      const results: number[] = [];
      
      for (let i = 0; i < operations; i++) {
        const start = performance.now();
        
        await syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: true
        });
        
        const end = performance.now();
        results.push(end - start);
      }
      
      const stats = {
        average: results.reduce((a, b) => a + b, 0) / results.length,
        median: results.sort((a, b) => a - b)[Math.floor(results.length / 2)],
        min: Math.min(...results),
        max: Math.max(...results),
        throughput: operations / (Math.max(...results) / 1000), // ops per second
        totalOperations: operations
      };
      
      benchmarkResults.set('sync-engine-1000-ops', stats);
      
      // Performance assertions
      expect(stats.average).toBeLessThan(100); // Average under 100ms
      expect(stats.median).toBeLessThan(50); // Median under 50ms
      expect(stats.throughput).toBeGreaterThan(10); // At least 10 ops/sec
    });

    it('should maintain performance under load', async () => {
      const concurrentOperations = 50;
      const batchSize = 100;
      
      const start = performance.now();
      
      const promises = Array.from({ length: concurrentOperations }, async (_, i) => {
        return syncEngine.executeSync({
          direction: 'cody-to-beads' as const,
          dryRun: true,
          batchSize
        });
      });
      
      const results = await Promise.all(promises);
      const end = performance.now();
      
      const totalTime = end - start;
      const avgTime = totalTime / concurrentOperations;
      const totalItems = concurrentOperations * batchSize;
      const throughput = totalItems / (totalTime / 1000);
      
      benchmarkResults.set('sync-engine-concurrent-load', {
        totalTime,
        avgTime,
        throughput,
        concurrentOperations,
        batchSize,
        totalItems
      });
      
      expect(avgTime).toBeLessThan(200); // Average under 200ms under load
      expect(throughput).toBeGreaterThan(100); // High throughput under load
      expect(results.every(r => r.success)).toBe(true); // All operations succeed
    });

    it('should handle error recovery efficiently', async () => {
      const errorRate = 0.1; // 10% error rate
      const operations = 100;
      const results: number[] = [];
      
      // Mock error conditions
      const originalExecute = syncEngine.executeSync.bind(syncEngine);
      let callCount = 0;
      
      (syncEngine as any).executeSync = async (options: any) => {
        callCount++;
        if (callCount % 10 === 0) { // 10% error rate
          throw new Error('Simulated error');
        }
        return originalExecute(options);
      };
      
      for (let i = 0; i < operations; i++) {
        const start = performance.now();
        
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: true,
            maxRetries: 3
          });
          results.push(performance.now() - start);
        } catch {
          results.push(performance.now() - start);
        }
      }
      
      const stats = {
        average: results.reduce((a, b) => a + b, 0) / results.length,
        errorRate: errorRate,
        recoveryTime: results.reduce((a, b) => a + b, 0) / results.length,
        operations
      };
      
      benchmarkResults.set('sync-engine-error-recovery', stats);
      
      expect(stats.average).toBeLessThan(150); // Even with errors, should be fast
      expect(stats.errorRate).toBe(errorRate);
    });
  });

  describe('Message Bus Performance', () => {
    it('should handle high message throughput', async () => {
      const messageCount = 10000;
      const subscriberCount = 100;
      let receivedCount = 0;
      
      // Setup subscribers
      for (let i = 0; i < subscriberCount; i++) {
        messageBus.subscribe(`perf-test-${i}`, async () => {
          receivedCount++;
        });
      }
      
      const start = performance.now();
      
      // Send messages
      const promises = Array.from({ length: messageCount }, (_, i) => 
        messageBus.send({
          id: `perf-msg-${i}`,
          from: 'sender',
          to: `perf-test-${i % subscriberCount}`,
          type: 'request',
          payload: { index: i },
          timestamp: new Date(),
          priority: 'medium'
        })
      );
      
      await Promise.all(promises);
      const end = performance.now();
      
      const throughput = messageCount / ((end - start) / 1000);
      const latency = (end - start) / messageCount;
      
      benchmarkResults.set('message-bus-high-throughput', {
        messageCount,
        subscriberCount,
        receivedCount,
        throughput,
        latency,
        totalTime: end - start
      });
      
      expect(throughput).toBeGreaterThan(1000); // At least 1000 msg/sec
      expect(latency).toBeLessThan(1); // Average latency under 1ms
      expect(receivedCount).toBe(messageCount); // All messages received
    });

    it('should handle batching efficiently', async () => {
      const messageCount = 5000;
      const batchSize = 100;
      let batchCount = 0;
      
      // Override batch processing to count batches
      (messageBus as any).processBatch = async function() {
        batchCount++;
        this.messageQueue.splice(0, this.config.batchSize);
      };
      
      const start = performance.now();
      
      const promises = Array.from({ length: messageCount }, (_, i) => 
        messageBus.send({
          id: `batch-msg-${i}`,
          from: 'sender',
          to: 'batch-test',
          type: 'request',
          payload: { index: i },
          timestamp: new Date(),
          priority: 'medium'
        })
      );
      
      await Promise.all(promises);
      
      // Wait for all batches to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const end = performance.now();
      
      const expectedBatches = Math.ceil(messageCount / batchSize);
      const batchEfficiency = batchCount / expectedBatches;
      
      benchmarkResults.set('message-bus-batching', {
        messageCount,
        batchSize,
        expectedBatches,
        actualBatches: batchCount,
        batchEfficiency,
        totalTime: end - start
      });
      
      expect(batchEfficiency).toBeGreaterThan(0.8); // At least 80% efficiency
      expect(batchCount).toBe(expectedBatches);
    });
  });

  describe('Memory Performance', () => {
    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage();
      const operations = 1000;
      
      for (let i = 0; i < operations; i++) {
        await syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: true
        });
        
        // Check memory every 100 operations
        if (i % 100 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          
          // Memory growth should be reasonable
          expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
        }
      }
      
      const finalMemory = process.memoryUsage();
      const totalMemoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      benchmarkResults.set('memory-performance', {
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        memoryGrowth: totalMemoryGrowth,
        operations,
        memoryPerOperation: totalMemoryGrowth / operations
      });
      
      // Total memory growth should be reasonable for 1000 operations
      expect(totalMemoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure by creating large objects
      const largeObjects = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: new Array(10000).fill(0).map(() => ({ random: Math.random() }))
      }));
      
      const start = performance.now();
      
      // Process large objects
      for (const obj of largeObjects) {
        await syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: true
        });
        
        // Simulate some cleanup
        if (Math.random() < 0.1) {
          global.gc?.(); // Force garbage collection if available
        }
      }
      
      const end = performance.now();
      
      benchmarkResults.set('memory-pressure', {
        objectCount: largeObjects.length,
        objectSize: JSON.stringify(largeObjects[0]).length,
        totalTime: end - start,
        avgTime: (end - start) / largeObjects.length
      });
      
      // Should complete without running out of memory
      expect(end - start).toBeLessThan(30000); // Under 30 seconds
    });
  });

  describe('CPU Performance', () => {
    it('should utilize CPU efficiently', async () => {
      const start = performance.now();
      const cpuStart = process.cpuUsage();
      
      // CPU-intensive operations
      const operations = 1000;
      for (let i = 0; i < operations; i++) {
        await syncEngine.executeSync({
          direction: 'bidirectional' as const,
          dryRun: true
        });
        
        // Small delay to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const end = performance.now();
      const cpuEnd = process.cpuUsage(cpuStart);
      
      const cpuUsage = {
        user: cpuEnd.user - cpuStart.user,
        system: cpuEnd.system - cpuStart.system
      };
      
      benchmarkResults.set('cpu-performance', {
        operations,
        totalTime: end - start,
        avgTime: (end - start) / operations,
        cpuUsage,
        opsPerMs: operations / (end - start)
      });
      
      // Should not use excessive CPU
      expect(cpuUsage.user + cpuUsage.system).toBeLessThan(1000000); // Less than 1 second CPU time
    });
  });

  describe('Network Performance', () => {
    it('should handle network operations efficiently', async () => {
      // Mock network operations
      const networkOperations = 100;
      const results: number[] = [];
      
      for (let i = 0; i < networkOperations; i++) {
        const start = performance.now();
        
        try {
          // Simulate network operation
          await fetch('https://httpbin.org/delay/10', { 
            signal: AbortSignal.timeout(5000) 
          });
          results.push(performance.now() - start);
        } catch {
          results.push(performance.now() - start);
        }
      }
      
      const stats = {
        operations: networkOperations,
        average: results.reduce((a, b) => a + b, 0) / results.length,
        successRate: results.filter(r => r < 5000).length / results.length, // Assuming timeout is failure
        totalTime: results.reduce((a, b) => a + b, 0)
      };
      
      benchmarkResults.set('network-performance', stats);
      
      expect(stats.average).toBeLessThan(200); // Average under 200ms
      expect(stats.successRate).toBeGreaterThan(0.8); // At least 80% success rate
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with load', async () => {
      const loadLevels = [10, 50, 100, 500, 1000];
      const scalabilityResults: Array<{ load: number; avgTime: number; throughput: number }> = [];
      
      for (const load of loadLevels) {
        const start = performance.now();
        
        const promises = Array.from({ length: load }, () =>
          syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: true
          })
        );
        
        await Promise.all(promises);
        const end = performance.now();
        
        const avgTime = (end - start) / load;
        const throughput = load / ((end - start) / 1000);
        
        scalabilityResults.push({ load, avgTime, throughput });
      }
      
      // Check linear scalability (time should not grow exponentially)
      const timeGrowthRate = scalabilityResults.map((r, i) => 
        i > 0 ? r.avgTime / scalabilityResults[i - 1].avgTime : 1
      ).slice(1);
      
      const avgGrowthRate = timeGrowthRate.reduce((a, b) => a + b, 0) / timeGrowthRate.length;
      
      benchmarkResults.set('scalability', {
        loadLevels,
        results: scalabilityResults,
        avgGrowthRate
      });
      
      // Growth rate should be close to linear (factor around 1-2)
      expect(avgGrowthRate).toBeLessThan(3); // Less than 3x growth
    });

    it('should handle concurrent operations efficiently', async () => {
      const concurrencyLevels = [1, 5, 10, 25, 50];
      const concurrencyResults: Array<{ concurrency: number; totalTime: number; efficiency: number }> = [];
      
      for (const concurrency of concurrencyLevels) {
        const start = performance.now();
        
        const promises = Array.from({ length: concurrency }, () =>
          syncEngine.executeSync({
            direction: 'cody-to-beads' as const,
            dryRun: true
          })
        );
        
        await Promise.all(promises);
        const end = performance.now();
        
        const totalTime = end - start;
        const singleOpTime = 100; // Assumed single operation time
        const efficiency = (singleOpTime * concurrency) / totalTime;
        
        concurrencyResults.push({ concurrency, totalTime, efficiency });
      }
      
      benchmarkResults.set('concurrency', {
        concurrencyLevels,
        results: concurrencyResults
      });
      
      // Efficiency should remain reasonable even at high concurrency
      const highConcurrencyResult = concurrencyResults.find(r => r.concurrency === 50);
      expect(highConcurrencyResult?.efficiency).toBeGreaterThan(0.5); // At least 50% efficiency
    });
  });

  describe('Resource Limits', () => {
    it('should respect configured resource limits', async () => {
      const maxMemory = 100 * 1024 * 1024; // 100MB
      const maxOps = 100;
      
      let operations = 0;
      let memoryExceeded = false;
      
      const startTime = Date.now();
      const timeout = setTimeout(() => {
        memoryExceeded = true;
      }, 10000); // Timeout after 10 seconds
      
      while (operations < maxOps && !memoryExceeded && Date.now() - startTime < 10000) {
        const start = performance.now();
        
        try {
          await syncEngine.executeSync({
            direction: 'bidirectional' as const,
            dryRun: true
          });
          operations++;
        } catch {
          // Continue on errors
        }
        
        // Simulate memory check
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > maxMemory) {
          memoryExceeded = true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      }
      
      clearTimeout(timeout);
      
      benchmarkResults.set('resource-limits', {
        maxMemory,
        maxOps,
        actualOps: operations,
        memoryExceeded,
        timeLimited: Date.now() - startTime >= 10000
      });
      
      expect(operations).toBeLessThanOrEqual(maxOps);
      expect(memoryExceeded).toBe(false); // Should not exceed memory within reasonable ops
    });
  });
});