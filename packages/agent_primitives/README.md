# @pwarnock/agent_primitives

Agent primitives package for liaison-toolkit - types, schemas, and utilities for agent development.

## Installation

```bash
npm install @pwarnock/agent_primitives
# or
bun add @pwarnock/agent_primitives
```

## Usage

### Importing Types

```typescript
import { AgentPrimitive, AgentCapability, AgentConfig } from '@pwarnock/agent_primitives';
```

### Importing Schemas

```typescript
import mcpSchemas from '@pwarnock/agent_primitives/schemas';
import skillConfigSchema from '@pwarnock/agent_primitives/skill-config';
```

### Using Utilities

```typescript
import { createAgentPrimitive, validateAgentConfig } from '@pwarnock/agent_primitives/utils';
```

## Package Structure

```
agent_primitives/
├── src/
│   ├── index.ts          # Main entry point
│   ├── types/
│   │   └── index.ts      # Type definitions
│   ├── schemas/
│   │   ├── mcp-schemas.json       # MCP server schemas
│   │   └── skill-config.json      # Skill config schema
│   └── utils/
│       └── index.ts      # Utility functions
├── schemas/              # Root schemas directory
├── package.json
└── tsconfig.json
```

## Available Exports

### Types

- `AgentPrimitive` - Base interface for agent primitives
- `AgentCapability` - Interface for agent capabilities
- `AgentConfig` - Interface for agent configuration

### Schemas

- `mcpSchemas` - JSON schema for MCP server configurations
- `skillConfigSchema` - JSON schema for skill configuration files

### Utilities

- `createAgentPrimitive()` - Factory function to create agent primitives
- `validateAgentConfig()` - Validator for agent configuration objects

## Development

```bash
# Install dependencies
bun install

# Run type checking
bun run type-check

# Build the package
bun run build

# Run tests
bun run test

# Run linter
bun run lint
```

## License

MIT
