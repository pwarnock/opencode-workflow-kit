// Export types
export * from './types/index.js';
export { createClaudeConfig } from './types/index.js';

// Re-export schemas from agent_primitives for compatibility
export {
  mcpServersSchema,
  skillConfigSchema
} from '@pwarnock/agent_primitives';

// Re-export template as JSON module
import minimalTemplate from './templates/minimal.json' with { type: 'json' };
export { minimalTemplate };

// Template accessor functions
export function getTemplate(name: string): unknown {
  const templates: Record<string, unknown> = {
    minimal: minimalTemplate
  };
  return templates[name] || null;
}

export function listTemplates(): string[] {
  return ['minimal'];
}
