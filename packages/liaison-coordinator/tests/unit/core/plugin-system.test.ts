/**
 * Unit tests for Plugin System Base Classes
 * Tests BasePlugin, TrackerPlugin, VisualizerPlugin, HookPlugin and related interfaces
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import {
  BasePlugin,
  TrackerPlugin,
  VisualizerPlugin,
  HookPlugin,
  PluginContext,
  PluginMetadata,
  PluginHealth,
  Task,
  Dashboard,
  ExportFormat,
  PluginFactory,
  PluginRegistry,
  type Logger,
  type Storage,
  type EventEmitter,
  type HookConfig
} from '../../../src/core/plugin-system/base.js';

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

const mockEventEmitter: EventEmitter = {
  on: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
};

const mockContext: PluginContext = {
  config: { test: true },
  logger: mockLogger,
  storage: mockStorage,
  events: mockEventEmitter,
};

describe('Plugin Interfaces', () => {
  describe('PluginMetadata', () => {
    it('should validate complete plugin metadata', () => {
      const metadata: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin for unit testing',
        author: 'Test Author',
        dependencies: ['dep1', 'dep2'],
        permissions: ['read', 'write'],
      };

      expect(metadata.name).toBe('test-plugin');
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.dependencies).toEqual(['dep1', 'dep2']);
      expect(metadata.permissions).toEqual(['read', 'write']);
    });

    it('should accept minimal plugin metadata', () => {
      const metadata: PluginMetadata = {
        name: 'minimal-plugin',
        version: '0.1.0',
        description: 'Minimal test plugin',
        author: 'Test',
      };

      expect(metadata.dependencies).toBeUndefined();
      expect(metadata.permissions).toBeUndefined();
    });
  });

  describe('PluginHealth', () => {
    it('should represent different health states', () => {
      const healthy: PluginHealth = {
        status: 'healthy',
        lastCheck: new Date(),
        metrics: { uptime: 100 },
      };

      const degraded: PluginHealth = {
        status: 'degraded',
        message: 'Slow response times',
        lastCheck: new Date(),
      };

      expect(healthy.status).toBe('healthy');
      expect(degraded.status).toBe('degraded');
      expect(degraded.message).toBe('Slow response times');
    });
  });

  describe('Task Interface', () => {
    it('should create valid task objects', () => {
      const task: Task = {
        id: 'task-123',
        title: 'Test Task',
        description: 'A test task for unit testing',
        status: 'open',
        priority: 'medium',
        tags: ['test', 'unit'],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { source: 'test' },
      };

      expect(task.id).toBe('task-123');
      expect(task.status).toBe('open');
      expect(task.priority).toBe('medium');
      expect(task.tags).toContain('test');
    });

    it('should handle optional task fields', () => {
      const task: Task = {
        id: 'task-456',
        title: 'Minimal Task',
        description: 'Minimal task definition',
        status: 'closed',
        priority: 'low',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
        assignee: 'test-user',
        dueDate: new Date(),
      };

      expect(task.assignee).toBe('test-user');
      expect(task.dueDate).toBeInstanceOf(Date);
    });
  });
});

describe('BasePlugin', () => {
  let plugin: TestPlugin;
  let metadata: PluginMetadata;

  beforeEach(() => {
    metadata = {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test',
    };
    plugin = new TestPlugin(metadata);
    vi.clearAllMocks();
  });

  it('should create plugin with metadata', () => {
    expect(plugin.getMetadata()).toEqual(metadata);
  });

  it('should initialize with context', async () => {
    await plugin.initialize(mockContext);
    expect((plugin as any).context).toBe(mockContext);
    expect(mockLogger.info).toHaveBeenCalledWith('Test plugin initialized');
  });

  it('should cleanup properly', async () => {
    await plugin.initialize(mockContext);
    await plugin.cleanup();
    expect(mockLogger.info).toHaveBeenCalledWith('Test plugin cleaned up');
  });

  it('should validate configuration', async () => {
    const validConfig = { test: true };
    const invalidConfig = { test: false };

    expect(await plugin.validateConfig(validConfig)).toBe(true);
    expect(await plugin.validateConfig(invalidConfig)).toBe(false);
  });

  it('should return health status', async () => {
    const health = await plugin.getHealth();
    expect(health.status).toBe('healthy');
    expect(health.metrics).toEqual({ custom: 'metric' });
    expect(health.lastCheck).toBeInstanceOf(Date);
  });
});

describe('TrackerPlugin', () => {
  class TestTrackerPlugin extends TrackerPlugin {
    async initialize(context: PluginContext): Promise<void> {
      this.context = context;
    }

    async cleanup(): Promise<void> {
      // Cleanup implementation
    }

    async validateConfig(config: Record<string, any>): Promise<boolean> {
      return !!config.trackerUrl;
    }

    async getHealth(): Promise<PluginHealth> {
      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    }

    async syncTasks(): Promise<Task[]> {
      return [
        {
          id: 'tracked-1',
          title: 'Tracked Task 1',
          description: 'First tracked task',
          status: 'open',
          priority: 'high',
          tags: ['tracked'],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        },
      ];
    }

    async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
      this.context.logger.info(`Updating task ${taskId}`, updates);
    }

    async createTask(task: Omit<Task, 'id'>): Promise<Task> {
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}`,
      };
      this.context.logger.info('Created new task', newTask);
      return newTask;
    }

    async deleteTask(taskId: string): Promise<void> {
      this.context.logger.info(`Deleted task ${taskId}`);
    }

    async getDependencies(taskId: string): Promise<string[]> {
      return [`dep-${taskId}-1`, `dep-${taskId}-2`];
    }

    async updateDependencies(taskId: string, dependencies: string[]): Promise<void> {
      this.context.logger.info(`Updated dependencies for ${taskId}`, dependencies);
    }
  }

  let tracker: TestTrackerPlugin;
  let metadata: PluginMetadata;

  beforeEach(() => {
    metadata = {
      name: 'test-tracker',
      version: '1.0.0',
      description: 'Test tracker plugin',
      author: 'Test',
    };
    tracker = new TestTrackerPlugin(metadata);
    vi.clearAllMocks();
  });

  it('should sync tasks from external system', async () => {
    await tracker.initialize(mockContext);
    const tasks = await tracker.syncTasks();
    
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('tracked-1');
    expect(tasks[0].title).toBe('Tracked Task 1');
  });

  it('should update task status', async () => {
    await tracker.initialize(mockContext);
    await tracker.updateTask('task-123', { status: 'closed' });
    
    expect(mockLogger.info).toHaveBeenCalledWith('Updating task task-123', { status: 'closed' });
  });

  it('should create new task', async () => {
    await tracker.initialize(mockContext);
    const taskData: Omit<Task, 'id'> = {
      title: 'New Task',
      description: 'New task description',
      status: 'open',
      priority: 'medium',
      tags: ['new'],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    const newTask = await tracker.createTask(taskData);
    
    expect(newTask.id).toMatch(/^task-\d+$/);
    expect(newTask.title).toBe('New Task');
    expect(mockLogger.info).toHaveBeenCalledWith('Created new task', expect.any(Object));
  });

  it('should delete task', async () => {
    await tracker.initialize(mockContext);
    await tracker.deleteTask('task-456');
    
    expect(mockLogger.info).toHaveBeenCalledWith('Deleted task task-456');
  });

  it('should get task dependencies', async () => {
    await tracker.initialize(mockContext);
    const deps = await tracker.getDependencies('task-789');
    
    expect(deps).toEqual(['dep-task-789-1', 'dep-task-789-2']);
  });

  it('should update task dependencies', async () => {
    await tracker.initialize(mockContext);
    const newDeps = ['dep-1', 'dep-2', 'dep-3'];
    await tracker.updateDependencies('task-abc', newDeps);
    
    expect(mockLogger.info).toHaveBeenCalledWith('Updated dependencies for task-abc', newDeps);
  });
});

describe('VisualizerPlugin', () => {
  class TestVisualizerPlugin extends VisualizerPlugin {
    async initialize(context: PluginContext): Promise<void> {
      this.context = context;
    }

    async cleanup(): Promise<void> {
      // Cleanup implementation
    }

    async validateConfig(config: Record<string, any>): Promise<boolean> {
      return !!config.template;
    }

    async getHealth(): Promise<PluginHealth> {
      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    }

    async render(tasks: Task[]): Promise<string> {
      return `# Task Report\n${tasks.map(t => `- ${t.title}`).join('\n')}`;
    }

    async generateDashboard(tasks: Task[]): Promise<Dashboard> {
      return {
        title: 'Test Dashboard',
        sections: [
          {
            title: 'Summary',
            content: `Total tasks: ${tasks.length}`,
            type: 'list',
          },
        ],
        metadata: { taskCount: tasks.length },
      };
    }

    async export(tasks: Task[], format: ExportFormat): Promise<string> {
      switch (format) {
        case 'markdown':
          return this.render(tasks);
        case 'json':
          return JSON.stringify(tasks, null, 2);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    }

    getSupportedFormats(): ExportFormat[] {
      return ['markdown', 'json'];
    }
  }

  let visualizer: TestVisualizerPlugin;
  let metadata: PluginMetadata;
  let sampleTasks: Task[];

  beforeEach(() => {
    metadata = {
      name: 'test-visualizer',
      version: '1.0.0',
      description: 'Test visualizer plugin',
      author: 'Test',
    };
    visualizer = new TestVisualizerPlugin(metadata);
    sampleTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'First task',
        status: 'open',
        priority: 'high',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
      {
        id: 'task-2',
        title: 'Task 2',
        description: 'Second task',
        status: 'closed',
        priority: 'low',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
    ];
    vi.clearAllMocks();
  });

  it('should render tasks as markdown', async () => {
    await visualizer.initialize(mockContext);
    const rendered = await visualizer.render(sampleTasks);
    
    expect(rendered).toContain('# Task Report');
    expect(rendered).toContain('- Task 1');
    expect(rendered).toContain('- Task 2');
  });

  it('should generate dashboard', async () => {
    await visualizer.initialize(mockContext);
    const dashboard = await visualizer.generateDashboard(sampleTasks);
    
    expect(dashboard.title).toBe('Test Dashboard');
    expect(dashboard.sections).toHaveLength(1);
    expect(dashboard.sections[0].title).toBe('Summary');
    expect(dashboard.sections[0].content).toBe('Total tasks: 2');
    expect(dashboard.metadata.taskCount).toBe(2);
  });

  it('should export tasks in different formats', async () => {
    await visualizer.initialize(mockContext);
    
    const markdown = await visualizer.export(sampleTasks, 'markdown');
    expect(markdown).toContain('# Task Report');
    
    const json = await visualizer.export(sampleTasks, 'json');
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('task-1');
    
    await expect(visualizer.export(sampleTasks, 'pdf' as ExportFormat)).rejects.toThrow('Unsupported format: pdf');
  });

  it('should return supported formats', () => {
    const formats = visualizer.getSupportedFormats();
    expect(formats).toEqual(['markdown', 'json']);
  });
});

describe('HookPlugin', () => {
  class TestHookPlugin extends HookPlugin {
    private registered = false;

    async initialize(context: PluginContext): Promise<void> {
      this.context = context;
    }

    async cleanup(): Promise<void> {
      if (this.registered) {
        await this.unregisterHooks();
        this.registered = false;
      }
    }

    async validateConfig(config: Record<string, any>): Promise<boolean> {
      return Array.isArray(config.events);
    }

    async getHealth(): Promise<PluginHealth> {
      return {
        status: 'healthy',
        lastCheck: new Date(),
      };
    }

    async registerHooks(): Promise<void> {
      this.context.events.on('task.created', this.handleTaskCreated.bind(this));
      this.context.events.on('task.updated', this.handleTaskUpdated.bind(this));
      this.registered = true;
    }

    async unregisterHooks(): Promise<void> {
      this.context.events.off('task.created', this.handleTaskCreated.bind(this));
      this.context.events.off('task.updated', this.handleTaskUpdated.bind(this));
      this.registered = false;
    }

    getHookConfig(): HookConfig {
      return {
        events: ['task.created', 'task.updated'],
        priority: 10,
        condition: 'task.priority === "high"',
      };
    }

    private handleTaskCreated(task: Task): void {
      this.context.logger.info('Task created', task);
    }

    private handleTaskUpdated(task: Task): void {
      this.context.logger.info('Task updated', task);
    }
  }

  let hookPlugin: TestHookPlugin;
  let metadata: PluginMetadata;

  beforeEach(() => {
    metadata = {
      name: 'test-hook',
      version: '1.0.0',
      description: 'Test hook plugin',
      author: 'Test',
    };
    hookPlugin = new TestHookPlugin(metadata);
    vi.clearAllMocks();
  });

  it('should register hooks', async () => {
    await hookPlugin.initialize(mockContext);
    await hookPlugin.registerHooks();
    
    expect(mockEventEmitter.on).toHaveBeenCalledWith('task.created', expect.any(Function));
    expect(mockEventEmitter.on).toHaveBeenCalledWith('task.updated', expect.any(Function));
  });

  it('should unregister hooks', async () => {
    await hookPlugin.initialize(mockContext);
    await hookPlugin.registerHooks();
    await hookPlugin.unregisterHooks();
    
    expect(mockEventEmitter.off).toHaveBeenCalledWith('task.created', expect.any(Function));
    expect(mockEventEmitter.off).toHaveBeenCalledWith('task.updated', expect.any(Function));
  });

  it('should return hook configuration', () => {
    const config = hookPlugin.getHookConfig();
    
    expect(config.events).toEqual(['task.created', 'task.updated']);
    expect(config.priority).toBe(10);
    expect(config.condition).toBe('task.priority === "high"');
  });

  it('should cleanup and unregister hooks', async () => {
    await hookPlugin.initialize(mockContext);
    await hookPlugin.registerHooks();
    await hookPlugin.cleanup();
    
    expect(mockEventEmitter.off).toHaveBeenCalledTimes(2);
  });
});

// Test class definitions for reuse
class TestPlugin extends BasePlugin {
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info('Test plugin initialized');
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Test plugin cleaned up');
  }

  async validateConfig(config: Record<string, any>): Promise<boolean> {
    return config.test === true;
  }

  async getHealth(): Promise<PluginHealth> {
    return {
      status: 'healthy',
      lastCheck: new Date(),
      metrics: { custom: 'metric' },
    };
  }
}

class TestPluginFactory implements PluginFactory {
  private pluginName: string;

  constructor(name: string) {
    this.pluginName = name;
  }

  async create(config: Record<string, any>): Promise<BasePlugin> {
    const metadata: PluginMetadata = {
      name: this.pluginName,
      version: '1.0.0',
      description: `Plugin ${this.pluginName} created by factory`,
      author: 'Factory',
    };

    const plugin = new TestPlugin(metadata);
    await plugin.initialize({
      ...mockContext,
      config,
    });
    return plugin;
  }

  getMetadata(): PluginMetadata {
    return {
      name: this.pluginName,
      version: '1.0.0',
      description: `Factory created plugin ${this.pluginName}`,
      author: 'Factory',
    };
  }

  async validateConfig(config: Record<string, any>): Promise<boolean> {
    return config.factoryEnabled === true;
  }
}

describe('PluginFactory', () => {
  it('should create plugin through factory', async () => {
    const factory = new TestPluginFactory('factory-plugin');
    const config = { factoryEnabled: true };
    
    const plugin = await factory.create(config);
    expect(plugin).toBeInstanceOf(TestPlugin);
    expect(plugin.getMetadata().name).toBe('factory-plugin');
  });

  it('should validate factory config', async () => {
    const factory = new TestPluginFactory('test-plugin');
    
    expect(await factory.validateConfig({ factoryEnabled: true })).toBe(true);
    expect(await factory.validateConfig({ factoryEnabled: false })).toBe(false);
  });

  it('should return factory metadata', () => {
    const factory = new TestPluginFactory('test-plugin');
    const metadata = factory.getMetadata();
    
    expect(metadata.name).toBe('test-plugin');
    expect(metadata.version).toBe('1.0.0');
  });
});

describe('PluginRegistry', () => {
  class TestPluginRegistry implements PluginRegistry {
    private factories = new Map<string, PluginFactory>();

    register(factory: PluginFactory): void {
      this.factories.set(factory.getMetadata().name, factory);
    }

    unregister(name: string): void {
      this.factories.delete(name);
    }

    get(name: string): PluginFactory | undefined {
      return this.factories.get(name);
    }

    list(): PluginFactory[] {
      return Array.from(this.factories.values());
    }

    search(query: string): PluginFactory[] {
      const lowerQuery = query.toLowerCase();
      return Array.from(this.factories.values()).filter(factory => {
        const metadata = factory.getMetadata();
        return (
          metadata.name.toLowerCase().includes(lowerQuery) ||
          metadata.description.toLowerCase().includes(lowerQuery) ||
          metadata.author.toLowerCase().includes(lowerQuery)
        );
      });
    }
  }

  let registry: TestPluginRegistry;
  let factory1: TestPluginFactory;
  let factory2: TestPluginFactory;

  beforeEach(() => {
    registry = new TestPluginRegistry();
    factory1 = new TestPluginFactory('factory-plugin-1');
    factory2 = new TestPluginFactory('factory-plugin-2');
  });

  it('should register and retrieve factories', () => {
    registry.register(factory1);
    
    const retrieved = registry.get('factory-plugin-1');
    expect(retrieved).toBe(factory1);
  });

  it('should list all factories', () => {
    registry.register(factory1);
    registry.register(factory2);
    
    const allFactories = registry.list();
    expect(allFactories).toHaveLength(2);
  });

  it('should unregister factories', () => {
    registry.register(factory1);
    registry.unregister('factory-plugin-1');
    
    const retrieved = registry.get('factory-plugin-1');
    expect(retrieved).toBeUndefined();
  });

  it('should search factories', () => {
    registry.register(factory1);
    
    const results = registry.search('factory');
    expect(results).toHaveLength(1);
    expect(results[0]).toBe(factory1);
    
    const noResults = registry.search('nonexistent');
    expect(noResults).toHaveLength(0);
  });
});