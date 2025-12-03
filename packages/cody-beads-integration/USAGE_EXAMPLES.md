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
npm install @pwarnock/cody-beads-integration
# or
yarn add @pwarnock/cody-beads-integration
# or
pnpm add @pwarnock/cody-beads-integration
```

### Initialize a new project
```bash
cody-beads init
```

### Set up configuration
```bash
cody-beads config setup
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
cody-beads sync
```

### One-way sync (Cody to Beads)
```bash
cody-beads sync --direction cody-to-beads
```

### One-way sync (Beads to Cody)
```bash
cody-beads sync --direction beads-to-cody
```

### Dry run (preview changes)
```bash
cody-beads sync --dry-run
```

### Force sync (ignore conflicts)
```bash
cody-beads sync --force
```

### Sync with date filtering
```bash
cody-beads sync --since 2024-01-01
```

## Conflict Resolution

### Manual conflict resolution
```bash
cody-beads config set sync.conflictResolution manual
cody-beads sync
```

### Auto-merge conflicts
```bash
cody-beads config set sync.conflictResolution auto-merge
cody-beads sync
```

### Priority-based resolution
```bash
cody-beads config set sync.conflictResolution priority-based
cody-beads sync
```

### Timestamp-based resolution
```bash
cody-beads config set sync.conflictResolution newer-wins
cody-beads sync
```

## Advanced Features

### Template management
```bash
# List available templates
cody-beads template list

# Apply a template
cody-beads template apply react-node ./my-project

# Create a custom template
cody-beads template create --name custom --source ./template-dir
```

### Plugin management
```bash
# List installed plugins
cody-beads plugin list

# Install a plugin
cody-beads plugin install @pwarnock/cody-plugin-example

# Remove a plugin
cody-beads plugin remove example-plugin
```

### Workflow automation
```bash
# Create a workflow
cody-beads workflow create --name "daily-sync" --trigger "schedule:0 9 * * *" --action "sync:bidirectional"

# List workflows
cody-beads workflow list

# Execute a workflow manually
cody-beads workflow execute daily-sync
```

## Troubleshooting

### Common issues and solutions

**Issue: Authentication failed**
```bash
# Test your configuration
cody-beads config test

# Validate your GitHub token
cody-beads config validate

# Check token permissions
cody-beads config show
```

**Issue: Sync conflicts**
```bash
# Preview conflicts before syncing
cody-beads sync --dry-run

# Change conflict resolution strategy
cody-beads config set sync.conflictResolution auto-merge

# Force sync (use with caution)
cody-beads sync --force
```

**Issue: Performance problems**
```bash
# Check sync status
cody-beads status

# Enable verbose logging
cody-beads sync --verbose

# Reduce sync scope
cody-beads sync --since 2024-01-01
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
      - run: npm install -g @pwarnock/cody-beads-integration
      - run: cody-beads sync --direction bidirectional
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Development Workflow
```bash
# Daily development workflow
1. Pull latest changes: git pull
2. Preview sync: cody-beads sync --dry-run
3. Resolve conflicts: cody-beads config set sync.conflictResolution auto-merge
4. Execute sync: cody-beads sync
5. Commit changes: git commit -m "Sync Cody and Beads"
6. Push changes: git push
```

### Team Collaboration
```bash
# Team setup
1. Initialize project: cody-beads init
2. Configure team settings: cody-beads config setup
3. Set up templates: cody-beads template apply team-template
4. Configure workflows: cody-beads workflow create --name "team-sync" --trigger "schedule:0 9 * * *"
5. Train team: cody-beads help wizard
```

## Migration Guide

### From v0.3.0 to v0.5.0
```bash
# Backup existing configuration
cody-beads config backup

# Update package
npm update @pwarnock/cody-beads-integration

# Run migration tool
cody-beads migrate

# Validate new configuration
cody-beads config validate

# Test sync operations
cody-beads sync --dry-run
```

This guide provides comprehensive examples for using the Cody-Beads integration package in various scenarios. For more detailed information, refer to the API documentation and CLI help system.