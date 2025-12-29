/**
 * Template interfaces for OpenCode subagent configuration
 */

export interface SubagentTemplate {
  $schema: string;
  description: string;
  mode: 'subagent';
  tools: ToolPermissions;
  permissions: PermissionMatrix;
  environment: EnvironmentConfig;
  behavior: BehaviorConfig;
  specialization: SpecializationConfig;
}

export interface SubagentOptions {
  model?: string;
  template?: string;
  temperature?: number;
  description?: string;
  domain?: string;
  framework?: string;
  capabilities?: string[];
}

export interface ConfigOptions {
  model?: string;
  provider?: string;
  agents?: Record<string, SubagentConfig>;
}

export interface SubagentConfig {
  description?: string;
  mode?: string;
  model?: string;
  tools?: ToolPermissions;
  permissions?: PermissionMatrix;
  environment?: EnvironmentConfig;
  behavior?: BehaviorConfig;
  specialization?: SpecializationConfig;
}

export interface ToolPermissions {
  read?: boolean;
  write?: boolean;
  edit?: boolean;
  bash?: boolean;
  webfetch?: boolean;
  grep?: boolean;
  glob?: boolean;
  list?: boolean;
  patch?: boolean;
  todowrite?: boolean;
  todoread?: boolean;
}

export interface PermissionMatrix {
  read?: boolean;
  write?: boolean;
  execute?: boolean;
  admin?: boolean;
}

export interface EnvironmentConfig {
  CODY_MODE?: string;
  OPENCODE_CONTEXT?: string;
  CONTEXT7_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface BehaviorConfig {
  conservative?: boolean;
  confirmation_required?: boolean;
  context_preservation?: boolean;
  rollback_enabled?: boolean;
  system_aware?: boolean;
  version_aware?: boolean;
}

export interface SpecializationConfig {
  domain: string;
  framework: string;
  capabilities: string[];
  required_skills?: string[];
}

// Legacy interface for backward compatibility
export interface AgentTemplate {
  name: string;
  description: string;
  mode: 'primary' | 'subagent';
  model?: string;
  temperature?: number;
  tools: Record<string, boolean>;
  permissions?: Record<string, string>;
}

export interface AgentOptions {
  model?: string;
  template?: string;
  temperature?: number;
  description?: string;
}