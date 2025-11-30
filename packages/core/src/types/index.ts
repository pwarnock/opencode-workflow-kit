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

// Export types
export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type CacheEntry = z.infer<typeof CacheEntrySchema>;
export type SecurityContext = z.infer<typeof SecurityContextSchema>;

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