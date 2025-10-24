---
title: "Git Automation"
description: "Automated git workflow with Beads integration and atomic commits"
version: "1.0.0"
author: "OpenCode Config"
category: "automation"
tags: ["git", "beads", "commits", "workflow"]

# Git Automation Command

## Overview

Provides automated git workflow management with Beads integration, atomic commit validation, and intelligent commit message generation.

## Usage

```bash
/git [action] [options]
```

## Actions

### `commit` - Create Atomic Commit

Creates atomic commits with automatic Beads issue detection and commit message generation.

```bash
# Commit staged files with automatic message generation
/git commit

# Commit specific files
/git commit --files file1.md file2.py

# Dry run to see what would be committed
/git commit --dry-run

# Custom commit message
/git commit --message "Custom commit message"
```

**Features:**
- **Automatic Issue Detection**: Scans files for Beads issue IDs
- **Intelligent Messages**: Generates conventional commits based on changes
- **Atomic Validation**: Ensures commits represent single logical units
- **Beads Integration**: Updates issue status automatically
- **Scope Detection**: Adds commit scopes (cody, agents, templates, etc.)

### `validate` - Validate Atomic Commits

Validates that changes follow atomic commit principles.

```bash
# Validate staged files
/git validate

# Validate specific files
/git validate --files file1.md file2.py
```

**Validation Rules:**
- Single logical unit of work
- No mixing of unrelated changes
- Version-specific consistency
- Conventional commit format

### `sync` - Sync Beads Issues

Synchronizes git state with Beads issue tracking.

```bash
# Sync all related issues
/git sync

# Sync specific issues
/git sync --issue-ids opencode-config-25 opencode-config-28
```

### `branch` - Manage Version Branches

Manages version-based branching strategy.

```bash
# Create version branch
/git branch --action create --version v0.6.0

# Merge completed version to develop
/git branch --action merge --version v0.4.0

# List all version branches
/git branch --action list
```

## Commit Message Generation

The system generates intelligent commit messages based on:

### Issue Detection
- Scans file names and content for `opencode-config-{id}` patterns
- Links commits to specific Beads issues
- Maintains traceability between git and Beads

### Change Type Detection
- `feat:` - New features and functionality
- `fix:` - Bug fixes and corrections
- `docs:` - Documentation changes
- `chore:` - Maintenance and configuration
- `test:` - Test additions and modifications

### Scope Detection
- `(cody)` - Cody command and agent changes
- `(agents)` - Agent configuration changes
- `(templates)` - Template modifications
- `(schemas)` - Schema updates
- `(tasklist)` - Tasklist updates
- `(scripts)` - Script modifications

### Example Generated Messages

```
feat(cody): opencode-config-28 design taskflow plugin architecture

feat: opencode-config-25 add v0.6.0 taskflow framework planning

chore(schemas): opencode-config-32 update subagent configuration schema
```

## Atomic Commit Principles

### Single Logical Unit
Each commit should represent one complete logical unit of work:
- ✅ Single feature implementation
- ✅ Single bug fix
- ✅ Single documentation update
- ❌ Multiple unrelated changes

### Beads Integration
- One primary Beads issue per commit
- Related issues listed in commit body
- Automatic status updates after commit

### Version Consistency
- Changes should belong to single version
- No cross-version contamination
- Clear version boundaries

## Workflow Integration

### Pre-Commit Hooks
- Validate atomic commit principles
- Check Beads issue references
- Generate commit messages
- Confirm with user

### Post-Commit Hooks  
- Update Beads issue status
- Sync Cody tasklists if needed
- Track commit-to-issue mapping

### Pre-Push Hooks
- Validate version completion
- Check dependency satisfaction
- Ensure quality standards

## Configuration

### Environment Variables
- `COMMIT_AUTO_GENERATE` - Enable automatic message generation
- `COMMIT_VALIDATION` - Enable atomic commit validation
- `BEADS_INTEGRATION` - Enable Beads issue tracking

### Customization
Edit `agents/git-automation.json` to customize:
- Commit message patterns
- Validation rules
- Integration settings
- Hook behaviors

## Examples

### Typical Workflow
```bash
# Stage changes for specific issue
git add .cody/project/build/v0.6.0/tasklist.md
git add .beads/issues.jsonl

# Create atomic commit with automatic message
/git commit

# Output:
# ✅ Staged files: .cody/project/build/v0.6.0/tasklist.md, .beads/issues.jsonl
# 📝 Commit message:
# feat(tasklist): opencode-config-28 add v0.6.0 taskflow framework planning
# 
# Related issues:
# - opencode-config-28: Design TaskFlow plugin architecture
# ✅ Commit created successfully!
# 📊 Updating 1 related Beads issues...
# ✅ Beads issues updated.
```

### Validation Example
```bash
# Stage mixed changes
git add file.py docs/README.md tasklist.md

# Try to commit
/git commit

# Output:
# ⚠️  Commit validation warnings:
#   - Multiple types of changes detected - consider splitting into separate commits
#   - Changes span multiple versions: v0.4.0, v0.6.0
# Continue anyway? (y/N): N
# Commit cancelled.
```

## Integration with Beads-Cody System

This git automation subagent integrates seamlessly with:
- **Beads** - Issue tracking and status management
- **Cody** - Tasklist visualization and workflow
- **TaskFlow** - Reusable framework architecture

The automation ensures consistency across all three systems while maintaining atomic commit principles and traceability.