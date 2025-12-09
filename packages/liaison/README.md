# @pwarnock/liaison

> Seamless integration between Cody Product Builder Toolkit and Beads for AI-driven development workflows

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g @pwarnock/liaison

# Local installation
npm install @pwarnock/liaison

# One-time use
npx @pwarnock/liaison
```

### Basic Usage

```bash
# Initialize configuration
liaison config setup

# List available templates
liaison template list

# Apply a template to create a new project
liaison template apply minimal --name my-project

# Synchronize issues and PRs
liaison sync

# Show help
liaison --help
```

## 📋 Features

### 🔧 Configuration Management
- **Interactive Setup**: Guided configuration for GitHub and Beads integration
- **Validation**: Test your configuration before use
- **Flexible Options**: Support for multiple environments and workflows

### 📦 Template System
- **Built-in Templates**: Minimal, web-development, python-development
- **Custom Templates**: Create and manage your own project templates
- **Template Application**: Apply templates to create new projects instantly

### 🔄 Synchronization
- **Bidirectional Sync**: Keep Cody and Beads in sync
- **Conflict Resolution**: Manual or automatic conflict handling
- **Dry Run Mode**: Preview changes before applying them
- **Selective Sync**: Filter by labels, time ranges, and more

### 📊 Visual Dependency Management
- **Beads Viewer Integration**: Launch the powerful Beads Viewer directly from the CLI
- **Graph Visualization**: See dependency chains, critical paths, and bottlenecks
- **Interactive Dashboard**: Explore project health metrics and insights
- **AI-Ready Analysis**: Leverage Beads Viewer's robot protocol for automated planning

### 🏗️ Project Management
- **Version Management**: Track releases and builds
- **Plugin System**: Extend functionality with plugins
- **Workflow Automation**: Custom workflows for your development process

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

## 🔧 Configuration

### Configuration File Structure

Create a `liaison.config.json` in your project root:

```json
{
  "version": "1.0.0",
  "github": {
    "owner": "your-username",
    "repo": "your-repo",
    "token": "your-github-token"
  },
  "cody": {
    "projectId": "your-cody-project-id",
    "apiUrl": "https://api.cody.ai"
  },
  "beads": {
    "projectPath": "./your-beads-project",
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
    "defaultTemplate": "minimal",
    "templatePath": "./templates"
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
liaison template apply minimal --name my-project
```
- Basic project structure
- Essential configuration files
- Ready for Cody-Beads integration

#### Web Development Template
```bash
liaison template apply web-development --name my-web-app
```
- React/Node.js setup
- Package.json with scripts
- Development dependencies
- Build configuration

#### Python Development Template
```bash
liaison template apply python-development --name my-python-project
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

### Daily Development Workflow

```bash
# 1. Start your day
liaison sync --dry-run  # Preview changes

# 2. Work on tasks
# ... your development work ...

# 3. Sync progress
liaison sync --direction beads-to-cody  # Update GitHub from Beads

# 4. End of day sync
liaison sync  # Full bidirectional sync
```

### Release Workflow

```bash
# 1. Create release version
liaison version add "v2.1.0" --features "New sync features, bug fixes"

# 2. Run full sync before release
liaison sync --labels "release,ready"

# 3. Build and test
liaison version build "v2.1.0"

# 4. Release
liaison version release "v2.1.0"
```

### Team Collaboration Workflow

```bash
# 1. Team member setup
liaison config setup  # Each team member configures their environment

# 2. Regular sync
liaison sync --since "2025-01-01T09:00:00Z"  # Sync since morning

# 3. Conflict resolution
liaison sync --conflict-resolution manual  # Review conflicts together

# 4. Status check
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

# Create task in Cody
liaison task create --title "Fix sync issue" --labels "bug,high"

# Update task status
liaison task update bd-123 --status in-progress

# Link tasks
liaison task link bd-123 --to gh-456
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
git clone https://github.com/pwarnock/opencode-workflow-kit.git
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

MIT © [OpenCode Workflow Kit Contributors](https://github.com/pwarnock/opencode-workflow-kit/graphs/contributors)

## 🔗 Links

- [Documentation](https://github.com/pwarnock/opencode-workflow-kit/tree/main/packages/liaison)
- [Issue Tracker](https://github.com/pwarnock/opencode-workflow-kit/issues)
- [Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
- [Cody Documentation](https://docs.cody.ai)
- [Beads Documentation](https://docs.beads.dev)

## 🆘 Support

- 📖 [Documentation](https://github.com/pwarnock/opencode-workflow-kit/tree/main/packages/liaison#readme)
- 🐛 [Report Issues](https://github.com/pwarnock/opencode-workflow-kit/issues/new)
- 💬 [Discussions](https://github.com/pwarnock/opencode-workflow-kit/discussions)
- 📧 [Email Support](mailto:support@peterwarnock.com) 
