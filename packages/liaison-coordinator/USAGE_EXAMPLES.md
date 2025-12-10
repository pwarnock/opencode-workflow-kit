# Cody-Beads Integration Usage Examples

This document provides practical examples for using the Cody-Beads integration package.

## Table of Contents
- [Basic Setup](#basic-setup)
- [Configuration](#configuration)
- [Sync Operations](#sync-operations)
- [Conflict Resolution](#conflict-resolution)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Basic Setup

### Install the package
```bash
npm install @pwarnock/liaison
# or
yarn add @pwarnock/liaison
# or
pnpm add @pwarnock/liaison
```

### Initialize a new project
```bash
liaison init
```

### Set up configuration
```bash
liaison config setup
```

## Configuration

### Basic configuration file
```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "token": "your-github-token"
  },
  "beads": {
    "projectPath": "./.beads",
    "autoSync": false
  },
  "sync": {
    "defaultDirection": "bidirectional",
    "conflictResolution": "manual"
  }
}
```

### Advanced configuration with all options
```json
{
  "version": "1.0.0",
  "github": {
    "owner": "your-org",
    "repo": "your-repo",
    "token": "your-github-token",
    "apiUrl": "https://api.github.com",
    "timeout": 30000,
    "retries": 3
  },
  "cody": {
    "projectId": "your-project-id",
    "apiUrl": "https://api.cody.ai",
    "timeout": 30000,
    "retries": 3,
    "workspace": "./.cody",
    "autoAdvance": false
  },
  "beads": {
    "projectPath": "./.beads",
    "configPath": ".beads/beads.json",
    "autoSync": false,
    "syncInterval": 60
  },
  "sync": {
    "defaultDirection": "bidirectional",
    "conflictResolution": "auto-merge",
    "includeLabels": ["bug", "feature", "enhancement"],
    "excludeLabels": ["wontfix", "duplicate"],
    "preserveComments": true,
    "preserveLabels": true,
    "syncMilestones": false,
    "syncAssignees": true,
    "syncProjects": false
  },
  "templates": {
    "defaultTemplate": "minimal",
    "templatePath": "./templates"
  }
}
```

## Sync Operations

### Basic bidirectional sync
```bash
liaison sync
```

### One-way sync (Cody to Beads)
```bash
liaison sync --direction cody-to-beads
```

### One-way sync (Beads to Cody)
```bash
liaison sync --direction beads-to-cody
```

### Dry run (preview changes)
```bash
liaison sync --dry-run
```

### Force sync (ignore conflicts)
```bash
liaison sync --force
```

### Sync with date filtering
```bash
liaison sync --since 2024-01-01
```

## Conflict Resolution

### Manual conflict resolution
```bash
liaison config set sync.conflictResolution manual
liaison sync
```

### Auto-merge conflicts
```bash
liaison config set sync.conflictResolution auto-merge
liaison sync
```

### Priority-based resolution
```bash
liaison config set sync.conflictResolution priority-based
liaison sync
```

### Timestamp-based resolution
```bash
liaison config set sync.conflictResolution newer-wins
liaison sync
```

## Advanced Features

### Template management
```bash
# List available templates
liaison template list

# Apply a template
liaison template apply react-node ./my-project

# Create a custom template
liaison template create --name custom --source ./template-dir
```

### Plugin management
```bash
# List installed plugins
liaison plugin list

# Install a plugin
liaison plugin install @pwarnock/cody-plugin-example

# Remove a plugin
liaison plugin remove example-plugin
```

### Workflow automation
```bash
# Create a workflow
liaison workflow create --name "daily-sync" --trigger "schedule:0 9 * * *" --action "sync:bidirectional"

# List workflows
liaison workflow list

# Execute a workflow manually
liaison workflow execute daily-sync
```

## Troubleshooting

### Common issues and solutions

**Issue: Authentication failed**
```bash
# Test your configuration
liaison config test

# Validate your GitHub token
liaison config validate

# Check token permissions
liaison config show
```

**Issue: Sync conflicts**
```bash
# Preview conflicts before syncing
liaison sync --dry-run

# Change conflict resolution strategy
liaison config set sync.conflictResolution auto-merge

# Force sync (use with caution)
liaison sync --force
```

**Issue: Performance problems**
```bash
# Check sync status
liaison status

# Enable verbose logging
liaison sync --verbose

# Reduce sync scope
liaison sync --since 2024-01-01
```

## Best Practices

1. **Always use dry-run first**: Preview changes before applying them
2. **Start with manual conflict resolution**: Understand conflicts before automating
3. **Use labels effectively**: Configure include/exclude labels to filter sync operations
4. **Monitor sync status**: Regularly check sync health and performance
5. **Backup before major operations**: Use config backup before making significant changes

## Integration Examples

### CI/CD Integration
```yaml
# GitHub Actions example
name: Cody-Beads Sync
on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g @pwarnock/liaison
      - run: liaison sync --direction bidirectional
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Development Workflow
```bash
# Daily development workflow
1. Pull latest changes: git pull
2. Preview sync: liaison sync --dry-run
3. Resolve conflicts: liaison config set sync.conflictResolution auto-merge
4. Execute sync: liaison sync
5. Commit changes: git commit -m "Sync Cody and Beads"
6. Push changes: git push
```

### Team Collaboration
```bash
# Team setup
1. Initialize project: liaison init
2. Configure team settings: liaison config setup
3. Set up templates: liaison template apply team-template
4. Configure workflows: liaison workflow create --name "team-sync" --trigger "schedule:0 9 * * *"
5. Train team: liaison help wizard
```

## Migration Guide

### From v0.3.0 to v0.5.0
```bash
# Backup existing configuration
liaison config backup

# Update package
npm update @pwarnock/liaison

# Run migration tool
liaison migrate

# Validate new configuration
liaison config validate

# Test sync operations
liaison sync --dry-run
```

This guide provides comprehensive examples for using the Cody-Beads integration package in various scenarios. For more detailed information, refer to the API documentation and CLI help system.