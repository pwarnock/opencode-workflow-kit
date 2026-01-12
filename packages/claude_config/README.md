# @pwarnock/claude_config

Claude configuration package for liaison-toolkit - types, schemas, and templates for Claude AI integrations.

## Installation

```bash
bun add @pwarnock/claude_config
```

## Usage

### Importing Types

```typescript
import {
  type ClaudeAgentConfig,
  type ClaudeMCPConfig,
  type ClaudeContextConfig,
  type ClaudeTemplateConfig,
  createClaudeConfig
} from '@pwarnock/claude_config';
```

### Using Templates

```typescript
import { minimalTemplate, getTemplate, listTemplates } from '@pwarnock/claude_config';

// Get a specific template
const template = getTemplate('minimal');

// List available templates
const templates = listTemplates();
```

### Creating Configurations

```typescript
import { createClaudeConfig } from '@pwarnock/claude_config';

const config = createClaudeConfig({
  name: 'my-claude-agent',
  description: 'Custom Claude agent',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7
});
```

## Exports

| Export | Description |
|--------|-------------|
| `./types` | TypeScript type definitions for Claude configuration |
| `./templates` | JSON template files directory |
| `./minimal` | Minimal Claude settings template |

## Templates

### minimal

Basic Claude configuration template with variable substitution support.

Variables:
- `{{projectName}}` - Name of the project
- `{{projectDescription}}` - Project description
- `{{model}}` - Claude model identifier
- `{{temperature}}` - Temperature setting

## Schema Validation

Schemas are re-exported from `@pwarnock/agent_primitives` for compatibility:

```typescript
import { mcpServersSchema, skillConfigSchema } from '@pwarnock/claude_config';
```

## License

MIT
