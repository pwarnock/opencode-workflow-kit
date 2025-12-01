/**
 * Core types for OpenCode Workflow Kit
 */

import { z } from 'zod';

// Base Configuration Schema
export const BaseConfigSchema = z.object({
  version: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional()
});

// Plugin Configuration
export const PluginConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  enabled: z.boolean().default(true),
  config: z.record(z.any()).optional()
});

// Validation Result
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string())
});

// Cache Entry
export const CacheEntrySchema = z.object({
  key: z.string(),
  value: z.any(),
  expires: z.number().optional(),
  created: z.number()
});

// Security Context
export const SecurityContextSchema = z.object({
  user: z.string(),
  permissions: z.array(z.string()),
  session: z.string().optional(),
  timestamp: z.number()
});

// GitHub Configuration
export const GitHubConfigSchema = z.object({
  token: z.string().optional(),
  username: z.string().optional(),
  repository: z.string().optional(),
  apiUrl: z.string().url().optional(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    maxRequests: z.number().default(5000),
    windowMs: z.number().default(3600000) // 1 hour
  }).optional()
});

// Cody Configuration
export const CodyConfigSchema = z.object({
  enabled: z.boolean().default(true),
  workspacePath: z.string().optional(),
  configPath: z.string().optional(),
  agents: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: z.record(z.any()).optional()
  })).optional(),
  commands: z.array(z.object({
    name: z.string(),
    description: z.string(),
    handler: z.string()
  })).optional()
});

// Beads Configuration
export const BeadsConfigSchema = z.object({
  enabled: z.boolean().default(true),
  dataPath: z.string().optional(),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().default(300000), // 5 minutes
  issueTypes: z.array(z.string()).default(['bug', 'feature', 'task', 'epic', 'chore']),
  priorities: z.array(z.number()).default([0, 1, 2, 3, 4])
});

// Sync Configuration
export const SyncConfigSchema = z.object({
  enabled: z.boolean().default(true),
  direction: z.enum(['bidirectional', 'github-to-beads', 'beads-to-github']).default('bidirectional'),
  conflictResolution: z.enum(['manual', 'github-wins', 'beads-wins', 'most-recent']).default('manual'),
  batchProcessing: z.object({
    enabled: z.boolean().default(true),
    batchSize: z.number().default(50),
    delay: z.number().default(1000)
  }).optional(),
  filters: z.object({
    labels: z.array(z.string()).optional(),
    states: z.array(z.string()).optional(),
    assignees: z.array(z.string()).optional()
  }).optional()
});

// Unified Configuration
export const UnifiedConfigSchema = z.object({
  version: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  github: GitHubConfigSchema.optional(),
  cody: CodyConfigSchema.optional(),
  beads: BeadsConfigSchema.optional(),
  sync: SyncConfigSchema.optional(),
  plugins: z.array(PluginConfigSchema).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
    console: z.boolean().default(true)
  }).optional()
});

// API Client Interfaces
export const ApiClientConfigSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().default(30000),
  retries: z.number().default(3),
  headers: z.record(z.string()).optional(),
  auth: z.object({
    type: z.enum(['bearer', 'basic', 'token']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }).optional()
});

// Issue Types
export const IssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'closed', 'cancelled']),
  priority: z.number().min(0).max(4),
  type: z.enum(['bug', 'feature', 'task', 'epic', 'chore']),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  metadata: z.record(z.any()).optional()
});

// Event System
export const EventSchema = z.object({
  id: z.string(),
  type: z.string(),
  source: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  correlationId: z.string().optional(),
  causationId: z.string().optional()
});

export const EventHandlerSchema = z.object({
  eventType: z.string(),
  handler: z.function(),
  priority: z.number().default(0),
  enabled: z.boolean().default(true)
});

// Sync State
export const SyncStateSchema = z.object({
  id: z.string(),
  status: z.enum(['idle', 'syncing', 'error', 'completed']),
  lastSync: z.string().datetime().optional(),
  nextSync: z.string().datetime().optional(),
  progress: z.number().min(0).max(1).default(0),
  errors: z.array(z.string()).default([]),
  stats: z.object({
    total: z.number().default(0),
    processed: z.number().default(0),
    succeeded: z.number().default(0),
    failed: z.number().default(0)
  }).optional()
});

// Export types
export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type SecurityContext = z.infer<typeof SecurityContextSchema>;
export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;
export type CodyConfig = z.infer<typeof CodyConfigSchema>;
export type BeadsConfig = z.infer<typeof BeadsConfigSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
export type UnifiedConfig = z.infer<typeof UnifiedConfigSchema>;
export type ApiClientConfig = z.infer<typeof ApiClientConfigSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventHandler = z.infer<typeof EventHandlerSchema>;
export type SyncState = z.infer<typeof SyncStateSchema>;

// Core Interfaces
export interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, any>;
  initialize?(): Promise<void>;
  execute?(input: any): Promise<any>;
  cleanup?(): Promise<void>;
}

// Plugin Manager Interface
export interface PluginManager {
  register(plugin: Plugin): void;
  unregister(name: string): boolean;
  get(name: string): Plugin | undefined;
  list(): Plugin[];
  initialize(): Promise<void>;
  execute(name: string, input?: any): Promise<any>;
  cleanup(): Promise<void>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface Validator {
  validate<T>(data: unknown, schema: z.ZodSchema<T>): ValidationResult;
  sanitize<T>(data: unknown): T;
}

export interface SecurityManager {
  createContext(user: string, permissions: string[]): SecurityContext;
  validatePermissions(context: SecurityContext, required: string[]): boolean;
  audit(action: string, context: SecurityContext): Promise<boolean>;
}

// API Client Interfaces
export interface ApiClient {
  get<T>(url: string, params?: Record<string, any>): Promise<T>;
  post<T>(url: string, data?: any): Promise<T>;
  put<T>(url: string, data?: any): Promise<T>;
  patch<T>(url: string, data?: any): Promise<T>;
  delete<T>(url: string): Promise<T>;
}

export interface GitHubApiClient extends ApiClient {
  getIssues(params?: GetIssuesParams): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue>;
  createIssue(issue: CreateIssueRequest): Promise<Issue>;
  updateIssue(id: string, issue: UpdateIssueRequest): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  getLabels(): Promise<string[]>;
  getAssignees(): Promise<string[]>;
}

export interface BeadsApiClient extends ApiClient {
  getIssues(params?: GetIssuesParams): Promise<Issue[]>;
  getIssue(id: string): Promise<Issue>;
  createIssue(issue: CreateIssueRequest): Promise<Issue>;
  updateIssue(id: string, issue: UpdateIssueRequest): Promise<Issue>;
  deleteIssue(id: string): Promise<void>;
  syncIssues(): Promise<SyncResult>;
}

// Event System Interfaces
export interface EventBus {
  emit(event: Event): Promise<void>;
  on(eventType: string, handler: EventHandler): void;
  off(eventType: string, handler: EventHandler): void;
  once(eventType: string, handler: EventHandler): void;
  removeAllListeners(eventType?: string): void;
}

export interface EventStore {
  append(event: Event): Promise<void>;
  getEvents(aggregateId: string, fromVersion?: number): Promise<Event[]>;
  getEventsByType(eventType: string, from?: Date, to?: Date): Promise<Event[]>;
  getEventsByCorrelationId(correlationId: string): Promise<Event[]>;
}

// Sync Engine Interfaces
export interface SyncEngine {
  sync(options?: SyncOptions): Promise<SyncResult>;
  syncIssue(issueId: string): Promise<SyncResult>;
  getSyncState(): SyncState;
  setConflictResolution(strategy: ConflictResolutionStrategy): void;
  addConflictListener(listener: ConflictListener): void;
}

export interface ConflictResolver {
  resolve(conflict: Conflict): Promise<ConflictResolution>;
  addStrategy(strategy: ConflictResolutionStrategy): void;
  setDefaultStrategy(strategy: ConflictResolutionStrategy): void;
}

// Additional Types
export interface GetIssuesParams {
  state?: string[];
  labels?: string[];
  assignee?: string;
  creator?: string;
  mentioned?: string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  since?: string;
  limit?: number;
  offset?: number;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  type: 'bug' | 'feature' | 'task' | 'epic' | 'chore';
  priority?: number;
  assignee?: string;
  labels?: string[];
  dependencies?: string[];
}

export interface UpdateIssueRequest {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'closed' | 'cancelled';
  priority?: number;
  assignee?: string;
  labels?: string[];
  dependencies?: string[];
}

export interface SyncOptions {
  direction?: 'bidirectional' | 'github-to-beads' | 'beads-to-github';
  dryRun?: boolean;
  batchSize?: number;
  filters?: {
    labels?: string[];
    states?: string[];
    assignees?: string[];
  };
}

export interface SyncResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
  conflicts: Conflict[];
  duration: number;
}

export interface Conflict {
  id: string;
  type: 'data' | 'timestamp' | 'deletion' | 'dependency';
  source: 'github' | 'beads';
  githubIssue?: Issue;
  beadsIssue?: Issue;
  field?: string;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'manual' | 'github-wins' | 'beads-wins' | 'most-recent' | 'merge';
  resolvedBy?: string;
  resolvedAt?: string;
  result?: any;
}

export type ConflictResolutionStrategy = (
  conflict: Conflict
) => Promise<ConflictResolution>;

export type ConflictListener = (conflict: Conflict) => Promise<void>;

// Error Types
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[],
    public warnings: string[] = []
  ) {
    super(message);
  }
}

export class CacheError extends Error {
  constructor(message: string, public key: string) {
    super(message);
  }
}

export class SecurityError extends Error {
  constructor(message: string, public action: string, public context: SecurityContext) {
    super(message);
  }
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;