/**
 * Claude-specific configuration types for AI agent integration
 */

export interface ClaudeAgentConfig {
  name: string;
  description: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  contextConfig?: ClaudeContextConfig;
  mcpConfig?: ClaudeMCPConfig;
}

export interface ClaudeMCPConfig {
  servers: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
  tools?: string[];
}

export interface ClaudeContextConfig {
  maxContextTokens?: number;
  truncationStrategy?: 'auto' | 'recent' | 'summary';
  includeFiles?: boolean;
  filePatterns?: string[];
  excludePatterns?: string[];
}

export interface ClaudeTemplateConfig {
  $schema: string;
  templateName: string;
  description: string;
  variables: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    default?: unknown;
    required?: boolean;
  }>;
  config: ClaudeAgentConfig;
}

export type ClaudeConfigOptions = Partial<ClaudeAgentConfig>;

export function createClaudeConfig(options: ClaudeConfigOptions): ClaudeAgentConfig {
  return {
    name: options.name || 'default',
    description: options.description || 'Claude agent configuration',
    model: options.model || 'claude-sonnet-4-20250514',
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? 8192,
    systemPrompt: options.systemPrompt,
    contextConfig: options.contextConfig,
    mcpConfig: options.mcpConfig
  };
}
