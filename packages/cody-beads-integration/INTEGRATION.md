# Cody-Beads Integration Package

A comprehensive TypeScript package for seamless integration between the Cody Spec Driven Development Framework and Beads issue tracking system.

## 🚀 Quick Start

### Installation

```bash
# Install the package
bun add @pwarnock/cody-beads-integration

# Or with npm
npm install @pwarnock/cody-beads-integration

# Or with yarn
yarn add @pwarnock/cody-beads-integration
```

### Basic Setup

```typescript
import { CodyBeadsIntegration } from '@pwarnock/cody-beads-integration';

// Initialize the integration
const integration = new CodyBeadsIntegration({
  codyProjectPath: './.cody',
  beadsProjectPath: './.beads',
  syncDirection: 'bidirectional',
  autoSync: true,
  syncInterval: 30000 // 30 seconds
});

// Start synchronization
await integration.start();
```

## 📋 Features

### Core Functionality
- **Bidirectional Sync**: Seamless synchronization between Cody and Beads
- **Conflict Resolution**: Intelligent handling of concurrent updates
- **Real-time Updates**: Live synchronization with configurable intervals
- **Template System**: Pre-built environment templates for various development stacks
- **CLI Interface**: Command-line tools for workflow management
- **Extensible Architecture**: Plugin system for custom integrations

### Supported Platforms
- **Cody Framework**: Spec-driven development and project management
- **Beads**: Dependency-aware issue tracking and task management
- **GitHub**: Pull request and issue synchronization
- **GitLab**: CI/CD pipeline integration (planned)
- **Jira**: Enterprise project management integration (planned)

## 🔧 Configuration

### Basic Configuration

```typescript
// cody-beads.config.ts
export default {
  // Project paths
  codyProjectPath: './.cody',
  beadsProjectPath: './.beads',
  
  // Synchronization settings
  sync: {
    direction: 'bidirectional', // 'cody-to-beads', 'beads-to-cody', 'bidirectional'
    autoSync: true,
    interval: 30000,
    conflictResolution: 'manual', // 'auto', 'manual', 'cody-wins', 'beads-wins'
    
    // Sync filters
    include: {
      statuses: ['open', 'in_progress'],
      types: ['feature', 'bug', 'task'],
      priorities: [0, 1, 2] // 0=critical, 1=high, 2=medium
    },
    exclude: {
      labels: ['wontfix', 'duplicate'],
      types: ['chore']
    }
  },
  
  // GitHub integration
  github: {
    enabled: true,
    token: process.env.GITHUB_TOKEN,
    syncPullRequests: true,
    syncIssues: true,
    autoLinkIssues: true
  },
  
  // Template settings
  templates: {
    basePath: './templates',
    autoApply: false,
    validation: true
  },
  
  // Logging and monitoring
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    file: './logs/cody-beads.log',
    maxFileSize: '10MB',
    maxFiles: 5
  }
};
```

### Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
BEADS_API_KEY=bdsk_xxxxxxxxxxxxxxxxxxxx

# Optional
CODY_PROJECT_PATH=./.cody
BEADS_PROJECT_PATH=./.beads
SYNC_INTERVAL=30000
LOG_LEVEL=info
NODE_ENV=production
```

## 🎯 Usage Patterns

### 1. Project Initialization

```bash
# Initialize a new project with Cody-Beads integration
bunx @pwarnock/cody-beads-integration init

# Interactive setup
bunx @pwarnock/cody-beads-integration init --interactive

# Use specific template
bunx @pwarnock/cody-beads-integration init --template react-node
```

### 2. Manual Synchronization

```bash
# Sync all changes
bunx @pwarnock/cody-beads-integration sync

# Sync specific direction
bunx @pwarnock/cody-beads-integration sync --direction cody-to-beads

# Sync with conflict resolution
bunx @pwarnock/cody-beads-integration sync --resolve-conflicts
```

### 3. Template Management

```bash
# List available templates
bunx @pwarnock/cody-beads-integration template list

# Apply template to current project
bunx @pwarnock/cody-beads-integration template apply react-native

# Create custom template
bunx @pwarnock/cody-beads-integration template create my-stack
```

### 4. Configuration Management

```bash
# Validate current configuration
bunx @pwarnock/cody-beads-integration config validate

# Show current configuration
bunx @pwarnock/cody-beads-integration config show

# Update configuration
bunx @pwarnock/cody-beads-integration config set sync.interval 60000
```

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cody Framework│◄──►│ Sync Engine     │◄──►│   Beads System  │
│                 │    │                 │    │                 │
│ • Spec Management│    │ • Conflict Res. │    │ • Issue Tracking│
│ • Version Mgmt  │    │ • Data Transform│    │ • Dependencies  │
│ • Workflow Cmds │    │ • Event Handling│    │ • Status Sync   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Plugin System │
                    │                 │
                    │ • GitHub        │
                    │ • GitLab        │
                    │ • Jira          │
                    │ • Custom Hooks  │
                    └─────────────────┘
```

### Data Flow

1. **Change Detection**: Monitors Cody and Beads for updates
2. **Data Transformation**: Converts between different data formats
3. **Conflict Resolution**: Handles concurrent updates intelligently
4. **Synchronization**: Applies changes to target systems
5. **Validation**: Ensures data integrity and consistency

## 📚 API Reference

### Main Classes

#### CodyBeadsIntegration

```typescript
class CodyBeadsIntegration {
  constructor(config: IntegrationConfig);
  
  // Lifecycle methods
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async restart(): Promise<void>;
  
  // Synchronization methods
  async sync(options?: SyncOptions): Promise<SyncResult>;
  async syncToCody(): Promise<SyncResult>;
  async syncToBeads(): Promise<SyncResult>;
  
  // Configuration methods
  updateConfig(config: Partial<IntegrationConfig>): void;
  validateConfig(): ValidationResult;
  
  // Event handling
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  
  // Status and monitoring
  getStatus(): IntegrationStatus;
  getMetrics(): IntegrationMetrics;
}
```

#### SyncEngine

```typescript
class SyncEngine {
  constructor(config: SyncConfig);
  
  async sync(options?: SyncOptions): Promise<SyncResult>;
  async resolveConflicts(conflicts: Conflict[]): Promise<ConflictResolution[]>;
  
  // Event handlers
  onSyncStart(handler: () => void): void;
  onSyncComplete(handler: (result: SyncResult) => void): void;
  onConflict(handler: (conflict: Conflict) => void): void;
  onError(handler: (error: Error) => void): void;
}
```

### Configuration Interfaces

```typescript
interface IntegrationConfig {
  codyProjectPath: string;
  beadsProjectPath: string;
  sync: SyncConfig;
  github?: GitHubConfig;
  templates?: TemplateConfig;
  logging?: LoggingConfig;
}

interface SyncConfig {
  direction: 'cody-to-beads' | 'beads-to-cody' | 'bidirectional';
  autoSync: boolean;
  interval: number;
  conflictResolution: 'auto' | 'manual' | 'cody-wins' | 'beads-wins';
  include?: SyncFilters;
  exclude?: SyncFilters;
}
```

## 🎨 Templates

### Available Templates

#### React Node Stack
```bash
npx @pwarnock/cody-beads init --template react-node
```
- React 18 with TypeScript
- Node.js backend with Express
- PostgreSQL database
- Jest testing framework
- Docker containerization

#### Python Science Stack
```bash
npx @pwarnock/cody-beads init --template python-science
```
- Python 3.11 with Poetry
- Jupyter notebooks
- Scientific computing libraries (NumPy, Pandas, Matplotlib)
- pytest testing framework
- Conda environment management

#### React Native (Coming Soon)
```bash
npx @pwarnock/cody-beads init --template react-native
```
- React Native with Expo
- Cross-platform mobile development
- TypeScript configuration
- Jest + React Native Testing Library

#### Django (Coming Soon)
```bash
npx @pwarnock/cody-beads init --template django
```
- Django 4.x with Python
- PostgreSQL database
- Django REST Framework
- Celery for background tasks

#### Rust (Coming Soon)
```bash
npx @pwarnock/cody-beads init --template rust
```
- Rust with Cargo workspaces
- Tokio async runtime
- SQLx for database access
- Comprehensive testing setup

### Custom Templates

Create your own templates by extending the base template structure:

```typescript
// templates/my-stack/template.json
{
  "name": "my-stack",
  "version": "1.0.0",
  "description": "My custom development stack",
  "framework": "custom",
  "language": "typescript",
  "dependencies": {
    "required": ["@pwarnock/cody-beads"],
    "optional": ["eslint", "prettier"]
  },
  "scripts": {
    "dev": "npm run dev",
    "build": "npm run build",
    "test": "npm run test"
  },
  "config": {
    "sync": {
      "interval": 15000,
      "autoSync": true
    }
  }
}
```

## 🔌 Plugin System

### Creating Custom Plugins

```typescript
import { Plugin, PluginContext } from '@pwarnock/cody-beads';

export class MyCustomPlugin extends Plugin {
  name = 'my-custom-plugin';
  version = '1.0.0';
  
  async initialize(context: PluginContext): Promise<void> {
    // Plugin initialization logic
  }
  
  async onSyncStart(context: PluginContext): Promise<void> {
    // Handle sync start event
  }
  
  async onIssueUpdate(context: PluginContext, issue: Issue): Promise<void> {
    // Handle issue updates
  }
  
  async onDestroy(): Promise<void> {
    // Cleanup logic
  }
}

// Register the plugin
const integration = new CodyBeadsIntegration(config);
integration.registerPlugin(new MyCustomPlugin());
```

### Available Hooks

- `onSyncStart`: Called when synchronization begins
- `onSyncComplete`: Called when synchronization ends
- `onIssueCreate`: Called when a new issue is created
- `onIssueUpdate`: Called when an issue is updated
- `onConflict`: Called when a conflict is detected
- `onError`: Called when an error occurs

## 🧪 Testing

### Running Tests

```bash
# Install dependencies (use your preferred package manager)
bun install    # or npm install, yarn install, pnpm install

# Run all tests via Turbo
turbo test:all

# Run specific test types via Turbo
turbo test:unit          # Unit tests
turbo test:integration    # Integration tests
turbo test:e2e           # End-to-end tests
turbo test:bdd           # BDD tests
turbo test:a11y          # Accessibility tests
turbo test:security      # Security tests
turbo test:performance   # Performance tests
```

### Test Coverage

```bash
# Generate coverage report
turbo test:coverage

# View coverage report
open coverage/index.html
```

### Test Configuration

Test configuration is handled through environment variables and configuration files:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   export NODE_ENV=production
   export LOG_LEVEL=warn
   export SYNC_INTERVAL=60000
   ```

2. **Process Management**
   ```bash
   # Using PM2
   pm2 start ecosystem.config.js
   
   # Using systemd
   sudo systemctl start cody-beads
   sudo systemctl enable cody-beads
   ```

3. **Monitoring**
   ```bash
   # Health check
   curl http://localhost:3000/health
   
   # Metrics endpoint
   curl http://localhost:3000/metrics
   ```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN bun install --production

COPY dist/ ./dist/
COPY templates/ ./templates/

EXPOSE 3000

CMD ["bun", "run", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  cody-beads:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - BEADS_API_KEY=${BEADS_API_KEY}
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
```

## 📈 Monitoring and Observability

### Metrics

The integration provides comprehensive metrics for monitoring:

- **Sync Performance**: Duration, success rate, error rate
- **System Health**: Memory usage, CPU usage, disk space
- **Business Metrics**: Issues synced, conflicts resolved, templates applied
- **Custom Metrics**: Plugin-specific metrics and KPIs

### Logging

Structured logging with multiple levels and outputs:

```typescript
// Configure logging
const integration = new CodyBeadsIntegration({
  logging: {
    level: 'info',
    outputs: ['console', 'file', 'elasticsearch'],
    format: 'json',
    metadata: {
      service: 'cody-beads',
      version: '1.0.0',
      environment: process.env.NODE_ENV
    }
  }
});
```

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed

# Readiness check
curl http://localhost:3000/ready
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/pwarnock/cody-beads-integration.git
cd cody-beads-integration

# Install dependencies
bun install

# Run development mode
bun dev

# Run tests
bun test:all

# Build the project
bun build
```

### Code Style

- Use TypeScript for all new code
- Follow ESLint configuration
- Write comprehensive tests
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This package integrates with and depends on the following external projects, each with their own licenses:

#### Cody Framework
- **Repository**: https://github.com/ibuildwith-ai/cody-pbt
- **License**: As specified in the Cody PBT repository
- **Usage**: This package uses Cody as-is for spec-driven development and project management functionality
- **Integration**: We provide TypeScript bindings and synchronization utilities for Cody's existing APIs

#### Beads (bd)
- **Repository**: https://github.com/dadler/beads
- **License**: As specified in the Beads repository  
- **Usage**: This package uses Beads as-is for dependency-aware issue tracking and task management
- **Integration**: We provide TypeScript bindings and synchronization utilities for Beads' existing APIs

### Compliance Notes

- Users must comply with the respective licenses of Cody and Beads frameworks
- This package does not modify or redistribute the core functionality of either framework
- Integration code (this package) is licensed under MIT, but dependencies retain their original licenses
- Please review the license terms of Cody and Beads before using this integration package

## 🆘 Support

- **Documentation**: [Project README](https://github.com/pwarnock/opencode-workflow-kit)
- **Issues**: [GitHub Issues](https://github.com/pwarnock/opencode-workflow-kit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)

## 🗺️ Roadmap

### v0.5.0 (Current)
- [x] Core TypeScript package implementation
- [x] Comprehensive testing framework
- [x] Basic template system
- [ ] Advanced environment templates
- [ ] Enhanced CLI interface
- [ ] Performance optimizations

### v0.6.0 (Planned)
- [ ] GitLab integration
- [ ] Jira integration
- [ ] Advanced conflict resolution
- [ ] Real-time webhooks
- [ ] Mobile app support

### v1.0.0 (Future)
- [ ] Full enterprise features
- [ ] Advanced analytics
- [ ] Multi-tenant support
- [ ] SLA guarantees
- [ ] Premium support options