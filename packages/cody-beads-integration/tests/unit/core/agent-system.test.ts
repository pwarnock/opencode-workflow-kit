/**
 * Unit tests for Agent System Base Classes
 * Tests BaseAgent, specialized agents, AgentRegistry and message handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  BaseAgent,
  AgentMetadata,
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentHealth,
  AgentPermissions,
  AgentBehavior,
  AgentHook,
  GitAutomationAgent,
  LibraryResearcherAgent,
  CodyGeneralAgent,
  AgentRegistry,
  type MessageBus,
  type MessageHandler,
  type Logger,
  type Storage
} from '../../../src/core/agent-system/base.js';
import { InMemoryMessageBus } from '../../../src/core/agent-system/message-bus.js';

// Mock implementations
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockStorage: Storage = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  list: vi.fn(),
};

const createMockMessageBus = (): MessageBus => ({
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  broadcast: vi.fn(),
  request: vi.fn(),
});

const createMockContext = (messageBus: MessageBus): AgentContext => ({
  agentId: 'test-agent',
  sessionId: 'session-123',
  userId: 'user-456',
  workspace: '/test/workspace',
  environment: { NODE_ENV: 'test' },
  permissions: {
    tools: { git: true, read: true },
    fileSystem: { read: true, write: true, execute: false },
    network: { webfetch: true, websearch: false, context7: true },
    delegation: { canDelegate: true, allowedDelegates: ['git-automation'] },
  },
  messageBus,
  logger: mockLogger,
  storage: mockStorage,
});

describe('Agent Interfaces', () => {
  describe('AgentMetadata', () => {
    it('should create complete agent metadata', () => {
      const metadata: AgentMetadata = {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'A test agent for unit testing',
        version: '1.0.0',
        author: 'Test Author',
        category: 'primary',
        capabilities: ['git', 'sync', 'automation'],
        permissions: {
          tools: { git: true },
          fileSystem: { read: true, write: false, execute: false },
          network: { webfetch: true, websearch: false, context7: false },
          delegation: { canDelegate: false, allowedDelegates: [] },
        },
      };

      expect(metadata.id).toBe('test-agent');
      expect(metadata.category).toBe('primary');
      expect(metadata.capabilities).toContain('git');
      expect(metadata.permissions.tools.git).toBe(true);
    });
  });

  describe('AgentPermissions', () => {
    it('should represent agent permissions', () => {
      const permissions: AgentPermissions = {
        tools: { git: true, read: false, write: true },
        fileSystem: { read: true, write: true, execute: false },
        network: { webfetch: true, websearch: true, context7: false },
        delegation: { canDelegate: true, allowedDelegates: ['git-automation', 'library-researcher'] },
      };

      expect(permissions.tools.git).toBe(true);
      expect(permissions.tools.read).toBe(false);
      expect(permissions.fileSystem.execute).toBe(false);
      expect(permissions.delegation.allowedDelegates).toHaveLength(2);
    });
  });

  describe('AgentBehavior', () => {
    it('should define agent behavior settings', () => {
      const behavior: AgentBehavior = {
        conservative: true,
        confirmationRequired: true,
        contextPreservation: false,
        guidanceFocused: true,
        autoCommit: false,
        errorHandling: 'strict',
      };

      expect(behavior.conservative).toBe(true);
      expect(behavior.errorHandling).toBe('strict');
      expect(behavior.autoCommit).toBe(false);
    });
  });

  describe('AgentMessage', () => {
    it('should create valid agent messages', () => {
      const message: AgentMessage = {
        id: 'msg-123',
        from: 'agent-1',
        to: 'agent-2',
        type: 'request',
        payload: { action: 'sync', data: 'test' },
        timestamp: new Date(),
        priority: 'high',
        requiresResponse: true,
        correlationId: 'corr-456',
      };

      expect(message.type).toBe('request');
      expect(message.priority).toBe('high');
      expect(message.requiresResponse).toBe(true);
      expect(message.correlationId).toBe('corr-456');
    });

    it('should handle optional message fields', () => {
      const message: AgentMessage = {
        id: 'msg-789',
        from: 'system',
        to: '*',
        type: 'broadcast',
        payload: { notification: 'test' },
        timestamp: new Date(),
        priority: 'low',
      };

      expect(message.requiresResponse).toBeUndefined();
      expect(message.correlationId).toBeUndefined();
    });
  });
});

describe('BaseAgent', () => {
  class TestAgent extends BaseAgent {
    async execute(input: any): Promise<any> {
      return { success: true, input, agentId: this.config.metadata.id };
    }

    protected async setupMessageHandlers(): Promise<void> {
      this.registerHandler('test.*', this.handleTestMessage.bind(this));
      this.registerHandler('ping', this.handlePing.bind(this));
    }

    private async handleTestMessage(message: AgentMessage): Promise<void> {
      this.context.logger.info(`Test message: ${message.payload.data}`);
    }

    private async handlePing(message: AgentMessage): Promise<AgentMessage> {
      return {
        id: `test-response-${Date.now()}`,
        from: this.config.metadata.id,
        to: message.from,
        type: 'response',
        payload: { pong: true },
        timestamp: new Date(),
        priority: 'low',
      };
    }
  }

  let agent: TestAgent;
  let config: AgentConfig;
  let messageBus: MessageBus;
  let context: AgentContext;

  beforeEach(() => {
    messageBus = createMockMessageBus();
    context = createMockContext(messageBus);
    
    config = {
      metadata: {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent for unit testing',
        version: '1.0.0',
        author: 'Test',
        category: 'primary',
        capabilities: ['test'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: false,
        confirmationRequired: false,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'lenient',
      },
      environment: { TEST: 'true' },
      plugins: [],
      hooks: [],
    };

    agent = new TestAgent(config);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await agent.cleanup();
    } catch (error) {
      // Ignore cleanup errors if agent wasn't initialized
    }
  });

  it('should create agent with config', () => {
    expect(agent.getHealth().status).toBe('starting');
  });

  it('should initialize with context', async () => {
    await agent.initialize(context);
    
    expect(agent.getHealth().status).toBe('healthy');
    expect(mockLogger.info).toHaveBeenCalledWith('Agent test-agent initialized');
    expect(messageBus.subscribe).toHaveBeenCalledWith('test.*', expect.any(Function));
    expect(messageBus.subscribe).toHaveBeenCalledWith('ping', expect.any(Function));
  });

  it('should execute tasks', async () => {
    await agent.initialize(context);
    const result = await agent.execute({ task: 'test' });
    
    expect(result.success).toBe(true);
    expect(result.input).toEqual({ task: 'test' });
    expect(result.agentId).toBe('test-agent');
  });

  it('should check permissions correctly', async () => {
    await agent.initialize(context);
    
    expect(agent.hasPermission('git')).toBe(true);
    expect(agent.hasPermission('read')).toBe(true); // tools.read is true in mock
    expect(agent.hasPermission('fs:read')).toBe(true);
    expect(agent.hasPermission('fs:execute')).toBe(false);
    expect(agent.hasPermission('net:webfetch')).toBe(true);
    expect(agent.hasPermission('net:websearch')).toBe(false);
    expect(agent.hasPermission('delegate')).toBe(true);
  });

  it('should send messages', async () => {
    await agent.initialize(context);
    await agent.sendMessage('target-agent', 'notification', { data: 'test' });
    
    expect(messageBus.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'test-agent',
        to: 'target-agent',
        type: 'notification',
        payload: { data: 'test' },
        priority: 'medium',
      })
    );
  });

  it('should request from other agents', async () => {
    await agent.initialize(context);
    const mockResponse = { result: 'success' };
    (messageBus.request as any).mockResolvedValue(mockResponse);
    
    const result = await agent.requestFromAgent('target-agent', { action: 'test' });
    
    expect(messageBus.request).toHaveBeenCalledWith('target-agent', { action: 'test' }, 30000);
    expect(result).toEqual(mockResponse);
  });

  it('should delegate tasks to specialized agents', async () => {
    await agent.initialize(context);
    const mockResponse = { delegated: true };
    (messageBus.request as any).mockResolvedValue(mockResponse);
    
    const result = await agent.delegate('test-task', 'git-automation', { repo: 'test' });
    
    expect(messageBus.request).toHaveBeenCalledWith('git-automation', {
      type: 'delegate',
      task: 'test-task',
      payload: { repo: 'test' },
    }, 30000);
    expect(result).toEqual(mockResponse);
  });

  it('should reject delegation to unauthorized agents', async () => {
    await agent.initialize(context);
    
    await expect(
      agent.delegate('test-task', 'unauthorized-agent', {})
    ).rejects.toThrow('Not allowed to delegate to agent: unauthorized-agent');
  });

  it('should reject delegation without permission', async () => {
    const noDelegationConfig = { ...config };
    noDelegationConfig.metadata.permissions.delegation.canDelegate = false;
    const noDelegationAgent = new TestAgent(noDelegationConfig);
    await noDelegationAgent.initialize(context);
    
    await expect(
      noDelegationAgent.delegate('test-task', 'git-automation', {})
    ).rejects.toThrow('Agent does not have delegation permissions');
  });

  it('should cleanup properly', async () => {
    await agent.initialize(context);
    await agent.cleanup();
    
    expect(agent.getHealth().status).toBe('stopped');
    expect(mockLogger.info).toHaveBeenCalledWith('Agent test-agent cleaned up');
  });
});

describe('Specialized Agents', () => {
  let messageBus: MessageBus;
  let context: AgentContext;

  beforeEach(() => {
    messageBus = createMockMessageBus();
    context = createMockContext(messageBus);
    vi.clearAllMocks();
  });

  describe('GitAutomationAgent', () => {
    it('should create git automation agent', () => {
      const config: AgentConfig = {
        metadata: {
          id: 'git-automation',
          name: 'Git Automation Agent',
          description: 'Handles git operations',
          version: '1.0.0',
          author: 'System',
          category: 'specialized',
          capabilities: ['git', 'automation'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: true,
          confirmationRequired: true,
          contextPreservation: true,
          guidanceFocused: false,
          autoCommit: false,
          errorHandling: 'strict',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new GitAutomationAgent(config);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('should execute git operations', async () => {
      const config: AgentConfig = {
        metadata: {
          id: 'git-automation',
          name: 'Git Automation Agent',
          description: 'Handles git operations',
          version: '1.0.0',
          author: 'System',
          category: 'specialized',
          capabilities: ['git'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: true,
          confirmationRequired: true,
          contextPreservation: true,
          guidanceFocused: false,
          autoCommit: false,
          errorHandling: 'strict',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new GitAutomationAgent(config);
      await agent.initialize(context);
      const result = await agent.execute({ operation: 'status' });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Git operation completed');
    });
  });

  describe('LibraryResearcherAgent', () => {
    it('should create library researcher agent', () => {
      const config: AgentConfig = {
        metadata: {
          id: 'library-researcher',
          name: 'Library Researcher Agent',
          description: 'Handles library research',
          version: '1.0.0',
          author: 'System',
          category: 'specialized',
          capabilities: ['research', 'library'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: false,
          confirmationRequired: false,
          contextPreservation: true,
          guidanceFocused: true,
          autoCommit: false,
          errorHandling: 'lenient',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new LibraryResearcherAgent(config);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('should execute library research', async () => {
      const config: AgentConfig = {
        metadata: {
          id: 'library-researcher',
          name: 'Library Researcher Agent',
          description: 'Handles library research',
          version: '1.0.0',
          author: 'System',
          category: 'specialized',
          capabilities: ['research'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: false,
          confirmationRequired: false,
          contextPreservation: true,
          guidanceFocused: true,
          autoCommit: false,
          errorHandling: 'lenient',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new LibraryResearcherAgent(config);
      await agent.initialize(context);
      const result = await agent.execute({ query: 'react' });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Library research completed');
    });
  });

  describe('CodyGeneralAgent', () => {
    it('should create Cody general agent', () => {
      const config: AgentConfig = {
        metadata: {
          id: 'cody-general',
          name: 'Cody General Agent',
          description: 'Handles Cody workflows',
          version: '1.0.0',
          author: 'System',
          category: 'primary',
          capabilities: ['cody', 'workflow'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: false,
          confirmationRequired: false,
          contextPreservation: true,
          guidanceFocused: true,
          autoCommit: true,
          errorHandling: 'adaptive',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new CodyGeneralAgent(config);
      expect(agent).toBeInstanceOf(BaseAgent);
    });

    it('should execute Cody workflows', async () => {
      const config: AgentConfig = {
        metadata: {
          id: 'cody-general',
          name: 'Cody General Agent',
          description: 'Handles Cody workflows',
          version: '1.0.0',
          author: 'System',
          category: 'primary',
          capabilities: ['cody'],
          permissions: context.permissions,
        },
        behavior: {
          conservative: false,
          confirmationRequired: false,
          contextPreservation: true,
          guidanceFocused: true,
          autoCommit: true,
          errorHandling: 'adaptive',
        },
        environment: {},
        plugins: [],
        hooks: [],
      };

      const agent = new CodyGeneralAgent(config);
      await agent.initialize(context);
      const result = await agent.execute({ command: 'build' });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('Cody workflow completed');
    });
  });
});

describe('AgentRegistry', () => {
  let registry: AgentRegistry;
  let messageBus: MessageBus;
  let context: AgentContext;

  beforeEach(() => {
    registry = new AgentRegistry();
    messageBus = createMockMessageBus();
    context = createMockContext(messageBus);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await registry.shutdownAll();
  });

  it('should register and retrieve agent configs', () => {
    const config: AgentConfig = {
      metadata: {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent',
        version: '1.0.0',
        author: 'Test',
        category: 'primary',
        capabilities: ['test'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: false,
        confirmationRequired: false,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'lenient',
      },
      environment: {},
      plugins: [],
      hooks: [],
    };

    registry.register(config);
    const retrieved = registry.get('test-agent');
    
    expect(retrieved).toBe(config);
  });

  it('should list all registered agents', () => {
    const config1: AgentConfig = {
      metadata: {
        id: 'agent-1',
        name: 'Agent 1',
        description: 'First agent',
        version: '1.0.0',
        author: 'Test',
        category: 'primary',
        capabilities: ['test'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: false,
        confirmationRequired: false,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'lenient',
      },
      environment: {},
      plugins: [],
      hooks: [],
    };

    const config2: AgentConfig = { ...config1, metadata: { ...config1.metadata, id: 'agent-2', name: 'Agent 2' } };

    registry.register(config1);
    registry.register(config2);
    
    const allAgents = registry.list();
    expect(allAgents).toHaveLength(2);
    expect(allAgents.map(a => a.metadata.id)).toEqual(['agent-1', 'agent-2']);
  });

  it('should unregister agents', () => {
    const config: AgentConfig = {
      metadata: {
        id: 'test-agent',
        name: 'Test Agent',
        description: 'Test agent',
        version: '1.0.0',
        author: 'Test',
        category: 'primary',
        capabilities: ['test'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: false,
        confirmationRequired: false,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'lenient',
      },
      environment: {},
      plugins: [],
      hooks: [],
    };

    registry.register(config);
    registry.unregister('test-agent');
    
    const retrieved = registry.get('test-agent');
    expect(retrieved).toBeUndefined();
  });

  it('should create agent instances', async () => {
    const config: AgentConfig = {
      metadata: {
        id: 'git-automation',
        name: 'Git Automation',
        description: 'Git automation agent',
        version: '1.0.0',
        author: 'System',
        category: 'specialized',
        capabilities: ['git'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: true,
        confirmationRequired: true,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'strict',
      },
      environment: {},
      plugins: [],
      hooks: [],
    };

    registry.register(config);
    const instance = await registry.createInstance('git-automation', context);
    
    expect(instance).toBeInstanceOf(GitAutomationAgent);
    expect(instance.getHealth().status).toBe('healthy');
    
    const retrievedInstance = registry.getInstance('git-automation');
    expect(retrievedInstance).toBe(instance);
  });

  it('should throw error for unknown agent', async () => {
    await expect(
      registry.createInstance('unknown-agent', context)
    ).rejects.toThrow('Agent not found: unknown-agent');
  });

  it('should shutdown all instances', async () => {
    const config1: AgentConfig = {
      metadata: {
        id: 'agent-1',
        name: 'Agent 1',
        description: 'First agent',
        version: '1.0.0',
        author: 'Test',
        category: 'primary',
        capabilities: ['test'],
        permissions: context.permissions,
      },
      behavior: {
        conservative: false,
        confirmationRequired: false,
        contextPreservation: true,
        guidanceFocused: false,
        autoCommit: false,
        errorHandling: 'lenient',
      },
      environment: {},
      plugins: [],
      hooks: [],
    };

    const config2: AgentConfig = { ...config1, metadata: { ...config1.metadata, id: 'agent-2', name: 'Agent 2' } };

    registry.register(config1);
    registry.register(config2);
    
    await registry.createInstance('agent-1', context);
    await registry.createInstance('agent-2', context);
    
    expect(registry.getInstance('agent-1')).toBeDefined();
    expect(registry.getInstance('agent-2')).toBeDefined();
    
    await registry.shutdownAll();
    
    expect(registry.getInstance('agent-1')).toBeUndefined();
    expect(registry.getInstance('agent-2')).toBeUndefined();
  });
});