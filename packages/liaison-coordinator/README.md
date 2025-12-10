# @pwarnock/liaison-coordinator

> Bidirectional sync plugin for Liaison Toolkit - orchestrates seamless integration between Cody and Beads for AI-driven development workflows

## 🚀 Quick Start

### Installation

```bash
# As a plugin for Liaison CLI
npm install @pwarnock/liaison-coordinator

# Or install globally with Liaison CLI
npm install -g @pwarnock/liaison

# Add coordinator plugin
npm install @pwarnock/liaison-coordinator
```

### Basic Usage

```bash
# Initialize a new project
liaison init -n my-project

# Initialize in existing directory
liaison init -n my-project --in-place

# Initialize configuration
liaison config setup

# List available templates
liaison template list

# Apply a template to create a new project (legacy)
liaison template apply minimal --name my-project

# Synchronize issues and PRs
liaison sync

# Show help
liaison --help
```

## 📋 Features

### 🔄 Bidirectional Synchronization
- **Real-time Sync**: Keep Cody and Beads in sync automatically
- **Conflict Resolution**: Intelligent conflict detection and resolution strategies
- **Dry Run Mode**: Preview changes before applying them
- **Selective Sync**: Filter by labels, time ranges, and more
- **Error Recovery**: Robust error handling with automatic retry

### 🎯 Active Orchestration
- **Coordinator Pattern**: Active management of workflow state between systems
- **Event-driven Architecture**: Responds to changes in either system
- **State Management**: Maintains consistent project state across platforms
- **Dependency Tracking**: Understands and respects issue dependencies

### 📊 Analytics & Monitoring
- **Sync Status**: Real-time sync operation tracking
- **Health Checks**: Verify system connectivity and configuration
- **Metrics Tracking**: Monitor sync performance and data flows
- **Audit Logging**: Complete sync history and decision logging

### 🔌 Plugin Architecture
- **Middleware System**: Extensible sync pipeline
- **Custom Handlers**: Add domain-specific sync logic
- **Event Hooks**: React to sync lifecycle events
- **Configuration Options**: Customize sync behavior per-project

## 📖 Commands

### Configuration Commands

```bash
# Interactive setup
liaison config setup

# Test current configuration
liaison config test

# Show current configuration
liaison config show

# Set specific configuration value
liaison config set --key github.token --value "your-token"

# Get configuration value
liaison config get --key github.owner
```

### Visual Management

```bash
# Launch beads viewer in browser
liaison beads-viewer --open

# Launch on specific port
liaison beads-viewer --port 8080

# Specify data directory
liaison beads-viewer --data-dir ./my-project/.beads
```

### Template Commands

```bash
# List available templates
liaison template list

# Apply template
liaison template apply minimal --output ./my-project

# Create custom template
liaison template create my-template --type web-development

# Remove template
liaison template remove my-template
```

### Synchronization Commands

```bash
# Full synchronization
liaison sync

# Dry run (preview changes)
liaison sync --dry-run

# One-way sync
liaison sync --direction cody-to-beads
liaison sync --direction beads-to-cody

# Sync with conflict resolution
liaison sync --conflict-resolution manual
liaison sync --conflict-resolution newer-wins

# Filtered sync
liaison sync --labels "bug,feature"
liaison sync --since "2025-01-01T00:00:00Z"
```

### Version Commands

```bash
# Add new version
liaison version add "v1.2.3" --features "Added sync improvements"

# List versions
liaison version list

# Build specific version
liaison version build "v1.2.3"

# Release version
liaison version release "v1.2.3"
```

## 🚀 Project Initialization

### New Project Setup

The recommended way to create a new Liaison project:

```bash
# Create new project with template
liaison init -n my-project -t web-development

# Navigate to project
cd my-project

# Configure integrations
liaison config setup
```

This creates:
- `.cody/` directory with project configuration
- `cody-beads.config.json` with integration settings
- Template-specific files and structure
- Updated `.gitignore` for Liaison files

### In-Place Initialization

For existing projects:

```bash
# In existing project directory
liaison init -n existing-project

# Follow prompts to initialize in-place
```

### Available Templates

- **minimal**: Basic project structure
- **web-development**: React/Node.js setup
- **python-development**: Python project structure

## 🔧 Configuration

### Configuration File Structure

After initialization, you'll have a `cody-beads.config.json` in your project root:

```json
{
  "version": "1.0.0",
  "github": {
    "owner": "${GITHUB_OWNER}",
    "repo": "my-project"
  },
  "cody": {
    "projectId": "${CODY_PROJECT_ID}",
    "apiUrl": "https://api.cody.ai"
  },
  "beads": {
    "projectPath": "./my-project",
    "autoSync": false,
    "syncInterval": 60
  },
  "sync": {
    "defaultDirection": "bidirectional",
    "conflictResolution": "manual",
    "preserveComments": true,
    "preserveLabels": true,
    "syncMilestones": false
  },
  "templates": {
    "defaultTemplate": "minimal"
  }
}
```

### Project Configuration

Additional configuration is stored in `.cody/config/project.json`:

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "my-project - Cody PBT project",
  "integrations": {
    "beads": {
      "enabled": true,
      "autoSync": false,
      "syncInterval": 60
    }
  }
}
```

### Environment Variables

```bash
# GitHub authentication
export GITHUB_TOKEN="your-github-token"

# Beads API key
export BEADS_API_KEY="your-beads-api-key"

# Cody project ID
export CODY_PROJECT_ID="your-cody-project-id"

# Configuration file path
export CODY_BEADS_CONFIG="./path/to/config.json"
```

## 📦 Templates

### Built-in Templates

#### Minimal Template
```bash
liaison init -n my-project -t minimal
```
- Basic project structure
- Essential configuration files
- Ready for Cody-Beads integration

#### Web Development Template
```bash
liaison init -n my-web-app -t web-development
```
- React/Node.js setup
- Package.json with scripts
- Development dependencies
- Build configuration

#### Python Development Template
```bash
liaison init -n my-python-project -t python-development
```
- Python project structure
- Requirements.txt
- Main.py entry point
- Virtual environment setup

### Custom Templates

Create your own templates:

```bash
# Create template structure
mkdir templates/my-template
cd templates/my-template

# Create template configuration
cat > template.json << EOF
{
  "name": "my-template",
  "description": "My custom project template",
  "type": "custom",
  "config": {
    "version": "1.0.0",
    "github": {
      "owner": "\${GITHUB_OWNER}",
      "repo": "\${PROJECT_NAME}"
    }
  },
  "files": [
    {
      "path": "README.md",
      "content": "# \${PROJECT_NAME}\\n\\nGenerated from my-template"
    }
  ],
  "postSetup": {
    "commands": ["npm install"],
    "instructions": [
      "1. Run npm install",
      "2. Configure your environment",
      "3. Start development"
    ]
  }
}
EOF

# Apply custom template
liaison template apply my-template --name my-new-project
```

## 🔄 Workflow Examples

### Project Initialization Workflow

```bash
# 1. Create new project
liaison init -n my-new-project -t web-development

# 2. Navigate to project
cd my-new-project

# 3. Configure integration
liaison config setup

# 4. Test configuration
liaison config test

# 5. Start development
liaison sync --dry-run  # Preview initial sync
```

### In-Place Initialization (Existing Projects)

```bash
# 1. Navigate to existing project
cd existing-project

# 2. Initialize Liaison in-place
liaison init -n existing-project

# 3. Configure integration
liaison config setup

# 4. Test setup
liaison config test
```

### Daily Development Workflow

```bash
# 1. Start your day
liaison sync --dry-run  # Preview changes

# 2. Work on tasks
# Create new task in Beads
liaison task create --title "Implement new feature" --description "Add user authentication" --priority high

# 3. Sync progress
liaison sync --direction beads-to-cody  # Update GitHub from Beads

# 4. End of day sync
liaison sync  # Full bidirectional sync
```

### Release Workflow (with Changesets)

```bash
# 1. Complete development work
git add .
git commit -m "feat: add new authentication system"

# 2. Create changeset
bun run changeset
# Select packages, choose version type, add summary

# 3. Prepare release
bun run version-packages  # Apply changesets, update versions

# 4. Review and commit
git add .
git commit -m "chore: apply changeset version updates"

# 5. Publish release
bun run release  # Build and publish all packages
```

### Team Collaboration Workflow

```bash
# 1. Team member setup
liaison config setup  # Each team member configures their environment

# 2. Regular sync
liaison sync --since "2025-01-01T09:00:00Z"  # Sync since morning

# 3. Task collaboration
liaison task create --title "Code review needed" --assignee teammate-name
liaison task update bd-123 --status in-progress --assignee self

# 4. Conflict resolution
liaison sync --conflict-resolution manual  # Review conflicts together

# 5. Status check
liaison config test  # Verify everything is working
```

## 🛠️ Advanced Usage

### Plugin System

```bash
# List available plugins
liaison plugin list

# Install plugin
liaison plugin install slack-notifications

# Configure plugin
liaison plugin configure slack-notifications --webhook-url "https://hooks.slack.com/..."

# Remove plugin
liaison plugin remove slack-notifications
```

### Workflow Automation

```bash
# Create custom workflow
liaison workflow create daily-sync --schedule "0 9 * * 1-5"

# List workflows
liaison workflow list

# Run workflow manually
liaison workflow run daily-sync

# Enable/disable workflows
liaison workflow enable daily-sync
liaison workflow disable daily-sync
```

### Task Management

```bash
# List tasks from Beads
liaison task list --source beads

# Create task in Beads (real backend integration)
liaison task create --title "Fix sync issue" --description "Issue with bidirectional sync" --labels "bug,high"

# Update task status
liaison task update bd-123 --status in-progress

# Link tasks
liaison task link bd-123 --to gh-456

# Show task details
liaison task show bd-123
```

## 🔍 Troubleshooting

### Common Issues

#### Configuration Problems
```bash
# Test your configuration
liaison config test

# Show current config
liaison config show

# Reset configuration
liaison config reset
```

#### Sync Issues
```bash
# Check sync status
liaison sync --status

# Run with verbose logging
liaison sync --verbose

# Dry run to debug
liaison sync --dry-run --verbose
```

#### Authentication Issues
```bash
# Test GitHub connection
liaison config test --component github

# Test Beads connection
liaison config test --component beads

# Refresh tokens
liaison config refresh --component github
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=liaison:*
liaison sync --verbose

# Generate debug report
liaison debug --report > debug-report.txt
```

## 📚 API Reference

### Programmatic Usage

```javascript
import { LiaisonIntegration } from '@pwarnock/liaison';

const integration = new CodyBeadsIntegration({
  configPath: './liaison.config.json',
  verbose: true
});

// Sync programmatically
await integration.sync({
  direction: 'bidirectional',
  dryRun: false
});

// Apply template programmatically
await integration.applyTemplate('minimal', {
  name: 'my-project',
  outputDir: './projects'
});

// Get configuration
const config = await integration.getConfig();

// Validate configuration
const validation = await integration.validateConfig();
```

### Configuration Schema

```typescript
interface LiaisonConfig {
  version: string;
  github: {
    owner: string;
    repo: string;
    token?: string;
    apiUrl?: string;
  };
  cody: {
    projectId?: string;
    apiUrl?: string;
  };
  beads: {
    projectPath?: string;
    autoSync?: boolean;
    syncInterval?: number;
  };
  sync: {
    defaultDirection?: 'bidirectional' | 'cody-to-beads' | 'beads-to-cody';
    conflictResolution?: 'manual' | 'newer-wins' | 'cody-wins' | 'beads-wins';
    preserveComments?: boolean;
    preserveLabels?: boolean;
    syncMilestones?: boolean;
  };
  templates?: {
    defaultTemplate?: string;
    templatePath?: string;
  };
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/pwarnock/liaison-toolkit.git
cd opencode-workflow-kit/packages/liaison

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Run in development mode
npm run dev
```

## 📄 License

MIT © [OpenCode Workflow Kit Contributors](https://github.com/pwarnock/liaison-toolkit/graphs/contributors)

## 🔗 Links

- [Documentation](https://github.com/pwarnock/liaison-toolkit/tree/main/packages/liaison)
- [Issue Tracker](https://github.com/pwarnock/liaison-toolkit/issues)
- [Discussions](https://github.com/pwarnock/liaison-toolkit/discussions)
- [Cody Documentation](https://docs.cody.ai)
- [Beads Documentation](https://docs.beads.dev)

## 🆘 Support

- 📖 [Documentation](https://github.com/pwarnock/liaison-toolkit/tree/main/packages/liaison#readme)
- 🐛 [Report Issues](https://github.com/pwarnock/liaison-toolkit/issues/new)
- 💬 [Discussions](https://github.com/pwarnock/liaison-toolkit/discussions)
- 📧 [Email Support](mailto:support@peterwarnock.com) 
