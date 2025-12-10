/**
 * Message Bus Implementation for Inter-Agent Communication
 * Provides reliable message delivery and routing
 */

import { AgentMessage, MessageHandler } from "./base.js";
import { EventEmitter } from "events";

export interface MessageBusConfig {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enablePersistence: boolean;
  persistencePath?: string;
}

export interface MessageStats {
  sent: number;
  received: number;
  failed: number;
  pending: number;
}

/**
 * In-memory message bus implementation
 */
export class InMemoryMessageBus extends EventEmitter {
  private handlers = new Map<string, MessageHandler[]>();
  private pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private config: MessageBusConfig;
  private stats: MessageStats = {
    sent: 0,
    received: 0,
    failed: 0,
    pending: 0,
  };

  constructor(config: Partial<MessageBusConfig> = {}) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      enablePersistence: false,
      ...config,
    };
  }

  /**
   * Send message to specific agent
   */
  async send(message: AgentMessage): Promise<void> {
    try {
      this.stats.sent++;

      // Emit message for routing
      this.emit("message", message);

      // Find and execute handlers
      const handlers = this.findHandlers(message.to);
      if (handlers.length === 0) {
        throw new Error(`No handlers found for agent: ${message.to}`);
      }

      // Execute all handlers concurrently
      await Promise.allSettled(
        handlers.map((handler) => this.executeHandler(handler, message)),
      );

      this.stats.received++;
    } catch (error) {
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * Subscribe to message patterns
   */
  subscribe(pattern: string, handler: MessageHandler): void {
    if (!this.handlers.has(pattern)) {
      this.handlers.set(pattern, []);
    }
    this.handlers.get(pattern)!.push(handler);
  }

  /**
   * Unsubscribe from message patterns
   */
  unsubscribe(pattern: string, handler: MessageHandler): void {
    const patternHandlers = this.handlers.get(pattern);
    if (patternHandlers) {
      const index = patternHandlers.indexOf(handler);
      if (index >= 0) {
        patternHandlers.splice(index, 1);
      }
      if (patternHandlers.length === 0) {
        this.handlers.delete(pattern);
      }
    }
  }

  /**
   * Broadcast message to all agents
   */
  async broadcast(message: Omit<AgentMessage, "to">): Promise<void> {
    const broadcastMessage: AgentMessage = {
      ...message,
      to: "*",
    };

    // Send to all handlers
    for (const [pattern, handlers] of this.handlers) {
      if (this.matchesPattern(pattern, "*")) {
        await Promise.allSettled(
          handlers.map((handler) =>
            this.executeHandler(handler, broadcastMessage),
          ),
        );
      }
    }
  }

  /**
   * Send request and wait for response
   */
  async request(target: string, payload: any, timeout?: number): Promise<any> {
    const id = this.generateRequestId();
    const message: AgentMessage = {
      id,
      from: "system",
      to: target,
      type: "request",
      payload,
      timestamp: new Date(),
      priority: "medium",
      requiresResponse: true,
      correlationId: id,
    };

    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.config.timeout;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${id}`));
      }, timeoutMs);

      // Store request handler
      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Send message
      this.send(message).catch((error) => {
        clearTimeout(timeoutHandle);
        this.pendingRequests.delete(id);
        reject(error);
      });

      this.stats.pending++;
    });
  }

  /**
   * Handle response message
   */
  async handleResponse(message: AgentMessage): Promise<void> {
    if (!message.correlationId) {
      return;
    }

    const pendingRequest = this.pendingRequests.get(message.correlationId);
    if (pendingRequest) {
      clearTimeout(pendingRequest.timeout);
      this.pendingRequests.delete(message.correlationId);
      this.stats.pending--;

      if (message.type === "response") {
        pendingRequest.resolve(message.payload);
      } else {
        pendingRequest.reject(
          new Error(`Unexpected message type: ${message.type}`),
        );
      }
    }
  }

  /**
   * Get message statistics
   */
  getStats(): MessageStats {
    return { ...this.stats };
  }

  /**
   * Clear all handlers and pending requests
   */
  clear(): void {
    this.handlers.clear();

    // Clear all pending requests
    for (const [, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error("Message bus cleared"));
    }
    this.pendingRequests.clear();

    // Reset stats
    this.stats = {
      sent: 0,
      received: 0,
      failed: 0,
      pending: 0,
    };
  }

  /**
   * Find handlers for a target
   */
  private findHandlers(target: string): MessageHandler[] {
    const handlers: MessageHandler[] = [];

    for (const [pattern, patternHandlers] of this.handlers) {
      if (this.matchesPattern(pattern, target)) {
        handlers.push(...patternHandlers);
      }
    }

    return handlers;
  }

  /**
   * Check if pattern matches target
   */
  private matchesPattern(pattern: string, target: string): boolean {
    if (pattern === "*") {
      return true;
    }

    if (pattern.includes("*")) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      return regex.test(target);
    }

    return pattern === target;
  }

  /**
   * Execute message handler with error handling
   */
  private async executeHandler(
    handler: MessageHandler,
    message: AgentMessage,
  ): Promise<void> {
    try {
      const result = await handler(message);

      // If handler returns a message, send it
      if (result && message.requiresResponse && message.correlationId) {
        await this.send({
          ...result,
          to: message.from,
          type: "response",
          correlationId: message.correlationId,
        });
      }
    } catch (error) {
      console.error(`Error in message handler:`, error);

      // Send error response if required
      if (message.requiresResponse && message.correlationId) {
        await this.send({
          id: this.generateRequestId(),
          from: "system",
          to: message.from,
          type: "response",
          payload: {
            error: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date(),
          priority: "high",
          correlationId: message.correlationId,
        });
      }
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Message bus factory
 */
export class MessageBusFactory {
  static create(config: MessageBusConfig): InMemoryMessageBus {
    return new InMemoryMessageBus(config);
  }

  static createInMemory(
    config?: Partial<MessageBusConfig>,
  ): InMemoryMessageBus {
    return new InMemoryMessageBus(config);
  }
}
