// Export types
export * from './types/models.js';
export * from './types/templates.js';

// Export utilities
export * from './utils/template-engine.js';

// Export scripts
export * from './scripts/setup.js';

// Re-export schemas from agent_primitives for backward compatibility
export { mcpServersSchema, skillConfigSchema } from '@pwarnock/agent_primitives';

// Re-export commonly used functionality
export { FREE_MODELS, type ModelInfo } from './types/models.js';
export { 
  type AgentTemplate, 
  type AgentOptions, 
  type ConfigOptions 
} from './types/templates.js';
export { 
  generateAgentConfig, 
  generateConfig, 
  loadTemplate 
} from './utils/template-engine.js';
export { 
  setupOpenCodeConfig,
  type SetupOptions 
} from './scripts/setup.js';