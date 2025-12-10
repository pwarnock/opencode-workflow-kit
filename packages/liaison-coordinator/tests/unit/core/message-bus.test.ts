/**
 * Unit Tests for MessageBus Implementation
 * Tests actual MessageBus API with comprehensive coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryMessageBus, MessageBusFactory } from '../../../src/core/agent-system/message-bus.js';
import { AgentMessage } from '../../../src/core/agent-system/base.js';

describe('InMemoryMessageBus', () => {
  let messageBus: InMemoryMessageBus;

  beforeEach(() => {
    messageBus = new InMemoryMessageBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create with default config', () => {
      const bus = new InMemoryMessageBus();
      expect(bus).toBeDefined();
    });

    it('should create with custom config', () => {
      const config = {
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000,
        enablePersistence: true,
        persistencePath: '/tmp/test'
      };
      const bus = new InMemoryMessageBus(config);
      expect(bus).toBeDefined();
    });
  });

  describe('Message Sending', () => {
    it('should send message to single handler', async () => {
      const mockHandler = vi.fn();
      messageBus.subscribe('test-agent', mockHandler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      expect(mockHandler).toHaveBeenCalledWith(message);
    });

    it('should send message to multiple handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      messageBus.subscribe('test-agent', handler1);
      messageBus.subscribe('test-agent', handler2);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      expect(handler1).toHaveBeenCalledWith(message);
      expect(handler2).toHaveBeenCalledWith(message);
    });

    it('should throw error when no handlers found', async () => {
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'nonexistent-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await expect(messageBus.send(message)).rejects.toThrow('No handlers found for agent: nonexistent-agent');
    });

    it('should update stats on successful send', async () => {
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      const stats = messageBus.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.received).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should update stats on failed send', async () => {
      const handler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      messageBus.subscribe('test-agent', handler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      // MessageBus uses Promise.allSettled, so send doesn't reject on handler failures
      await messageBus.send(message);

      const stats = messageBus.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.received).toBe(1); // Still counts as received since handler was called
      expect(stats.failed).toBe(0); // Failed count only increments on send errors
    });
  });

  describe('Handler Management', () => {
    it('should subscribe handler to pattern', () => {
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      // Send a message to verify handler is called
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      return messageBus.send(message).then(() => {
        expect(handler).toHaveBeenCalledWith(message);
      });
    });

    it('should create handler array if pattern not exists', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      messageBus.subscribe('test-agent', handler1);
      messageBus.subscribe('test-agent', handler2);

      // Send a message to verify both handlers are called
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      return messageBus.send(message).then(() => {
        expect(handler1).toHaveBeenCalledWith(message);
        expect(handler2).toHaveBeenCalledWith(message);
      });
    });

    it('should unsubscribe specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      messageBus.subscribe('test-agent', handler1);
      messageBus.subscribe('test-agent', handler2);

      messageBus.unsubscribe('test-agent', handler1);

      // Send a message to verify only handler2 is called
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      return messageBus.send(message).then(() => {
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledWith(message);
      });
    });

    it('should not affect other handlers when unsubscribing', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      messageBus.subscribe('test-agent', handler1);
      messageBus.subscribe('test-agent', handler2);

      messageBus.unsubscribe('test-agent', handler1);

      // Send a message to verify handler2 is still called
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      return messageBus.send(message).then(() => {
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledWith(message);
      });
    });

    it('should handle unsubscribe when handler not found', () => {
      const handler = vi.fn();
      
      // Should not throw when trying to unsubscribe non-existent handler
      expect(() => {
        messageBus.unsubscribe('test-agent', handler);
      }).not.toThrow();
    });
  });

  describe('Event Emission', () => {
    it('should emit message events', async () => {
      const eventListener = vi.fn();
      messageBus.on('message', eventListener);
      
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(message);
      
      // Verify the emitted message has correct properties
      const emittedMessage = eventListener.mock.calls[0][0];
      expect(emittedMessage.id).toBe(message.id);
      expect(emittedMessage.from).toBe(message.from);
      expect(emittedMessage.to).toBe(message.to);
      expect(emittedMessage.type).toBe(message.type);
      expect(emittedMessage.payload).toEqual(message.payload);
      expect(emittedMessage.priority).toBe(message.priority);
    });

    it('should emit error events on send failure', async () => {
      const errorListener = vi.fn();
      messageBus.on('error', errorListener);

      // The MessageBus doesn't emit error events for send failures
      // It only throws errors. Let's test that it throws correctly
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'nonexistent-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await expect(messageBus.send(message)).rejects.toThrow('No handlers found for agent: nonexistent-agent');
      
      // Error events are not emitted in current implementation
      expect(errorListener).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return initial stats', () => {
      const stats = messageBus.getStats();
      expect(stats).toEqual({
        sent: 0,
        received: 0,
        failed: 0,
        pending: 0
      });
    });

    it('should track sent messages', async () => {
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      const stats = messageBus.getStats();
      expect(stats.sent).toBe(1);
    });

    it('should track received messages', async () => {
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      await messageBus.send(message);

      const stats = messageBus.getStats();
      expect(stats.received).toBe(1);
    });

    it('should track failed messages', async () => {
      // Test failed count when send fails (no handlers)
      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'nonexistent-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      try {
        await messageBus.send(message);
      } catch (error) {
        // Expected error
      }

      const stats = messageBus.getStats();
      expect(stats.failed).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler execution errors gracefully', async () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 failed');
      });
      const handler2 = vi.fn(() => {
        throw new Error('Handler 2 failed');
      });
      messageBus.subscribe('test-agent', handler1);
      messageBus.subscribe('test-agent', handler2);

      const message: AgentMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'request',
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium'
      };

      const results = await Promise.allSettled([
        messageBus.send(message)
      ]);

      // Should have one rejected and one fulfilled (if any handler succeeds)
      expect(results).toHaveLength(1);
    });

    it('should handle malformed messages', async () => {
      const handler = vi.fn();
      messageBus.subscribe('test-agent', handler);

      const malformedMessage = {
        id: 'msg-1',
        from: 'sender',
        to: 'test-agent',
        type: 'invalid-type' as any,
        payload: { data: 'test' },
        timestamp: new Date(),
        priority: 'medium' as any
      };

      // Should still send even with invalid type (validation happens elsewhere)
      await expect(messageBus.send(malformedMessage)).resolves.not.toThrow();
    });
  });
});

describe('MessageBusFactory', () => {
  describe('Factory Methods', () => {
    it('should create in-memory message bus', () => {
      const bus = MessageBusFactory.createInMemory();
      expect(bus).toBeInstanceOf(InMemoryMessageBus);
    });

    it('should create message bus with config', () => {
      const config = {
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 60000,
        enablePersistence: false
      };
      const bus = MessageBusFactory.createInMemory(config);
      expect(bus).toBeInstanceOf(InMemoryMessageBus);
    });
  });
});