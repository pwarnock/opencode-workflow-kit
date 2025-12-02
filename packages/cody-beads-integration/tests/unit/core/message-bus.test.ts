/**
 * Unit Tests for Enhanced Message Bus
 * Tests performance optimizations, batching, and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InMemoryMessageBus, MessageBusFactory } from '../../src/core/agent-system/message-bus.js';
import { AgentMessage } from '../../src/core/agent-system/base.js';

describe('InMemoryMessageBus', () => {
  let messageBus: InMemoryMessageBus;

  beforeEach(() => {
    messageBus = MessageBusFactory.createInMemory({
      enableBatching: true,
      batchSize: 3,
      batchTimeout: 100,
      enableMetrics: true,
      metricsInterval: 1000
    });
  });

  afterEach(() => {
    messageBus.destroy();
  });

  describe('Basic Message Operations', () => {
    it('should send and receive messages', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      messageBus.subscribe('test-agent', async (msg) => {
        receivedMessages.push(msg);
      });

      const testMessage: AgentMessage = {
        id: 'test-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(testMessage);

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0]).toEqual(testMessage);
    });

    it('should handle message broadcasting', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      messageBus.subscribe('*', async (msg) => {
        receivedMessages.push(msg);
      });

      const broadcastMessage = {
        id: 'broadcast-1',
        from: 'sender',
        type: 'notification',
        payload: { alert: 'test' },
        timestamp: new Date(),
        priority: 'high'
      };

      await messageBus.broadcast(broadcastMessage);

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages.every(msg => msg.to === '*')).toBe(true);
    });

    it('should handle request-response pattern', async () => {
      messageBus.subscribe('responder', async (msg) => {
        if (msg.requiresResponse) {
          await messageBus.send({
            id: 'response-1',
            from: 'responder',
            to: msg.from,
            type: 'response',
            payload: { result: 'success' },
            timestamp: new Date(),
            priority: 'medium',
            correlationId: msg.correlationId
          });
        }
      });

      const response = await messageBus.request('responder', { action: 'test' });

      expect(response).toEqual({ result: 'success' });
    });
  });

  describe('Batching Functionality', () => {
    it('should batch messages when enabled', async () => {
      const processedBatches: AgentMessage[][] = [];
      
      // Override batch processing for testing
      (messageBus as any).processBatch = async function() {
        processedBatches.push(this.messageQueue.splice(0, this.config.batchSize));
      };

      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `batch-${i}`,
        from: 'sender',
        to: 'batch-test',
        type: 'request',
        payload: { index: i },
        timestamp: new Date(),
        priority: 'medium'
      }));

      // Send messages
      await Promise.all(messages.map(msg => messageBus.send(msg)));

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toHaveLength(3);
      expect(processedBatches[1]).toHaveLength(2);
    });

    it('should flush batch on timeout', async () => {
      const processedBatches: AgentMessage[][] = [];
      
      (messageBus as any).processBatch = async function() {
        processedBatches.push(this.messageQueue.splice(0, this.config.batchSize));
      };

      const message = {
        id: 'timeout-test',
        from: 'sender',
        to: 'batch-test',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      // Wait for timeout-based batch flush
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toHaveLength(1);
    });
  });

  describe('Performance Metrics', () => {
    it('should track message statistics', async () => {
      const stats = messageBus.getStats();
      
      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('received');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('pending');
    });

    it('should calculate performance metrics', async () => {
      const startTime = Date.now();
      
      await messageBus.send({
        id: 'perf-test',
        from: 'sender',
        to: 'perf-test',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      const metrics = messageBus.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('messageRate');
      expect(metrics).toHaveProperty('errorRate');
      expect(metrics).toHaveProperty('queueDepth');
      expect(metrics).toHaveProperty('pendingRequests');
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      let errorLogged = false;
      
      messageBus.subscribe('error-test', async () => {
        throw new Error('Handler error');
      });

      // Mock console.error to capture error logging
      const originalConsoleError = console.error;
      console.error = () => { errorLogged = true; };

      try {
        await messageBus.send({
          id: 'error-test',
          from: 'sender',
          to: 'error-test',
          type: 'request',
          payload: { test: true },
          timestamp: new Date(),
          priority: 'medium'
        });
      } finally {
        console.error = originalConsoleError;
      }

      expect(errorLogged).toBe(true);
    });

    it('should handle timeout errors', async () => {
      messageBus.subscribe('timeout-test', async () => {
        // Don't respond to trigger timeout
      });

      await expect(
        messageBus.request('timeout-test', { test: true }, 100)
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Message Size Validation', () => {
    it('should reject oversized messages', async () => {
      const largeMessage = {
        id: 'large-test',
        from: 'sender',
        to: 'test',
        type: 'request',
        payload: 'x'.repeat(2 * 1024 * 1024), // 2MB
        timestamp: new Date(),
        priority: 'medium'
      };

      await expect(
        messageBus.send(largeMessage)
      ).rejects.toThrow('exceeds maximum');
    });

    it('should accept normal sized messages', async () => {
      const normalMessage = {
        id: 'normal-test',
        from: 'sender',
        to: 'test',
        type: 'request',
        payload: 'x'.repeat(100), // Small message
        timestamp: new Date(),
        priority: 'medium'
      };

      await expect(messageBus.send(normalMessage)).resolves.toBeUndefined();
    });
  });

  describe('Subscription Management', () => {
    it('should handle multiple subscribers', async () => {
      const received1: AgentMessage[] = [];
      const received2: AgentMessage[] = [];
      
      messageBus.subscribe('multi-test', async (msg) => {
        received1.push(msg);
      });
      
      messageBus.subscribe('multi-test', async (msg) => {
        received2.push(msg);
      });

      const testMessage = {
        id: 'multi-test',
        from: 'sender',
        to: 'multi-test',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(testMessage);

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      expect(received1[0]).toEqual(received2[0]);
    });

    it('should handle unsubscribe correctly', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      const handler = async (msg: AgentMessage) => {
        receivedMessages.push(msg);
      };

      messageBus.subscribe('unsubscribe-test', handler);
      
      await messageBus.send({
        id: 'unsubscribe-test-1',
        from: 'sender',
        to: 'unsubscribe-test',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      expect(receivedMessages).toHaveLength(1);

      messageBus.unsubscribe('unsubscribe-test', handler);
      
      await messageBus.send({
        id: 'unsubscribe-test-2',
        from: 'sender',
        to: 'unsubscribe-test',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      // Should not receive second message
      expect(receivedMessages).toHaveLength(1);
    });
  });

  describe('Pattern Matching', () => {
    it('should match wildcard patterns', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      messageBus.subscribe('test.*', async (msg) => {
        receivedMessages.push(msg);
      });

      await messageBus.send({
        id: 'pattern-test',
        from: 'sender',
        to: 'test.agent',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      expect(receivedMessages).toHaveLength(1);
    });

    it('should match exact patterns', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      messageBus.subscribe('exact-match', async (msg) => {
        receivedMessages.push(msg);
      });

      await messageBus.send({
        id: 'exact-test',
        from: 'sender',
        to: 'exact-match',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      expect(receivedMessages).toHaveLength(1);
    });

    it('should not match non-matching patterns', async () => {
      const receivedMessages: AgentMessage[] = [];
      
      messageBus.subscribe('different.pattern', async (msg) => {
        receivedMessages.push(msg);
      });

      await messageBus.send({
        id: 'no-match-test',
        from: 'sender',
        to: 'exact-match',
        type: 'request',
        payload: { test: true },
        timestamp: new Date(),
        priority: 'medium'
      });

      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe('Resource Management', () => {
    it('should limit queue size', async () => {
      const maxQueueSize = 100;
      const busWithLimit = MessageBusFactory.createInMemory({
        maxQueueSize: maxQueueSize,
        enableBatching: false
      });

      // Fill queue beyond limit
      const messages = Array.from({ length: maxQueueSize + 10 }, (_, i) => ({
        id: `queue-test-${i}`,
        from: 'sender',
        to: 'queue-test',
        type: 'request',
        payload: { index: i },
        timestamp: new Date(),
        priority: 'low' // Low priority to avoid immediate processing
      }));

      // Send all messages
      await Promise.all(messages.map(msg => busWithLimit.send(msg)));

      const metrics = busWithLimit.getPerformanceMetrics();
      expect(metrics.queueDepth).toBeLessThanOrEqual(maxQueueSize);
    });

    it('should cleanup resources on destroy', () => {
      const bus = MessageBusFactory.createInMemory();
      
      // Add some state
      bus.subscribe('test', async () => {});
      bus.request('test', {});
      
      // Destroy
      bus.destroy();
      
      const stats = bus.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.sent).toBe(0);
      expect(stats.received).toBe(0);
    });
  });
});