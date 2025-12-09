# Migration Guide: v0.6.0 Architecture Refactoring

This guide helps you migrate from v0.5.x to v0.6.0+ of Liaison, which includes significant architectural improvements and breaking changes.

## 🚨 Breaking Changes

### 1. Binary Name Change
**Before**: `codybeads`  
**After**: `liaison`

#### Impact
- CLI commands must use `liaison` instead of `codybeads`
- Scripts and automation need updating
- Shell aliases may need adjustment

#### Migration Steps
```bash
# Update scripts
sed -i 's/codybeads/liaison/g' package.json
sed -i 's/codybeads/liaison/g' Makefile
sed -i 's/codybeads/liaison/g' scripts/*.sh

# Update shell aliases
alias liaison='liaison'  # Remove old codybeads alias
```

### 2. Project Initialization Changes
**Before**: `liaison template apply`  
**After**: `liaison init`

#### Impact
- Project creation workflow changed
- Template application syntax updated
- Configuration file structure modified

#### Migration Steps
```bash
# Old way (v0.5.x)
codybeads template apply minimal --name my-project

# New way (v0.6.0+)
liaison init -n my-project -t minimal
```

## 🔄 Configuration Changes

### Configuration File Location
**Before**: `liaison.config.json`  
**After**: `cody-beads.config.json`

### Configuration File Structure
The configuration now uses environment variables by default:

#### v0.5.x Configuration
```json
{
  "version": "1.0.0",
  "github": {
    "owner": "your-username",
    "repo": "your-repo",
    "token": "your-github-token"
  }
}
```

#### v0.6.0+ Configuration
```json
{
  "version": "1.0.0",
  "github": {
    "owner": "${GITHUB_OWNER}",
    "repo": "my-project"
  }
}
```

### Migration Steps
```bash
# 1. Rename config file
mv liaison.config.json cody-beads.config.json

# 2. Update configuration to use environment variables
# Use liaison config setup to regenerate config

# 3. Set environment variables
export GITHUB_OWNER="your-username"
export CODY_PROJECT_ID="your-project-id"
```

## 🏗️ New Features

### 1. In-Place Initialization
Initialize Liaison in existing projects without creating new directories:

```bash
# In existing project directory
liaison init -n existing-project
```

### 2. Service-Oriented Architecture
The init command now uses modular services:
- `ProjectDetector`: Detects existing project metadata
- `FileSystemManager`: Safe file operations
- `ConfigFactory`: Configuration generation
- `InitOrchestrator`: Coordinates initialization

### 3. Real Beads Integration
Task management now integrates with actual Beads backend:

```bash
# Create real task in Beads
liaison task create --title "Fix bug" --description "Critical issue"
```

### 4. Graceful Error Handling
- Ctrl+C support during initialization
- Better error messages
- Non-destructive file operations

## 📦 Project Structure Changes

### New Directory Structure
```
my-project/
├── .cody/
│   ├── commands/
│   │   └── beads-sync.md
│   └── config/
│       └── project.json
├── cody-beads.config.json
└── .gitignore
```

### Changes from v0.5.x
- Added `.cody/` directory structure
- Moved project config to `.cody/config/project.json`
- Updated `.gitignore` automatically

## 🔄 Migration Checklist

### Pre-Migration
- [ ] Backup existing configuration files
- [ ] Note current project structure
- [ ] Document custom scripts using `codybeads`

### Migration Steps
- [ ] Update CLI commands from `codybeads` to `liaison`
- [ ] Rename `liaison.config.json` to `cody-beads.config.json`
- [ ] Run `liaison config setup` to regenerate configuration
- [ ] Set required environment variables
- [ ] Update scripts and automation
- [ ] Test new initialization workflow

### Post-Migration
- [ ] Verify all commands work with `liaison`
- [ ] Test configuration with `liaison config test`
- [ ] Run sync with `liaison sync --dry-run`
- [ ] Update team documentation

## 🛠️ Common Migration Issues

### Issue 1: Command Not Found
```bash
# Error
zsh: command not found: codybeads

# Solution
# Update scripts and muscle memory to use 'liaison'
liaison --help
```

### Issue 2: Configuration File Not Found
```bash
# Error
Error: Configuration file not found: liaison.config.json

# Solution
# Rename config file or regenerate
mv liaison.config.json cody-beads.config.json
# or
liaison config setup
```

### Issue 3: Environment Variables Missing
```bash
# Error
Error: GITHUB_OWNER not set

# Solution
# Set environment variables
export GITHUB_OWNER="your-username"
export CODY_PROJECT_ID="your-project-id"
```

### Issue 4: Beads Integration Not Working
```bash
# Error
Error: bd binary not found

# Solution
# Reinstall dependencies
bun install
# or
npm install
```

## 🎯 Best Practices After Migration

### 1. Use Environment Variables
Store sensitive data in environment variables, not configuration files:

```bash
# .env file
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-username
CODY_PROJECT_ID=your-project-id
```

### 2. Initialize New Projects Properly
```bash
# Create new project
liaison init -n my-project -t web-development

# Configure integrations
liaison config setup

# Test setup
liaison config test
```

### 3. Use New Task Management
```bash
# Create tasks in Beads
liaison task create --title "New feature" --priority high

# List tasks
liaison task list

# Update task status
liaison task update bd-123 --status in-progress
```

### 4. Leverage In-Place Initialization
For existing projects:

```bash
cd existing-project
liaison init -n existing-project
```

## 📚 Additional Resources

- [Changeset Workflow Guide](../CHANGESET_WORKFLOW.md)
- [Liaison README](../packages/liaison/README.md)
- [Troubleshooting Guide](./BEADS_TROUBLESHOOTING.md)
- [Project Documentation](../README.md)

## 🆘 Support

If you encounter issues during migration:

1. Check this guide first
2. Run `liaison config test` to diagnose issues
3. Enable debug logging: `export DEBUG=liaison:*`
4. Create an issue with:
   - Your current version
   - Error messages
   - Steps to reproduce

## 🎉 Migration Complete!

Once you've completed these steps:
- ✅ Binary renamed to `liaison`
- ✅ Configuration updated
- ✅ New initialization workflow working
- ✅ Beads integration functional
- ✅ All scripts updated

Welcome to v0.6.0! You now have access to:
- More robust initialization
- Real Beads integration
- Better error handling
- Service-oriented architecture

Enjoy the improved Liaison experience! 🚀