/**
 * Abstract base classes for the TaskFlow plugin system
 * Provides extensible architecture for trackers, visualizers, and hooks
 */

export interface PluginContext {
  config: Record<string, any>;
  logger: Logger;
  storage: Storage;
  events: EventEmitter;
  permissions?: string[];
}

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  permissions?: string[];
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface Storage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export interface EventEmitter {
  on(event: string, listener: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

/**
 * Abstract base class for all plugins
 */
export abstract class BasePlugin {
  protected context!: PluginContext;
  protected metadata: PluginMetadata;

  constructor(metadata: PluginMetadata) {
    this.metadata = metadata;
  }

  /**
   * Initialize the plugin with context
   */
  abstract initialize(context: PluginContext): Promise<void>;

  /**
   * Cleanup resources when plugin is unloaded
   */
  abstract cleanup(): Promise<void>;

  /**
   * Get plugin metadata
   */
  getMetadata(): PluginMetadata {
    return this.metadata;
  }

  /**
   * Validate plugin configuration
   */
  abstract validateConfig(config: Record<string, any>): Promise<boolean>;

  /**
   * Get plugin health status
   */
  abstract getHealth(): Promise<PluginHealth>;
}

export interface PluginHealth {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  lastCheck: Date;
  metrics?: Record<string, any>;
}

/**
 * Abstract base class for task trackers
 */
export abstract class TrackerPlugin extends BasePlugin {
  /**
   * Sync tasks from external system
   */
  abstract syncTasks(): Promise<Task[]>;

  /**
   * Update task status in external system
   */
  abstract updateTask(taskId: string, updates: Partial<Task>): Promise<void>;

  /**
   * Create new task in external system
   */
  abstract createTask(task: Omit<Task, "id">): Promise<Task>;

  /**
   * Delete task from external system
   */
  abstract deleteTask(taskId: string): Promise<void>;

  /**
   * Get task dependencies
   */
  abstract getDependencies(taskId: string): Promise<string[]>;

  /**
   * Update task dependencies
   */
  abstract updateDependencies(
    taskId: string,
    dependencies: string[],
  ): Promise<void>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "closed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  assignee?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  metadata: Record<string, any>;
}

/**
 * Abstract base class for visualizers
 */
export abstract class VisualizerPlugin extends BasePlugin {
  /**
   * Render tasks in specific format
   */
  abstract render(tasks: Task[]): Promise<string>;

  /**
   * Generate dashboard view
   */
  abstract generateDashboard(tasks: Task[]): Promise<Dashboard>;

  /**
   * Export tasks in different formats
   */
  abstract export(tasks: Task[], format: ExportFormat): Promise<string>;

  /**
   * Get supported export formats
   */
  abstract getSupportedFormats(): ExportFormat[];
}

export interface Dashboard {
  title: string;
  sections: DashboardSection[];
  metadata: Record<string, any>;
}

export interface DashboardSection {
  title: string;
  content: string;
  type: "table" | "chart" | "list" | "custom";
}

export type ExportFormat = "markdown" | "html" | "json" | "csv" | "pdf";

/**
 * Abstract base class for hooks
 */
export abstract class HookPlugin extends BasePlugin {
  /**
   * Register event listeners
   */
  abstract registerHooks(): Promise<void>;

  /**
   * Unregister event listeners
   */
  abstract unregisterHooks(): Promise<void>;

  /**
   * Get hook configuration
   */
  abstract getHookConfig(): HookConfig;
}

export interface HookConfig {
  events: string[];
  priority: number;
  condition?: string;
}

/**
 * Plugin factory interface
 */
export interface PluginFactory {
  create(config: Record<string, any>): Promise<BasePlugin>;
  getMetadata(): PluginMetadata;
  validateConfig(config: Record<string, any>): Promise<boolean>;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
  register(factory: PluginFactory): void;
  unregister(name: string): void;
  get(name: string): PluginFactory | undefined;
  list(): PluginFactory[];
  search(query: string): PluginFactory[];
}
