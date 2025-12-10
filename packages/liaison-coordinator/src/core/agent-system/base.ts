/**
 * Refactored Agent System with Modular Architecture
 * Enhanced permission system with role-based access
 * Inter-agent communication protocols
 */

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'primary' | 'specialized' | 'utility';
  capabilities: string[];
  permissions: AgentPermissions;
}

export interface AgentPermissions {
  tools: Record<string, boolean>;
  fileSystem: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  network: {
    webfetch: boolean;
    websearch: boolean;
    context7: boolean;
  };
  delegation: {
    canDelegate: boolean;
    allowedDelegates: string[];
  };
}

export interface AgentConfig {
  metadata: AgentMetadata;
  behavior: AgentBehavior;
  environment: Record<string, string>;
  plugins: string[];
  hooks: AgentHook[];
}

export interface AgentBehavior {
  conservative: boolean;
  confirmationRequired: boolean;
  contextPreservation: boolean;
  guidanceFocused: boolean;
  autoCommit: boolean;
  errorHandling: 'strict' | 'lenient' | 'adaptive';
}

export interface AgentHook {
  event: string;
  action: string;
  condition?: string;
  priority: number;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'request' | 'response' | 'notification' | 'broadcast';
  payload: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requiresResponse?: boolean;
  correlationId?: string;
}

export interface AgentContext {
  agentId: string;
  sessionId: string;
  userId?: string;
  workspace: string;
  environment: Record<string, string>;
  permissions: AgentPermissions;
  messageBus: MessageBus;
  logger: Logger;
  storage: Storage;
}

export interface MessageBus {
  send(message: AgentMessage): Promise<void>;
  subscribe(pattern: string, handler: MessageHandler): void;
  unsubscribe(pattern: string, handler: MessageHandler): void;
  broadcast(message: Omit<AgentMessage, 'to'>): Promise<void>;
  request(target: string, payload: any, timeout?: number): Promise<any>;
}

export interface MessageHandler {
  (message: AgentMessage): Promise<void | AgentMessage>;
}

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

export interface Storage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected context!: AgentContext;
  protected messageHandlers: Map<string, MessageHandler[]> = new Map();
  protected healthStatus: AgentHealth;

  constructor(config: AgentConfig) {
    this.config = config;
    this.healthStatus = {
      status: 'starting',
      lastCheck: new Date(),
      metrics: {},
    };
  }

  /**
   * Initialize the agent with context
   */
  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
    await this.setupMessageHandlers();
    await this.loadPlugins();
    this.healthStatus.status = 'healthy';
    this.context.logger.info(`Agent ${this.config.metadata.id} initialized`);
  }

  /**
   * Main execution method
   */
  abstract execute(input: any): Promise<any>;

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.messageHandlers.clear();
    this.healthStatus.status = 'stopped';
    this.context.logger.info(`Agent ${this.config.metadata.id} cleaned up`);
  }

  /**
   * Get agent health status
   */
  getHealth(): AgentHealth {
    this.healthStatus.lastCheck = new Date();
    return { ...this.healthStatus };
  }

  /**
   * Send message to another agent
   */
  async sendMessage(to: string, type: AgentMessage['type'], payload: any): Promise<void> {
    const message: AgentMessage = {
      id: this.generateMessageId(),
      from: this.config.metadata.id,
      to,
      type,
      payload,
      timestamp: new Date(),
      priority: 'medium',
    };

    await this.context.messageBus.send(message);
  }

  /**
   * Request action from another agent
   */
  async requestFromAgent(target: string, payload: any, timeout = 30000): Promise<any> {
    return this.context.messageBus.request(target, payload, timeout);
  }

  /**
   * Check if agent has permission for action
   */
  hasPermission(action: string, _resource?: string): boolean {
    const permissions = this.config.metadata.permissions;
    
    // Check tool permissions
    if (permissions.tools[action] !== undefined) {
      return permissions.tools[action];
    }

    // Check file system permissions
    if (action.startsWith('fs:')) {
      const fsAction = action.replace('fs:', '');
      return (permissions.fileSystem as any)[fsAction] || false;
    }

    // Check network permissions
    if (action.startsWith('net:')) {
      const netAction = action.replace('net:', '');
      return (permissions.network as any)[netAction] || false;
    }

    // Check delegation permissions
    if (action === 'delegate') {
      return permissions.delegation.canDelegate;
    }

    return false;
  }

  /**
   * Delegate task to specialized agent
   */
  async delegate(task: string, targetAgent: string, payload: any): Promise<any> {
    if (!this.hasPermission('delegate')) {
      throw new Error('Agent does not have delegation permissions');
    }

    if (!this.config.metadata.permissions.delegation.allowedDelegates.includes(targetAgent)) {
      throw new Error(`Not allowed to delegate to agent: ${targetAgent}`);
    }

    return this.requestFromAgent(targetAgent, {
      type: 'delegate',
      task,
      payload,
    });
  }

  /**
   * Setup message handlers
   */
  protected abstract setupMessageHandlers(): Promise<void>;

  /**
   * Load agent plugins
   */
  protected async loadPlugins(): Promise<void> {
    // Plugin loading implementation
    for (const pluginName of this.config.plugins) {
      try {
        // Load plugin implementation
        this.context.logger.debug(`Loading plugin: ${pluginName}`);
      } catch (error) {
        this.context.logger.error(`Failed to load plugin ${pluginName}`, error as Error);
      }
    }
  }

  /**
   * Register message handler
   */
  protected registerHandler(pattern: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(pattern)) {
      this.messageHandlers.set(pattern, []);
    }
    this.messageHandlers.get(pattern)!.push(handler);
    this.context.messageBus.subscribe(pattern, handler);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${this.config.metadata.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update health status
   */
  protected updateHealth(status: AgentHealth['status'], message?: string): void {
    this.healthStatus.status = status;
    this.healthStatus.lastCheck = new Date();
    if (message) {
      this.healthStatus.message = message;
    }
  }
}

export interface AgentHealth {
  status: 'starting' | 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  lastCheck: Date;
  message?: string;
  metrics?: Record<string, any>;
}

/**
 * Specialized agent for git operations
 */
export class GitAutomationAgent extends BaseAgent {
  protected async setupMessageHandlers(): Promise<void> {
    this.registerHandler('git.*', this.handleGitRequest.bind(this));
    this.registerHandler('sync.request', this.handleSyncRequest.bind(this));
  }

  async execute(_input: any): Promise<any> {
    // Git automation implementation
    return { success: true, result: 'Git operation completed' };
  }

  private async handleGitRequest(message: AgentMessage): Promise<void> {
    // Handle git-specific requests
    this.context.logger.info(`Handling git request: ${message.payload.operation}`);
  }

  private async handleSyncRequest(message: AgentMessage): Promise<void> {
    // Handle sync requests
    this.context.logger.info(`Handling sync request: ${message.payload.type}`);
  }
}

/**
 * Specialized agent for library research
 */
export class LibraryResearcherAgent extends BaseAgent {
  protected async setupMessageHandlers(): Promise<void> {
    this.registerHandler('library.*', this.handleLibraryRequest.bind(this));
    this.registerHandler('context7.*', this.handleContext7Request.bind(this));
  }

  async execute(_input: any): Promise<any> {
    // Library research implementation
    return { success: true, result: 'Library research completed' };
  }

  private async handleLibraryRequest(message: AgentMessage): Promise<void> {
    // Handle library research requests
    this.context.logger.info(`Handling library request: ${message.payload.query}`);
  }

  private async handleContext7Request(message: AgentMessage): Promise<void> {
    // Handle Context7 requests
    this.context.logger.info(`Handling Context7 request: ${message.payload.library}`);
  }
}

/**
 * Primary agent for Cody workflows
 */
export class CodyGeneralAgent extends BaseAgent {
  protected async setupMessageHandlers(): Promise<void> {
    this.registerHandler('cody.*', this.handleCodyRequest.bind(this));
    this.registerHandler('help.request', this.handleHelpRequest.bind(this));
  }

  async execute(_input: any): Promise<any> {
    // Cody general workflow implementation
    return { success: true, result: 'Cody workflow completed' };
  }

  private async handleCodyRequest(message: AgentMessage): Promise<void> {
    // Handle Cody workflow requests
    this.context.logger.info(`Handling Cody request: ${message.payload.command}`);
  }

  private async handleHelpRequest(message: AgentMessage): Promise<void> {
    // Handle help requests
    this.context.logger.info(`Handling help request: ${message.payload.topic}`);
  }
}

/**
 * Agent registry and factory
 */
export class AgentRegistry {
  private agents = new Map<string, AgentConfig>();
  private instances = new Map<string, BaseAgent>();

  register(config: AgentConfig): void {
    this.agents.set(config.metadata.id, config);
  }

  unregister(agentId: string): void {
    this.agents.delete(agentId);
    const instance = this.instances.get(agentId);
    if (instance) {
      instance.cleanup();
      this.instances.delete(agentId);
    }
  }

  get(agentId: string): AgentConfig | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  async createInstance(agentId: string, context: AgentContext): Promise<BaseAgent> {
    const config = this.agents.get(agentId);
    if (!config) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    let agent: BaseAgent;
    
    // Create appropriate agent instance based on category
    switch (config.metadata.category) {
      case 'specialized':
        if (agentId.includes('git')) {
          agent = new GitAutomationAgent(config);
        } else if (agentId.includes('library')) {
          agent = new LibraryResearcherAgent(config);
        } else {
          agent = new CodyGeneralAgent(config);
        }
        break;
      case 'primary':
        agent = new CodyGeneralAgent(config);
        break;
      default:
        agent = new CodyGeneralAgent(config);
    }

    await agent.initialize(context);
    this.instances.set(agentId, agent);
    return agent;
  }

  getInstance(agentId: string): BaseAgent | undefined {
    return this.instances.get(agentId);
  }

  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.instances.values()).map(agent => agent.cleanup());
    await Promise.all(shutdownPromises);
    this.instances.clear();
  }
}