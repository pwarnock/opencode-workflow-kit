# @pwarnock/liaison

CLI framework for Liaison Toolkit with extensible plugin architecture, middleware system, and comprehensive command handlers.

## Features

- 🔌 **Plugin Architecture** - Load and manage plugins dynamically
- 🔄 **Middleware System** - Chain and compose command processing logic
- 📋 **Command Handlers** - Structured command implementation patterns
- 🎯 **Built-in Commands** - Sync, status, config, and init commands
- 🔐 **Liaison Integration** - Full Liaison task management integration
- ⚡ **Performance** - Timing, caching, and execution optimization
- 🛡️ **Error Handling** - Comprehensive error handling and validation

## Installation

```bash
npm install @pwarnock/liaison
# or
bun add @pwarnock/liaison
```

## Quick Start

```bash
# Install globally for CLI access
npm install -g @pwarnock/liaison

# Or use with npx
npx liaison --help

# Initialize Liaison framework
liaison init

# Sync systems
liaison sync

# Check system status
liaison status

# Manage configuration
liaison config --show
liaison config --set sync.interval=300
```

## Plugin System

### Creating a Plugin

```typescript
import { CLIPlugin } from '@pwarnock/liaison';

export const myPlugin: CLIPlugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  commands: [
    {
      name: 'greet',
      description: 'Greet someone',
      handler: async (args, options) => {
        const name = args.name || 'World';
        console.log(`Hello, ${name}!`);
        return { success: true };
      }
    }
  ]
};
```

### Loading a Plugin

```bash
# Via CLI
liaison plugin load ./path/to/plugin.js

# Programmatically
import { UnifiedPluginManager } from '@pwarnock/liaison';

const manager = new UnifiedPluginManager();
await manager.loadPlugin(myPlugin);
```

### Plugin Structure

Plugins are objects with:
- **name** (string) - Unique plugin identifier
- **version** (string) - Semantic version
- **description** (string) - Plugin description
- **commands** (PluginCommand[]) - Array of commands
- **middleware** (optional, PluginMiddleware[]) - Optional middleware
- **hooks** (optional, PluginHooks) - Optional lifecycle hooks

### Plugin Commands

Each command requires:
- **name** - Unique command name
- **description** - Command description
- **handler** - Async function to execute the command
- **options** (optional) - Array of command options

```typescript
const command: PluginCommand = {
  name: 'create-task',
  description: 'Create a new task',
  options: [
    {
      name: 'priority',
      description: 'Task priority',
      type: 'string',
      default: 'medium'
    }
  ],
  handler: async (args, options) => {
    // Implementation
  }
};
```

## Middleware System

Middleware functions process commands before and after execution, enabling:
- Logging and monitoring
- Error handling
- Configuration loading
- Authentication
- Caching
- Validation

### Built-in Middleware

```typescript
import {
  loggingMiddleware,
  errorHandlingMiddleware,
  timingMiddleware,
  configMiddleware,
  validationMiddleware,
  cacheMiddleware,
  authMiddleware,
  dryRunMiddleware,
  MiddlewareManager
} from '@pwarnock/liaison';

const manager = new MiddlewareManager();
manager.register(loggingMiddleware, 10);        // Higher priority
manager.register(authMiddleware, 8);
manager.register(validationMiddleware, 5);
manager.register(errorHandlingMiddleware, 0);   // Lower priority
```

### Custom Middleware

```typescript
import { PluginMiddleware } from '@pwarnock/liaison';

const customMiddleware: PluginMiddleware = {
  name: 'custom-middleware',
  execute: async (context, next) => {
    // Pre-processing
    console.log(`Executing: ${context.command}`);

    try {
      await next();
    } catch (error) {
      // Error handling
      console.error(`Failed: ${error.message}`);
      throw error;
    }

    // Post-processing
    console.log(`Completed: ${context.command}`);
  }
};
```

## Command Handlers

Base class for structured command implementation:

```typescript
import { BaseCommandHandler, CommandResult } from '@pwarnock/liaison';

class MyCommandHandler extends BaseCommandHandler {
  constructor() {
    super('my-command');
  }

  async execute(args: any, options: any): Promise<CommandResult> {
    try {
      this.logInfo('Starting operation...');

      // Do work
      const result = await doWork();

      this.logSuccess('Operation completed');
      return this.createResult(true, 'Success', result);
    } catch (error) {
      this.logError(String(error));
      return this.createError(String(error));
    }
  }
}
```

## Built-in Commands

### init

Initialize Beads-Cody integration:

```bash
liaison init
```

### sync

Sync Beads and Cody systems:

```bash
liaison sync                    # Standard sync
liaison sync --force            # Force sync
liaison sync --trigger=manual   # Specify trigger
```

### status

Check system health:

```bash
liaison status
```

### config

Manage configuration:

```bash
liaison config --show                          # Show config
liaison config --set sync.interval=300         # Set value
liaison config --set sync.auto_commit=true     # Boolean value
```

### Liaison Integration Commands

```bash
# Task management
liaison listTasks                              # List all tasks
liaison createTask --title "New task"          # Create task
liaison updateTask <id> --status complete     # Update task
liaison deleteTask <id>                        # Delete task
liaison assignTask <id> <user>                 # Assign task

# Liaison integration
liaison beads-create --title "New issue"       # Create issue
liaison beads-ready --limit 10                 # Show ready issues
liaison beads-update <id> --status done        # Update issue
liaison beads-close <id> --reason "fixed"      # Close issue

# Workflow management
liaison listWorkflows                          # List workflows
liaison createWorkflow <name>                  # Create workflow
liaison runWorkflow <name>                     # Run workflow
liaison scheduleWorkflow <name> <time>         # Schedule workflow
liaison showWorkflowLogs <name>                # Show logs
```

### Plugin Management

```bash
liaison plugin list                            # List loaded plugins
liaison plugin load ./my-plugin.js             # Load plugin
liaison plugin unload my-plugin                # Unload plugin
liaison plugin commands                        # List all commands
```

## Programmatic Usage

### Using the Plugin Manager

```typescript
import { UnifiedPluginManager, liaisonPlugin } from '@pwarnock/liaison';

const manager = new UnifiedPluginManager();

// Load plugin
await manager.loadPlugin(liaisonPlugin);

// List loaded plugins
const plugins = manager.listPlugins();
console.log('Loaded plugins:', plugins.map(p => p.name));

// Execute command
const result = await manager.executeCommand('sync', [], { force: true });
console.log('Sync result:', result);

// Unload plugin
await manager.unloadPlugin('cody-beads-integration');
```

### Using Command Handlers

```typescript
import { CommandHandlerFactory, SyncCommandHandler } from '@pwarnock/liaison';

const factory = new CommandHandlerFactory();

// Use built-in handler
const syncHandler = factory.get('sync');
const result = await syncHandler?.execute({}, { force: true });

// Register custom handler
factory.register('custom', new MyCommandHandler());
```

### Using Middleware Manager

```typescript
import { MiddlewareManager, loggingMiddleware, cacheMiddleware } from '@pwarnock/liaison';

const middlewareManager = new MiddlewareManager();

middlewareManager.register(loggingMiddleware, 10);
middlewareManager.register(cacheMiddleware, 5);

const context = {
  command: 'sync',
  args: {},
  options: { force: true },
  metadata: new Map()
};

const result = await middlewareManager.execute(context, async () => {
  // Execute command
  return { success: true };
});
```

## Configuration

### Configuration File

Configuration stored in `.opencode-cli-config.json`:

```json
{
  "sync": {
    "interval": 300,
    "auto_commit": true,
    "conflict_resolution": "manual"
  },
  "logging": {
    "level": "info",
    "file": ".opencode-cli.log"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
```

### Environment Variables

- `OPENCODE_TOKEN` - Authentication token
- `DEBUG` - Enable debug logging
- `VERBOSE` - Enable verbose output
- `NODE_ENV` - Environment (development/production)

## Architecture

### Layers

1. **Presentation Layer** - CLI commands and user interface
2. **Application Layer** - Command handlers and business logic
3. **Plugin Layer** - Plugin system and extensibility
4. **Middleware Layer** - Cross-cutting concerns
5. **Infrastructure Layer** - File system, process execution, etc.

### Key Components

- **UnifiedPluginManager** - Manages plugin lifecycle
- **MiddlewareManager** - Executes middleware chains
- **CommandHandlerFactory** - Creates command handlers
- **BaseCommandHandler** - Base class for commands
- **CLIPlugin** - Plugin interface

## Performance Optimization

### Caching

Enable caching middleware to cache command results:

```bash
liaison --cache listTasks        # Use cache
liaison --nocache listTasks      # Skip cache
```

### Async Execution

All command handlers are async for optimal performance:

```typescript
handler: async (args, options) => {
  // Parallel operations
  const [result1, result2] = await Promise.all([
    operation1(),
    operation2()
  ]);
  return { success: true };
}
```

## Error Handling

Comprehensive error handling with context:

```bash
DEBUG=1 liaison sync              # Enable debug output
VERBOSE=1 liaison sync            # Enable verbose output
```

Errors include:
- Error message
- Command context
- Stack trace (in debug mode)
- Execution time
- Middleware context

## Development

### Building

```bash
npm run build
# or
bun run build
```

### Testing

```bash
npm test
# or
bun test
```

### Type Checking

```bash
npm run type-check
# or
bun run type-check
```

## License

MIT

## Contributing

Contributions are welcome! Please submit issues and pull requests to the [GitHub repository](https://github.com/pwarnock/liaison-toolkit).
