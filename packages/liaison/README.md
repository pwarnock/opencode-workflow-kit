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
codybeads template list

# Apply a template to create a new project
codybeads template apply minimal --name my-project

# Synchronize issues and PRs
codybeads sync

# Show help
codybeads --help
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
codybeads config setup

# Test current configuration
codybeads config test

# Show current configuration
codybeads config show

# Set specific configuration value
codybeads config set --key github.token --value "your-token"

# Get configuration value
codybeads config get --key github.owner
```

### Visual Management

```bash
# Launch beads viewer in browser
codybeads beads-viewer --open

# Launch on specific port
codybeads beads-viewer --port 8080

# Specify data directory
codybeads beads-viewer --data-dir ./my-project/.beads
```

### Template Commands

```bash
# List available templates
codybeads template list

# Apply template
codybeads template apply minimal --output ./my-project

# Create custom template
codybeads template create my-template --type web-development

# Remove template
codybeads template remove my-template
```

### Synchronization Commands

```bash
# Full synchronization
codybeads sync

# Dry run (preview changes)
codybeads sync --dry-run

# One-way sync
codybeads sync --direction cody-to-beads
codybeads sync --direction beads-to-cody

# Sync with conflict resolution
codybeads sync --conflict-resolution manual
codybeads sync --conflict-resolution newer-wins

# Filtered sync
codybeads sync --labels "bug,feature"
codybeads sync --since "2025-01-01T00:00:00Z"
```

### Version Commands

```bash
# Add new version
codybeads version add "v1.2.3" --features "Added sync improvements"

# List versions
codybeads version list

# Build specific version
codybeads version build "v1.2.3"

# Release version
codybeads version release "v1.2.3"
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
codybeads template apply minimal --name my-project
```
- Basic project structure
- Essential configuration files
- Ready for Cody-Beads integration

#### Web Development Template
```bash
codybeads template apply web-development --name my-web-app
```
- React/Node.js setup
- Package.json with scripts
- Development dependencies
- Build configuration

#### Python Development Template
```bash
codybeads template apply python-development --name my-python-project
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
codybeads template apply my-template --name my-new-project
```

## 🔄 Workflow Examples

### Daily Development Workflow

```bash
# 1. Start your day
codybeads sync --dry-run  # Preview changes

# 2. Work on tasks
# ... your development work ...

# 3. Sync progress
codybeads sync --direction beads-to-cody  # Update GitHub from Beads

# 4. End of day sync
codybeads sync  # Full bidirectional sync
```

### Release Workflow

```bash
# 1. Create release version
codybeads version add "v2.1.0" --features "New sync features, bug fixes"

# 2. Run full sync before release
codybeads sync --labels "release,ready"

# 3. Build and test
codybeads version build "v2.1.0"

# 4. Release
codybeads version release "v2.1.0"
```

### Team Collaboration Workflow

```bash
# 1. Team member setup
codybeads config setup  # Each team member configures their environment

# 2. Regular sync
codybeads sync --since "2025-01-01T09:00:00Z"  # Sync since morning

# 3. Conflict resolution
codybeads sync --conflict-resolution manual  # Review conflicts together

# 4. Status check
codybeads config test  # Verify everything is working
```

## 🛠️ Advanced Usage

### Plugin System

```bash
# List available plugins
codybeads plugin list

# Install plugin
codybeads plugin install slack-notifications

# Configure plugin
codybeads plugin configure slack-notifications --webhook-url "https://hooks.slack.com/..."

# Remove plugin
codybeads plugin remove slack-notifications
```

### Workflow Automation

```bash
# Create custom workflow
codybeads workflow create daily-sync --schedule "0 9 * * 1-5"

# List workflows
codybeads workflow list

# Run workflow manually
codybeads workflow run daily-sync

# Enable/disable workflows
codybeads workflow enable daily-sync
codybeads workflow disable daily-sync
```

### Task Management

```bash
# List tasks from Beads
codybeads task list --source beads

# Create task in Cody
codybeads task create --title "Fix sync issue" --labels "bug,high"

# Update task status
codybeads task update bd-123 --status in-progress

# Link tasks
codybeads task link bd-123 --to gh-456
```

## 🔍 Troubleshooting

### Common Issues

#### Configuration Problems
```bash
# Test your configuration
codybeads config test

# Show current config
codybeads config show

# Reset configuration
codybeads config reset
```

#### Sync Issues
```bash
# Check sync status
codybeads sync --status

# Run with verbose logging
codybeads sync --verbose

# Dry run to debug
codybeads sync --dry-run --verbose
```

#### Authentication Issues
```bash
# Test GitHub connection
codybeads config test --component github

# Test Beads connection
codybeads config test --component beads

# Refresh tokens
codybeads config refresh --component github
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=liaison:*
liaison sync --verbose

# Generate debug report
codybeads debug --report > debug-report.txt
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