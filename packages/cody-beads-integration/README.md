# @pwarnock/cody-beads-integration

> Seamless integration between Cody Product Builder Toolkit and Beads for AI-driven development workflows

[![npm version](https://img.shields.io/npm/v/@pwarnock/cody-beads-integration)](https://www.npmjs.com/package/@pwarnock%2Fcody-beads-integration)
[![GitHub License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/pwarnock/opencode-workflow-kit/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Cody](https://img.shields.io/badge/Cody-Product%20Builder%20Toolkit-purple)](https://cody.ai)
[![Beads](https://img.shields.io/badge/Beads-Development%20Platform-orange)](https://beads.dev)

## Overview

`@pwarnock/cody-beads-integration` provides a comprehensive solution for synchronizing issues and pull requests between Cody Product Builder Toolkit and Beads development projects. This package enables bidirectional workflows with intelligent conflict resolution and automated synchronization.

### Key Features

- 🔗 **Bidirectional Synchronization** - Sync issues and PRs both ways between Cody and Beads
- 🛡️  **Conflict Resolution** - Multiple strategies: manual, cody-wins, beads-wins, newer-wins, prompt
- 🏗️  **Monorepo Support** - Works with pnpm workspaces and Turborepo
- 📝 **Project Templates** - Quick setup for web, Python, and full-stack projects
- 🎯 **CLI Interface** - Intuitive command-line interface with comprehensive options
- 🔧 **Configuration Management** - Flexible configuration with environment variable support
- 🚀 **GitHub Packages** - Free publishing to GitHub Packages registry

## Installation

### Prerequisites

- **Node.js** 18+ and npm/pnpm/yarn
- **GitHub Personal Access Token** with appropriate repository permissions
- **Cody Project** (optional but recommended)
- **Beads Project** (optional but recommended)

### Install Package

```bash
# Using npm
npm install @pwarnock/cody-beads-integration

# Using yarn
yarn add @pwarnock/cody-beads-integration

# Using pnpm (recommended)
pnpm add @pwarnock/cody-beads-integration

# Using GitHub Packages
npm install @pwarnock/cody-beads-integration --registry https://npm.pkg.github.com
```

### Global Installation

```bash
# Install globally
npm install -g @pwarnock/cody-beads-integration

# Or using pnpm
pnpm add -g @pwarnock/cody-beads-integration
```

## Quick Start

### 1. Initialize Configuration

```bash
# Interactive setup
cody-beads config setup

# Or create configuration manually
cat > cody-beads.config.json << EOF
{
  "version": "1.0.0",
  "github": {
    "owner": "your-username",
    "repo": "your-repo",
    "token": "your-github-token"
  },
  "cody": {
    "projectId": "your-cody-project-id"
  },
  "beads": {
    "projectPath": "./your-beads-project"
  }
}
EOF
```

### 2. Test Configuration

```bash
# Validate configuration
cody-beads config test

# Check current settings
cody-beads config show
```

### 3. First Synchronization

```bash
# Preview what will be synced (recommended)
cody-beads sync --dry-run

# Execute synchronization
cody-beads sync

# Sync specific direction
cody-beads sync --direction cody-to-beads
cody-beads sync --direction beads-to-cody

# Sync with conflict resolution
cody-beads sync --conflict-resolution cody-wins
```

## CLI Commands

### `cody-beads sync`

Synchronize issues and PRs between Cody and Beads.

```bash
cody-beads sync [options]
```

**Options:**
- `--direction <type>`: Sync direction (`cody-to-beads`, `beads-to-cody`, `bidirectional`)
- `--dry-run`: Preview sync without executing
- `--force`: Force sync even if conflicts detected
- `--since <date>`: Sync items since this date (ISO 8601 format)
- `--config <path>`: Path to configuration file

### `cody-beads config`

Manage configuration settings.

```bash
cody-beads config <action> [options]
```

**Actions:**
- `setup`: Interactive configuration setup
- `test`: Test current configuration
- `show`: Display current configuration
- `set <key> <value>`: Set configuration value
- `get <key>`: Get configuration value

### `cody-beads template`

Manage project templates.

```bash
cody-beads template <action> [name] [options]
```

**Actions:**
- `list`: List available templates
- `create <name>`: Create new template
- `apply <name>`: Apply template to current directory
- `remove <name>`: Remove existing template

**Options:**
- `--type <type>`: Template type (`minimal`, `web-development`, `python-development`, `full-stack`)
- `--description <text>`: Template description
- `--template-path <path>`: Custom template path
- `--output-dir <path>`: Output directory for apply action

### `cody-beads init`

Initialize new project with template.

```bash
cody-beads init [options]
```

**Options:**
- `--template <type>`: Template type to use
- `--name <name>`: Project name
- `--description <text>`: Project description
- `--skip-install`: Skip dependency installation
- `--skip-git`: Skip git initialization

### `cody-beads version`

Manage version planning and building.

```bash
cody-beads version <action> [identifier] [options]
```

**Actions:**
- `add`: Add new version
- `build <identifier>`: Build specific version
- `list`: List all versions
- `remove <identifier>`: Remove version

**Options:**
- `--name <text>`: Version name
- `--description <text>`: Version description
- `--features <text>`: Version features
- `--dry-run`: Show what would be done

## Configuration

### Configuration Schema

```json
{
  "version": "1.0.0",
  "github": {
    "owner": "repository-owner",
    "repo": "repository-name",
    "token": "github-personal-access-token",
    "apiUrl": "https://api.github.com"
  },
  "cody": {
    "projectId": "cody-project-id",
    "apiUrl": "https://api.cody.ai",
    "webhookSecret": "optional-webhook-secret"
  },
  "beads": {
    "projectPath": "./path-to-beads-project",
    "configPath": ".beads/beads.json",
    "autoSync": false,
    "syncInterval": 60
  },
  "sync": {
    "defaultDirection": "bidirectional",
    "conflictResolution": "manual",
    "preserveComments": true,
    "preserveLabels": true,
    "syncMilestones": false,
    "excludeLabels": ["wontfix", "duplicate"],
    "includeLabels": ["bug", "feature", "enhancement"]
  },
  "templates": {
    "defaultTemplate": "minimal",
    "templatePath": "./templates"
  }
}
```

### Environment Variables

```bash
# GitHub Token
export GITHUB_TOKEN="your-github-token"

# Beads Project Path
export BEADS_PROJECT_PATH="./path-to-beads-project"

# Auto Sync (true/false)
export BEADS_AUTO_SYNC="false"

# Sync Interval (minutes)
export BEADS_SYNC_INTERVAL="60"
```

## Project Templates

### Built-in Templates

#### Minimal Template

```bash
cody-beads init --template minimal --name my-project
```

**Features:**
- Basic configuration files
- Git initialization
- Cody-Beads setup guidance

#### Web Development Template

```bash
cody-beads init --template web-development --name my-web-app
```

**Features:**
- Node.js + Express setup
- React frontend structure
- Development dependencies
- Docker configuration
- Cody-to-Beads sync direction

#### Python Development Template

```bash
cody-beads init --template python-development --name my-python-app
```

**Features:**
- Flask application structure
- Requirements file
- Cody-Beads integration
- Development dependencies
- Basic API endpoints

#### Full-Stack Template

```bash
cody-beads init --template full-stack --name my-fullstack-app
```

**Features:**
- Frontend (React)
- Backend (Node.js/Python)
- Database (PostgreSQL)
- Docker Compose setup
- Complete CI/CD configuration

## Integration with OpenCode Workflow Kit

This package integrates seamlessly with the broader OpenCode Workflow Kit ecosystem:

### Configuration Compatibility

- Works with existing `opencode-config` Python package
- Shares configuration schema and validation
- Cross-platform support (Windows, macOS, Linux)

### Beads Integration

- Uses existing Beads v0.26.0 setup
- Project-local mode for optimal performance
- Event-driven synchronization
- Git integration hooks

### GitHub Actions Integration

- Automated publishing pipeline
- Multi-package build and test
- Security scanning with Trivy
- Cross-platform testing

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/pwarnock/opencode-workflow-kit.git
cd opencode-workflow-kit

# Install dependencies
pnpm install

# Build package
pnpm build

# Run tests
pnpm test

# Link for local testing
pnpm link
```

### Building Package

```bash
# Build TypeScript
pnpm build

# Build in watch mode
pnpm dev

# Build with specific options
pnpm build --filter=@pwarnock/cody-beads-integration
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run coverage
pnpm test:coverage

# Run integration tests
pnpm test:integration
```

### Publishing

```bash
# Build and publish
pnpm publish

# Dry run publish
pnpm publish --dry-run

# Publish specific tag
pnpm publish --tag v1.0.0
```

## API Reference

### Core Classes

#### `CodyBeadsConfig`

Main configuration interface for the integration.

```typescript
interface CodyBeadsConfig {
  version: string;
  github: GitHubConfig;
  cody: CodyConfig;
  beads: BeadsConfig;
  sync: SyncConfig;
  templates: TemplateConfig;
}
```

#### `SyncEngine`

Main synchronization engine for bidirectional data sync.

```typescript
class SyncEngine {
  constructor(config: CodyBeadsConfig, githubClient: GitHubClient, beadsClient: BeadsClient);
  executeSync(options: SyncOptions): Promise<SyncResult>;
  detectConflicts(): Promise<SyncConflict[]>;
  resolveConflict(conflict: SyncConflict, resolution: string): Promise<void>;
}
```

#### `GitHubClient`

GitHub API client for issue and PR management.

```typescript
interface GitHubClient {
  getIssues(owner: string, repo: string, options?: { since?: Date }): Promise<GitHubIssue[]>;
  createIssue(owner: string, repo: string, issue: Partial<GitHubIssue>): Promise<GitHubIssue>;
  updateIssue(owner: string, repo: string, issueNumber: number, update: Partial<GitHubIssue>): Promise<GitHubIssue>;
  createComment(owner: string, repo: string, issueNumber: number, body: string): Promise<GitHubComment>;
  // ... other methods
}
```

## Examples

### Basic Synchronization

```javascript
import { ConfigManager } from '@pwarnock/cody-beads-integration';
import { GitHubClient } from '@pwarnock/cody-beads-integration';

// Load configuration
const configManager = new ConfigManager('./cody-beads.config.json');
const config = await configManager.loadConfig();

// Create GitHub client
const githubClient = GitHubClient(config.github.token);

// Sync issues
const syncEngine = new SyncEngine(config, githubClient, beadsClient);
const results = await syncEngine.executeSync({
  direction: 'bidirectional',
  dryRun: false,
  force: false
});

console.log(`Synced ${results.issuesSynced} issues and ${results.prsSynced} PRs`);
```

### Custom Template Creation

```javascript
import { TemplateManager } from '@pwarnock/cody-beads-integration';

const template = {
  name: 'my-custom-template',
  description: 'Custom project template',
  type: 'custom',
  config: {
    version: '1.0.0',
    github: {
      owner: '${GITHUB_OWNER}',
      repo: '${PROJECT_NAME}'
    },
    // ... other config
  },
  files: [
    {
      path: 'src/index.js',
      content: 'console.log("Hello from custom template");'
    },
    {
      path: 'README.md',
      content: '# Custom Template\nMy custom project setup'
    }
  ],
  postSetup: {
    commands: ['npm install', 'git init'],
    instructions: [
      '1. Install dependencies',
      '2. Initialize git repository',
      '3. Customize as needed'
    ]
  }
};

// Save template
await templateManager.saveTemplate('my-custom-template', template);
```

### Programmatic Configuration

```javascript
import { ConfigManager } from '@pwarnock/cody-beads-integration';

const configManager = new ConfigManager();

// Programmatically set configuration
await configManager.saveConfig({
  version: '1.0.0',
  github: {
    owner: 'my-username',
    repo: 'my-repo',
    token: process.env.GITHUB_TOKEN
  },
  cody: {
    projectId: 'my-cody-project'
  },
  beads: {
    projectPath: './my-beads-project',
    autoSync: true,
    syncInterval: 30
  },
  sync: {
    defaultDirection: 'bidirectional',
    conflictResolution: 'newer-wins',
    preserveComments: true,
    preserveLabels: true
  }
});

// Validate configuration
const validation = configManager.validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
} else {
  console.log('Configuration is valid');
}
```

## Contributing

We welcome contributions to the Cody-Beads integration package! Please see our [contributing guidelines](https://github.com/pwarnock/opencode-workflow-kit/blob/main/CONTRIBUTING.md).

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `pnpm install`
4. Make your changes
5. Add tests if applicable
6. Run tests: `pnpm test`
7. Commit your changes: `git commit -m "feat: add amazing feature"`
8. Push to your fork: `git push origin feature/amazing-feature`
9. Create a pull request

### Code Style

- Use TypeScript for all new features
- Follow existing code patterns
- Add JSDoc comments for public APIs
- Include unit tests for new functionality
- Update documentation for user-facing changes

## License

MIT © [OpenCode Workflow Kit Contributors](https://github.com/pwarnock/opencode-workflow-kit/blob/main/AUTHORS)

## Support

- **Issues**: [GitHub Issues](https://github.com/pwarnock/opencode-workflow-kit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
- **Documentation**: [OpenCode Workflow Kit](https://github.com/pwarnock/opencode-workflow-kit/tree/main/docs)

## Related Packages

- [@pwarnock/opencode-config](https://github.com/pwarnock/opencode-workflow-kit/tree/main/packages/opencode_config) - Python configuration package
- [Cody Product Builder Toolkit](https://cody.ai) - AI development platform
- [Beads](https://beads.dev) - Development workflow platform